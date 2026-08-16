const express = require('express');
const router = express.Router();
const cartController = require('../Controllers/cartController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');

router.get('/', authentication, authorize('Admin', 'Customer'), cartController.getAllCarts);
router.post('/', authentication, authorize('Admin', 'Customer'), cartController.createCart);

module.exports = router;
