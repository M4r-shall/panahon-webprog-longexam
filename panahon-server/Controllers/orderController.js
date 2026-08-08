const Order = require('../Models/orderModel');

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate('user', 'firstName lastName').populate('orderItems.product');
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createOrder = async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        const savedOrder = await newOrder.save();
        res.status(201).json(savedOrder);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
