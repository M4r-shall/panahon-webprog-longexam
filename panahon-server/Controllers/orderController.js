const Order = require('../Models/orderModel');
const Cart = require('../Models/cartModel');
const Product = require('../Models/productModel');
const { HttpStatus, ORDER_STATUSES } = require('../config/constants');
const { oneOf } = require('../config/sanitize');
const { failServer, failValidation } = require('../Middleware/errorHandler');

// Which transitions an admin is allowed to make from each status
const ALLOWED_TRANSITIONS = {
    Pending: ['Confirmed', 'Cancelled'],
    Confirmed: ['Ready for Claiming', 'Cancelled'],
    'Ready for Claiming': ['Claimed', 'Cancelled'],
    Claimed: [],
    Cancelled: [],
};

const populateOrder = (query) => query
    .populate('user', 'name email')
    .populate('orderItems.product', 'productName imageUrl price');

/** Puts the units from a cancelled order back on the shelf. */
const restoreStock = (orderItems) => Promise.all(
    orderItems.map((item) =>
        Product.findByIdAndUpdate(item.product, { $inc: { stockQuantity: item.quantity } })
    )
);

// GET /api/v1/orders  (Admin) - ?status=
exports.getAllOrders = async (req, res) => {
    try {
        const status = oneOf(req.query.status, ORDER_STATUSES);
        const query = status ? { orderStatus: status } : {};

        const orders = await populateOrder(Order.find(query)).sort({ createdAt: -1 });
        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Orders retrieved successfully.',
            count: orders.length,
            data: orders
        });
    } catch (error) {
        failServer(res, error, 'getAllOrders', 'Could not load orders. Please try again.');
    }
};

// GET /api/v1/orders/me - the signed-in customer's order history
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await populateOrder(Order.find({ user: req.user.userId })).sort({ createdAt: -1 });
        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Orders retrieved successfully.',
            count: orders.length,
            data: orders
        });
    } catch (error) {
        failServer(res, error, 'getMyOrders', 'Could not load your orders. Please try again.');
    }
};

// GET /api/v1/orders/:id - owner or Admin
exports.getOrderById = async (req, res) => {
    try {
        const order = await populateOrder(Order.findById(req.params.id));
        if (!order) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Order not found.' });
        }

        if (req.user.role !== 'Admin' && order.user._id.toString() !== req.user.userId) {
            return res.status(HttpStatus.FORBIDDEN).json({
                success: false,
                message: 'Access denied. You can only view your own orders.'
            });
        }

        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Order retrieved successfully.',
            data: order
        });
    } catch (error) {
        failServer(res, error, 'getOrderById', 'Could not load this order. Please try again.');
    }
};

// POST /api/v1/orders - checkout: the order is built from the server-side cart
exports.createOrder = async (req, res) => {
    // Tracks what we have already taken off the shelf, so a later failure can undo it.
    const reserved = [];

    try {
        const { shippingAddress, paymentMethod } = req.body;

        const cart = await Cart.findOne({ user: req.user.userId }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Your cart is empty. Add a product before checking out.'
            });
        }

        for (const item of cart.items) {
            if (!item.product) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: 'One of the products in your cart is no longer available. Please remove it and try again.'
                });
            }
        }

        // Reserve each line with a conditional decrement. The { stockQuantity: { $gte } }
        // filter makes the check-and-decrement a single atomic operation, so two shoppers
        // racing for the last unit cannot both succeed.
        for (const item of cart.items) {
            const claimed = await Product.findOneAndUpdate(
                { _id: item.product._id, stockQuantity: { $gte: item.quantity } },
                { $inc: { stockQuantity: -item.quantity } },
                { new: true }
            );

            if (!claimed) {
                await restoreStock(reserved);
                const current = await Product.findById(item.product._id).select('stockQuantity productName');
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: current
                        ? `Only ${current.stockQuantity} unit(s) of ${current.productName} are still in stock.`
                        : 'One of the products in your cart is no longer available.'
                });
            }

            reserved.push({ product: item.product._id, quantity: item.quantity });
        }

        const orderItems = cart.items.map((item) => ({
            product: item.product._id,
            productName: item.product.productName,
            quantity: item.quantity,
            priceAtPurchase: item.product.price // historical price snapshot
        }));

        const totalPrice = orderItems.reduce(
            (sum, item) => sum + item.priceAtPurchase * item.quantity,
            0
        );

        const order = await new Order({
            user: req.user.userId,
            orderItems,
            shippingAddress: shippingAddress || 'NU Campus Pickup Counter',
            paymentMethod,
            totalPrice,
            orderStatus: 'Pending'
        }).save();

        cart.items = [];
        cart.totalPrice = 0;
        await cart.save();

        res.status(HttpStatus.CREATED).json({
            success: true,
            message: 'Order placed successfully.',
            data: await populateOrder(Order.findById(order._id))
        });
    } catch (error) {
        // Never leave stock reserved for an order that was not created.
        await restoreStock(reserved).catch(() => {});
        failValidation(res, error, 'createOrder', 'Your order could not be placed. Please try again.');
    }
};

// PATCH /api/v1/orders/:id/status  (Admin) - Confirm Order / Ready for Claiming / Claimed / Cancelled
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderStatus } = req.body;

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Order not found.' });
        }

        const allowed = ALLOWED_TRANSITIONS[order.orderStatus] ?? [];
        if (!allowed.includes(orderStatus)) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: allowed.length
                    ? `An order that is "${order.orderStatus}" can only move to: ${allowed.join(', ')}.`
                    : `An order that is "${order.orderStatus}" can no longer be updated.`
            });
        }

        // Claim the transition atomically: the update only applies if the order is still
        // in the status we validated against. Two concurrent cancels would otherwise both
        // pass the check above and each restore the stock.
        const updated = await Order.findOneAndUpdate(
            { _id: order._id, orderStatus: order.orderStatus },
            { orderStatus },
            { new: true }
        );

        if (!updated) {
            return res.status(HttpStatus.CONFLICT).json({
                success: false,
                message: 'This order was just updated by someone else. Refresh to see its current status.'
            });
        }

        // Only the request that actually won the transition returns the stock.
        if (orderStatus === 'Cancelled') {
            await restoreStock(updated.orderItems);
        }

        res.status(HttpStatus.OK).json({
            success: true,
            message: `Order marked as "${orderStatus}".`,
            data: await populateOrder(Order.findById(updated._id))
        });
    } catch (error) {
        failValidation(res, error, 'updateOrderStatus', 'The order status could not be updated.');
    }
};

// PATCH /api/v1/orders/:id/cancel - a customer can back out while the order is still Pending
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Order not found.' });
        }

        if (order.user.toString() !== req.user.userId) {
            return res.status(HttpStatus.FORBIDDEN).json({
                success: false,
                message: 'Access denied. You can only cancel your own orders.'
            });
        }

        if (order.orderStatus !== 'Pending') {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: `This order is already "${order.orderStatus}" and can no longer be cancelled. Please contact the store.`
            });
        }

        // Same atomic claim as updateOrderStatus - only one cancel may restore the stock.
        const cancelled = await Order.findOneAndUpdate(
            { _id: order._id, orderStatus: 'Pending' },
            { orderStatus: 'Cancelled' },
            { new: true }
        );

        if (!cancelled) {
            return res.status(HttpStatus.CONFLICT).json({
                success: false,
                message: 'This order was just updated by the store. Refresh to see its current status.'
            });
        }

        await restoreStock(cancelled.orderItems);

        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Order cancelled.',
            data: await populateOrder(Order.findById(cancelled._id))
        });
    } catch (error) {
        failValidation(res, error, 'cancelOrder', 'The order could not be cancelled.');
    }
};
