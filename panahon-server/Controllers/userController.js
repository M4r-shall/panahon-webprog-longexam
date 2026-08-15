const User = require('../Models/userModel');
const { HttpStatus } = require('../config/constants');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(HttpStatus.OK).json(users);
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const newUser = new User(req.body);
        const savedUser = await newUser.save();
        res.status(HttpStatus.CREATED).json(savedUser);
    } catch (error) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
    }
};
