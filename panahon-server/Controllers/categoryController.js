const Category = require('../Models/categoryModel');
const { HttpStatus } = require('../config/constants');

exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.status(HttpStatus.OK).json(categories);
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const newCategory = new Category(req.body);
        const savedCategory = await newCategory.save();
        res.status(HttpStatus.CREATED).json(savedCategory);
    } catch (error) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
    }
};
