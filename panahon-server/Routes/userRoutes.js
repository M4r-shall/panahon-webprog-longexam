const express = require('express');
const router = express.Router();
const userController = require('../Controllers/userController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');
const {
    registerValidation,
    loginValidation,
    updateProfileValidation,
    changePasswordValidation,
    userStatusValidation,
    objectIdParam,
} = require('../Middleware/validationMiddleware');
const { loginLimiter, standardLimiter } = require('../Middleware/rateLimiterMiddleware');

// Public
router.post('/login', loginLimiter, loginValidation, userController.login);
router.post('/register', standardLimiter, registerValidation, userController.registerUser);

// Authenticated (must be declared before '/:id' so 'me' is not read as an id)
router.get('/me', authentication, userController.getMe);
router.patch('/change-password', authentication, changePasswordValidation, userController.changePassword);

// Admin
router.get('/', authentication, authorize('Admin'), userController.getAllUsers);
router.patch('/:id/status', authentication, authorize('Admin'), userStatusValidation, userController.setUserStatus);
router.delete('/remove/:id', authentication, authorize('Admin'), objectIdParam('id', 'user'), userController.deleteUser);

// Admin or owner
router.get('/:id', authentication, authorize('Admin', 'Customer'), objectIdParam('id', 'user'), userController.getUserById);
router.patch('/update/:id', authentication, authorize('Admin', 'Customer'), updateProfileValidation, userController.updateUser);

module.exports = router;
