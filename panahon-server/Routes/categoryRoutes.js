const express = require('express');
const router = express.Router();
const categoryController = require('../Controllers/categoryController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');
const {
    categoryValidation,
    categoryUpdateValidation,
    objectIdParam,
} = require('../Middleware/validationMiddleware');

router.get('/', categoryController.getAllCategories);

router.post('/', authentication, authorize('Admin'), categoryValidation, categoryController.createCategory);
router.put('/:id', authentication, authorize('Admin'), categoryUpdateValidation, categoryController.updateCategory);
router.delete('/:id', authentication, authorize('Admin'), objectIdParam('id', 'category'), categoryController.deleteCategory);

module.exports = router;
