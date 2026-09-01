const express = require('express');
const router = express.Router();
const orderController = require('../Controllers/orderController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');
const {
    orderValidation,
    orderStatusValidation,
    objectIdParam,
} = require('../Middleware/validationMiddleware');

router.use(authentication);

// Customer
router.get('/me', orderController.getMyOrders);
router.post('/', orderValidation, orderController.createOrder);
router.patch('/:id/cancel', objectIdParam('id', 'order'), orderController.cancelOrder);

// Admin
router.get('/', authorize('Admin'), orderController.getAllOrders);
router.patch('/:id/status', authorize('Admin'), orderStatusValidation, orderController.updateOrderStatus);

// Owner or Admin
router.get('/:id', objectIdParam('id', 'order'), orderController.getOrderById);

module.exports = router;
