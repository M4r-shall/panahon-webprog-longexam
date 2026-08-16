const express = require('express');
const router = express.Router();
const productController = require('../Controllers/productController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');

router.get('/', productController.getAllProducts);
router.post('/', authentication, authorize('Admin'), productController.createProduct);
router.get('/:id', productController.getProductById);
router.put('/:id', authentication, authorize('Admin'), productController.updateProduct);
router.delete('/:id', authentication, authorize('Admin'), productController.deleteProduct);

module.exports = router;
