const Review = require('../Models/reviewModel');

exports.getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find().populate('product').populate('user', 'firstName lastName');
        res.status(200).json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createReview = async (req, res) => {
    try {
        const newReview = new Review(req.body);
        const savedReview = await newReview.save();
        res.status(201).json(savedReview);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
