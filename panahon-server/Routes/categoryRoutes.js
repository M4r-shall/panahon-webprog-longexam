const express = require('express');
const router = express.Router();
const categoryController = require('../Controllers/categoryController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');

router.get('/', categoryController.getAllCategories);
router.post('/', authentication, authorize('Admin'), categoryController.createCategory);

module.exports = router;
