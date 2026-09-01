const Category = require('../Models/categoryModel');
const Product = require('../Models/productModel');
const { HttpStatus } = require('../config/constants');
const { failServer, failValidation } = require('../Middleware/errorHandler');

exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ categoryName: 1 });
        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Categories retrieved successfully.',
            count: categories.length,
            data: categories
        });
    } catch (error) {
        failServer(res, error, 'getAllCategories', 'Could not load categories. Please try again.');
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { categoryName, description } = req.body;
        const savedCategory = await new Category({ categoryName, description }).save();
        res.status(HttpStatus.CREATED).json({
            success: true,
            message: 'Category created successfully.',
            data: savedCategory
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(HttpStatus.CONFLICT).json({
                success: false,
                message: 'A category with that name already exists.'
            });
        }
        failValidation(res, error, 'createCategory', 'The category could not be created.');
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { categoryName, description } = req.body;
        const updated = await Category.findByIdAndUpdate(
            req.params.id,
            { categoryName, description },
            { new: true, runValidators: true }
        );
        if (!updated) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Category not found.' });
        }
        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Category updated successfully.',
            data: updated
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(HttpStatus.CONFLICT).json({
                success: false,
                message: 'A category with that name already exists.'
            });
        }
        failValidation(res, error, 'updateCategory', 'The category could not be updated.');
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const inUse = await Product.countDocuments({ category: req.params.id });
        if (inUse > 0) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: `This category still has ${inUse} product(s). Reassign them before deleting it.`
            });
        }

        const deleted = await Category.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Category not found.' });
        }
        res.status(HttpStatus.OK).json({ success: true, message: 'Category deleted successfully.' });
    } catch (error) {
        failServer(res, error, 'deleteCategory', 'The category could not be deleted.');
    }
};
