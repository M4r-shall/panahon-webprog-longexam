const express = require('express');
const router = express.Router();
const categoryController = require('../Controllers/categoryController');

router.get('/', categoryController.getAllCategories);
router.post('/', categoryController.createCategory);

module.exports = router;
