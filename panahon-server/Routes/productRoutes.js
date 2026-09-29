const express = require('express');
const router = express.Router();
const productController = require('../Controllers/productController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');
const upload = require('../Middleware/uploadImageMiddleware.js');
const { verifyImage } = require('../Middleware/uploadImageMiddleware.js');
const {
    productValidation,
    productUpdateValidation,
    objectIdParam,
} = require('../Middleware/validationMiddleware');

router.get('/', productController.getAllProducts);
router.get('/:id', objectIdParam('id', 'product'), productController.getProductById);

// Create / update accept multipart/form-data with an optional "image" file.
// upload.single() runs before the validators so it can parse the form fields into req.body.
router.post('/', authentication, authorize('Admin'), upload.single('image'), verifyImage, productValidation, productController.createProduct);
router.put('/:id', authentication, authorize('Admin'), upload.single('image'), verifyImage, productUpdateValidation, productController.updateProduct);
router.delete('/:id', authentication, authorize('Admin'), objectIdParam('id', 'product'), productController.deleteProduct);

// Upload or replace just the image of an existing product
router.post('/:id/upload-image', authentication, authorize('Admin'), objectIdParam('id', 'product'),
    upload.single('image'),
    verifyImage,
    productController.uploadProductImage
);

module.exports = router;
