const express = require('express');
const router = express.Router();
const cartController = require('../Controllers/cartController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');
const { cartItemValidation, cartQuantityValidation } = require('../Middleware/validationMiddleware');

// Every cart route is scoped to the signed-in user
router.use(authentication);

router.get('/me', cartController.getMyCart);
router.delete('/me', cartController.clearCart);

router.post('/items', cartItemValidation, cartController.addItem);
router.patch('/items/:productId', cartQuantityValidation, cartController.updateItem);
router.delete('/items/:productId', cartController.removeItem);

router.get('/', authorize('Admin'), cartController.getAllCarts);

module.exports = router;


