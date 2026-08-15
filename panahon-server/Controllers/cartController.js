const Cart = require('../Models/cartModel');
const { HttpStatus } = require('../config/constants');

exports.getAllCarts = async (req, res) => {
    try {
        const carts = await Cart.find().populate('user', 'firstName lastName').populate('items.product');
        res.status(HttpStatus.OK).json(carts);
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

exports.createCart = async (req, res) => {
    try {
        const newCart = new Cart(req.body);
        const savedCart = await newCart.save();
        res.status(HttpStatus.CREATED).json(savedCart);
    } catch (error) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
    }
};
