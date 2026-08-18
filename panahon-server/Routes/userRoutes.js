const express = require('express');
const router = express.Router();
const userController = require('../Controllers/userController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');
const { registerValidation, loginValidation } = require('../Middleware/validationMiddleware');
const { loginLimiter, standardLimiter } = require('../Middleware/rateLimiterMiddleware');

router.get('/', authentication, authorize('Admin'), userController.getAllUsers);
router.get('/:id', authentication, authorize('Admin', 'Customer'), userController.getUserById);
router.post('/login', loginLimiter, loginValidation, userController.login);
router.post('/register', standardLimiter, registerValidation, userController.registerUser);
router.patch('/update/:id', authentication, authorize('Admin', 'Customer'), userController.updateUser);
router.delete('/remove/:id', authentication, authorize('Admin'), userController.deleteUser);

module.exports = router;
