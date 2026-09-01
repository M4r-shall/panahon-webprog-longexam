const express = require('express');
const router = express.Router();
const reviewController = require('../Controllers/reviewController');
const authentication = require('../Middleware/authentication');
const authorize = require('../Middleware/authorization');
const {
    reviewValidation,
    reviewUpdateValidation,
    objectIdParam,
} = require('../Middleware/validationMiddleware');

// Public - anyone browsing a product can read its reviews
router.get('/', reviewController.getAllReviews);

router.post('/', authentication, authorize('Admin', 'Customer'), reviewValidation, reviewController.createReview);
router.put('/:id', authentication, authorize('Admin', 'Customer'), reviewUpdateValidation, reviewController.updateReview);
router.delete('/:id', authentication, authorize('Admin', 'Customer'), objectIdParam('id', 'review'), reviewController.deleteReview);

module.exports = router;
