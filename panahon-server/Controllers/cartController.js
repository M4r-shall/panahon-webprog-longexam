const Cart = require('../Models/cartModel');

exports.getAllCarts = async (req, res) => {
    try {
        const carts = await Cart.find().populate('user', 'firstName lastName').populate('items.product');
        res.status(200).json(carts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createCart = async (req, res) => {
    try {
        const newCart = new Cart(req.body);
        const savedCart = await newCart.save();
        res.status(201).json(savedCart);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
