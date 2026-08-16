const express = require('express');
const router = express.Router();
const orderController = require('../Controllers/orderController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');

router.get('/', authentication, authorize('Admin', 'Customer'), orderController.getAllOrders);
router.post('/', authentication, authorize('Admin', 'Customer'), orderController.createOrder);

module.exports = router;
