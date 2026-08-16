const express = require('express');
const router = express.Router();
const reviewController = require('../Controllers/reviewController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');

router.get('/', reviewController.getAllReviews);
router.post('/', authentication, authorize('Admin', 'Customer'), reviewController.createReview);

module.exports = router;
