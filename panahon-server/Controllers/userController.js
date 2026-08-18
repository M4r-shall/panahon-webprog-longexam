const User = require('../Models/userModel');
const { HttpStatus } = require('../config/constants');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(HttpStatus.OK).json(users);
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        if (req.user.role === 'Customer' && req.user.userId !== req.params.id) {
            return res.status(HttpStatus.FORBIDDEN).json({ message: "Unauthorized: You can only view your own data." });
        }
        const user = await User.findById(req.params.id);
        if (!user) return res.status(HttpStatus.NOT_FOUND).json({ message: "User not found" });
        res.status(HttpStatus.OK).json(user);
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, role, address } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword, role, address });
        const savedUser = await newUser.save();
        res.status(HttpStatus.CREATED).json(savedUser);
    } catch (error) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            if (req.recordFailedLogin) await req.recordFailedLogin();
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            if (req.recordFailedLogin) await req.recordFailedLogin();
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: "Invalid email or password" });
        }

        if (req.recordSuccessfulLogin) await req.recordSuccessfulLogin();

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.SECRET_KEY,
            { expiresIn: '24h' }
        );

        res.status(HttpStatus.OK).json({ token, message: "Login successful" });
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        if (req.user.role === 'Customer' && req.user.userId !== req.params.id) {
            return res.status(HttpStatus.FORBIDDEN).json({ message: "Unauthorized: You can only update your own data." });
        }
        
        const updateData = { ...req.body };
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedUser) return res.status(HttpStatus.NOT_FOUND).json({ message: "User not found" });
        res.status(HttpStatus.OK).json(updatedUser);
    } catch (error) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(HttpStatus.NOT_FOUND).json({ message: "User not found" });
        res.status(HttpStatus.OK).json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};
