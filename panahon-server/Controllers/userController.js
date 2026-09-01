const User = require('../Models/userModel');
const { HttpStatus } = require('../config/constants');
const { containsMatcher, oneOf } = require('../config/sanitize');
const { failServer, failValidation } = require('../Middleware/errorHandler');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;

const signToken = (user) => jwt.sign(
    { userId: user._id, role: user.role, name: user.name, email: user.email },
    process.env.SECRET_KEY,
    { expiresIn: '24h' }
);

// GET /api/v1/users  (Admin) - supports ?search= &role= &isActive=
exports.getAllUsers = async (req, res) => {
    try {
        const query = {};

        const searchMatcher = containsMatcher(req.query.search);
        if (searchMatcher) {
            query.$or = [{ name: searchMatcher }, { email: searchMatcher }];
        }

        const role = oneOf(req.query.role, ['Customer', 'Admin']);
        if (role) query.role = role;

        const isActive = oneOf(req.query.isActive, ['true', 'false']);
        if (isActive) query.isActive = isActive === 'true';

        const users = await User.find(query).sort({ createdAt: -1 });
        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Users retrieved successfully.',
            count: users.length,
            data: users
        });
    } catch (error) {
        failServer(res, error, 'getAllUsers', 'Could not load users. Please try again.');
    }
};

// GET /api/v1/users/me - rehydrates the client session from a stored token
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'User not found.' });
        }
        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Profile retrieved successfully.',
            data: user
        });
    } catch (error) {
        failServer(res, error, 'getMe', 'Could not load your profile. Please try again.');
    }
};

exports.getUserById = async (req, res) => {
    try {
        if (req.user.role === 'Customer' && req.user.userId !== req.params.id) {
            return res.status(HttpStatus.FORBIDDEN).json({
                success: false,
                message: 'Access denied. You can only view your own account.'
            });
        }
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'User not found.' });
        }
        res.status(HttpStatus.OK).json({
            success: true,
            message: 'User retrieved successfully.',
            data: user
        });
    } catch (error) {
        failServer(res, error, 'getUserById', 'Could not load this account. Please try again.');
    }
};

exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, address } = req.body;

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(HttpStatus.CONFLICT).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        // Role is deliberately NOT taken from the body - self-registration is always a Customer.
        const savedUser = await new User({
            name,
            email,
            password: hashedPassword,
            role: 'Customer',
            address
        }).save();

        res.status(HttpStatus.CREATED).json({
            success: true,
            message: 'Account created successfully.',
            token: signToken(savedUser),
            data: savedUser
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(HttpStatus.CONFLICT).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }
        failValidation(res, error, 'registerUser', 'Your account could not be created.');
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            if (req.recordFailedLogin) await req.recordFailedLogin();
            return res.status(HttpStatus.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            if (req.recordFailedLogin) await req.recordFailedLogin();
            return res.status(HttpStatus.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        if (!user.isActive) {
            return res.status(HttpStatus.FORBIDDEN).json({
                success: false,
                message: 'This account has been deactivated. Please contact an administrator.'
            });
        }

        if (req.recordSuccessfulLogin) await req.recordSuccessfulLogin();

        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Login successful.',
            token: signToken(user),
            data: user
        });
    } catch (error) {
        failServer(res, error, 'login', 'Could not sign you in right now. Please try again.');
    }
};

// PATCH /api/v1/users/update/:id - profile edit (Admin, or the owner)
exports.updateUser = async (req, res) => {
    try {
        const isSelf = req.user.userId === req.params.id;
        if (req.user.role === 'Customer' && !isSelf) {
            return res.status(HttpStatus.FORBIDDEN).json({
                success: false,
                message: 'Access denied. You can only update your own account.'
            });
        }

        // Whitelist: password goes through change-password, role/isActive are Admin-only.
        const updateData = {};
        ['name', 'email', 'address'].forEach((field) => {
            if (req.body[field] !== undefined) updateData[field] = req.body[field];
        });

        if (req.user.role === 'Admin') {
            if (req.body.role !== undefined) updateData.role = req.body.role;
            if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

            // An admin must not strip their own access and lock themselves out.
            if (isSelf && updateData.role === 'Customer') {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: 'You cannot remove your own Admin role.'
                });
            }
            if (isSelf && updateData.isActive === false) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: 'You cannot deactivate your own account.'
                });
            }
        }

        if (updateData.email) {
            const taken = await User.findOne({ email: updateData.email, _id: { $ne: req.params.id } });
            if (taken) {
                return res.status(HttpStatus.CONFLICT).json({
                    success: false,
                    message: 'That email is already used by another account.'
                });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        });
        if (!updatedUser) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'User not found.' });
        }

        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Profile updated successfully.',
            data: updatedUser
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(HttpStatus.CONFLICT).json({
                success: false,
                message: 'That email is already used by another account.'
            });
        }
        failValidation(res, error, 'updateUser', 'Your profile could not be updated.');
    }
};

// PATCH /api/v1/users/change-password - the caller changes their own password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            // Deliberately a 400, not a 401: the caller's session is perfectly valid,
            // it is the submitted field that is wrong. A 401 here would be read by the
            // client as an expired token and would sign the user out mid-form.
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Your current password is incorrect.',
                errors: [{ field: 'currentPassword', message: 'Your current password is incorrect.' }]
            });
        }

        user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await user.save();

        res.status(HttpStatus.OK).json({ success: true, message: 'Password changed successfully.' });
    } catch (error) {
        failServer(res, error, 'changePassword', 'Your password could not be changed.');
    }
};

// PATCH /api/v1/users/:id/status  (Admin) - activate / deactivate an account
exports.setUserStatus = async (req, res) => {
    try {
        const { isActive } = req.body;

        if (req.user.userId === req.params.id && isActive === false) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'You cannot deactivate your own account.'
            });
        }

        const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
        if (!user) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'User not found.' });
        }

        res.status(HttpStatus.OK).json({
            success: true,
            message: `Account ${isActive ? 'activated' : 'deactivated'} successfully.`,
            data: user
        });
    } catch (error) {
        failServer(res, error, 'setUserStatus', 'The account status could not be changed.');
    }
};

exports.deleteUser = async (req, res) => {
    try {
        if (req.user.userId === req.params.id) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'You cannot delete your own account.'
            });
        }
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'User not found.' });
        }
        res.status(HttpStatus.OK).json({ success: true, message: 'User deleted successfully.' });
    } catch (error) {
        failServer(res, error, 'deleteUser', 'The account could not be deleted.');
    }
};
