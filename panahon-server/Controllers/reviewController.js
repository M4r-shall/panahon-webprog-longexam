const Review = require('../Models/reviewModel');
const { HttpStatus } = require('../config/constants');

exports.getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find().populate('product').populate('user', 'firstName lastName');
        res.status(HttpStatus.OK).json(reviews);
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

exports.createReview = async (req, res) => {
    try {
        const newReview = new Review(req.body);
        const savedReview = await newReview.save();
        res.status(HttpStatus.CREATED).json(savedReview);
    } catch (error) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
    }
};
