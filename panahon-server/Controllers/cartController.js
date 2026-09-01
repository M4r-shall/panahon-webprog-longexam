const Cart = require('../Models/cartModel');
const Product = require('../Models/productModel');
const { HttpStatus } = require('../config/constants');
const { failServer, failValidation } = require('../Middleware/errorHandler');

// Loads (or lazily creates) the signed-in user's cart with product details attached.
const loadCart = async (userId) => {
    let cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart) {
        cart = await Cart.create({ user: userId, items: [], totalPrice: 0 });
        cart = await cart.populate('items.product');
    }
    return cart;
};

// Totals are always recomputed server-side from live product prices.
// A line whose product was deleted contributes nothing.
const recalculateTotal = (cart) => {
    cart.totalPrice = cart.items.reduce((sum, item) => {
        const price = item.product?.price ?? 0;
        return sum + price * item.quantity;
    }, 0);
    return cart;
};

const saveAndRespond = async (res, cart, message, status = HttpStatus.OK) => {
    recalculateTotal(cart);
    await cart.save();
    await cart.populate('items.product');

    res.status(status).json({
        success: true,
        message,
        data: recalculateTotal(cart)
    });
};

// Finds a line by product id, tolerating a line whose product no longer exists.
const findLine = (cart, productId) =>
    cart.items.find((item) => {
        const id = item.product?._id ?? item.product;
        return id?.toString() === productId;
    });

// GET /api/v1/carts/me
exports.getMyCart = async (req, res) => {
    try {
        const cart = recalculateTotal(await loadCart(req.user.userId));
        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Cart retrieved successfully.',
            data: cart
        });
    } catch (error) {
        failServer(res, error, 'getMyCart', 'Could not load your cart. Please try again.');
    }
};

// POST /api/v1/carts/items  { productId, quantity }
exports.addItem = async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Product not found.' });
        }

        const cart = await loadCart(req.user.userId);
        const existing = findLine(cart, productId);
        const newQuantity = (existing?.quantity ?? 0) + Number(quantity);

        if (newQuantity > product.stockQuantity) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: product.stockQuantity === 0
                    ? `${product.productName} is out of stock.`
                    : `Only ${product.stockQuantity} unit(s) of ${product.productName} are in stock.`
            });
        }

        if (existing) {
            existing.quantity = newQuantity;
        } else {
            cart.items.push({ product: productId, quantity: newQuantity });
        }

        await saveAndRespond(res, cart, `${product.productName} added to your cart.`, HttpStatus.CREATED);
    } catch (error) {
        failValidation(res, error, 'addItem', 'The item could not be added to your cart.');
    }
};

// PATCH /api/v1/carts/items/:productId  { quantity }  (0 removes the line)
exports.updateItem = async (req, res) => {
    try {
        const { productId } = req.params;
        const quantity = Number(req.body.quantity);

        const cart = await loadCart(req.user.userId);
        const existing = findLine(cart, productId);

        if (!existing) {
            return res.status(HttpStatus.NOT_FOUND).json({
                success: false,
                message: 'That item is not in your cart.'
            });
        }

        if (quantity === 0) {
            cart.items.pull(existing._id);
            return saveAndRespond(res, cart, 'Item removed from your cart.');
        }

        // The product may have been deleted while it sat in the cart.
        if (!existing.product) {
            cart.items.pull(existing._id);
            await saveAndRespond(
                res,
                cart,
                'That product is no longer available and has been removed from your cart.'
            );
            return;
        }

        if (quantity > existing.product.stockQuantity) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: `Only ${existing.product.stockQuantity} unit(s) of ${existing.product.productName} are in stock.`
            });
        }

        existing.quantity = quantity;
        await saveAndRespond(res, cart, 'Cart updated.');
    } catch (error) {
        failValidation(res, error, 'updateItem', 'Your cart could not be updated.');
    }
};

// DELETE /api/v1/carts/items/:productId
exports.removeItem = async (req, res) => {
    try {
        const cart = await loadCart(req.user.userId);
        const existing = findLine(cart, req.params.productId);

        if (!existing) {
            return res.status(HttpStatus.NOT_FOUND).json({
                success: false,
                message: 'That item is not in your cart.'
            });
        }

        cart.items.pull(existing._id);
        await saveAndRespond(res, cart, 'Item removed from your cart.');
    } catch (error) {
        failValidation(res, error, 'removeItem', 'The item could not be removed.');
    }
};

// DELETE /api/v1/carts/me
exports.clearCart = async (req, res) => {
    try {
        const cart = await loadCart(req.user.userId);
        cart.items = [];
        await saveAndRespond(res, cart, 'Cart cleared.');
    } catch (error) {
        failValidation(res, error, 'clearCart', 'Your cart could not be cleared.');
    }
};

// GET /api/v1/carts  (Admin)
exports.getAllCarts = async (req, res) => {
    try {
        const carts = await Cart.find().populate('user', 'name email').populate('items.product');
        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Carts retrieved successfully.',
            count: carts.length,
            data: carts
        });
    } catch (error) {
        failServer(res, error, 'getAllCarts', 'Could not load carts. Please try again.');
    }
};
