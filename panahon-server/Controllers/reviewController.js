const mongoose = require('mongoose');
const Review = require('../Models/reviewModel');
const Product = require('../Models/productModel');
const { HttpStatus } = require('../config/constants');
const { toSearchString } = require('../config/sanitize');
const { failServer, failValidation } = require('../Middleware/errorHandler');

const populateReview = (query) => query
    .populate('product', 'productName imageUrl')
    .populate('user', 'name email');

const emptyResult = (res) => res.status(HttpStatus.OK).json({
    success: true,
    message: 'Reviews retrieved successfully.',
    count: 0,
    averageRating: 0,
    data: []
});

// GET /api/v1/reviews  - public, ?product=<id> narrows to one product
exports.getAllReviews = async (req, res) => {
    try {
        const product = toSearchString(req.query.product);
        const query = {};

        if (product) {
            // An unknown or malformed id is an empty list, not an error
            if (!mongoose.isValidObjectId(product)) return emptyResult(res);
            query.product = product;
        }

        const reviews = await populateReview(Review.find(query)).sort({ createdAt: -1 });
        const averageRating = reviews.length
            ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
            : 0;

        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Reviews retrieved successfully.',
            count: reviews.length,
            averageRating,
            data: reviews
        });
    } catch (error) {
        failServer(res, error, 'getAllReviews', 'Could not load reviews. Please try again.');
    }
};

// POST /api/v1/reviews  { product, rating, comment }
exports.createReview = async (req, res) => {
    try {
        const { product, rating, comment } = req.body;

        const productExists = await Product.findById(product);
        if (!productExists) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Product not found.' });
        }

        const alreadyReviewed = await Review.findOne({ product, user: req.user.userId });
        if (alreadyReviewed) {
            return res.status(HttpStatus.CONFLICT).json({
                success: false,
                message: 'You have already reviewed this product. Edit your existing review instead.'
            });
        }

        const savedReview = await new Review({
            product,
            user: req.user.userId, // never trusted from the body
            rating,
            comment
        }).save();

        res.status(HttpStatus.CREATED).json({
            success: true,
            message: 'Review posted successfully.',
            data: await populateReview(Review.findById(savedReview._id))
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(HttpStatus.CONFLICT).json({
                success: false,
                message: 'You have already reviewed this product.'
            });
        }
        failValidation(res, error, 'createReview', 'Your review could not be posted.');
    }
};

// PUT /api/v1/reviews/:id - Admin (moderation) or the review's author
exports.updateReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Review not found.' });
        }

        const isOwner = review.user.toString() === req.user.userId;
        if (req.user.role !== 'Admin' && !isOwner) {
            return res.status(HttpStatus.FORBIDDEN).json({
                success: false,
                message: 'Access denied. You can only edit your own review.'
            });
        }

        if (req.body.rating !== undefined) review.rating = req.body.rating;
        if (req.body.comment !== undefined) review.comment = req.body.comment;
        await review.save();

        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Review updated successfully.',
            data: await populateReview(Review.findById(review._id))
        });
    } catch (error) {
        failValidation(res, error, 'updateReview', 'The review could not be updated.');
    }
};

// DELETE /api/v1/reviews/:id - Admin, or the review's author
exports.deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Review not found.' });
        }

        const isOwner = review.user.toString() === req.user.userId;
        if (req.user.role !== 'Admin' && !isOwner) {
            return res.status(HttpStatus.FORBIDDEN).json({
                success: false,
                message: 'Access denied. You can only delete your own review.'
            });
        }

        await review.deleteOne();
        res.status(HttpStatus.OK).json({ success: true, message: 'Review deleted successfully.' });
    } catch (error) {
        failServer(res, error, 'deleteReview', 'The review could not be deleted.');
    }
};
