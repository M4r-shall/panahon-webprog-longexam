const Order = require('../Models/orderModel');
const { HttpStatus } = require('../config/constants');

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate('user', 'firstName lastName').populate('orderItems.product');
        res.status(HttpStatus.OK).json(orders);
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

exports.createOrder = async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        const savedOrder = await newOrder.save();
        res.status(HttpStatus.CREATED).json(savedOrder);
    } catch (error) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
    }
};
