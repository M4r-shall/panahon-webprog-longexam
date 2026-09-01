const express = require('express');
const router = express.Router();
const productController = require('../Controllers/productController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');
const {
    productValidation,
    productUpdateValidation,
    objectIdParam,
} = require('../Middleware/validationMiddleware');

router.get('/', productController.getAllProducts);
router.get('/:id', objectIdParam('id', 'product'), productController.getProductById);

router.post('/', authentication, authorize('Admin'), productValidation, productController.createProduct);
router.put('/:id', authentication, authorize('Admin'), productUpdateValidation, productController.updateProduct);
router.delete('/:id', authentication, authorize('Admin'), objectIdParam('id', 'product'), productController.deleteProduct);

module.exports = router;
