const mongoose = require('mongoose');
const Product = require('../Models/productModel');
const Category = require('../Models/categoryModel');
const { HttpStatus, MAX_PAGE_SIZE } = require('../config/constants');
const { containsMatcher, exactMatcher, toSearchString } = require('../config/sanitize');
const { failServer, failValidation } = require('../Middleware/errorHandler');
const { removeUploadedFile } = require('../Middleware/uploadMiddleware');

// Get all products with pagination, filtering, sorting, and searching
exports.getAllProducts = async (req, res) => {
    try {
        const { page, limit, search, sort, category, minPrice, maxPrice } = req.query;

        const query = {};

        // Keyword search - the term is escaped so regex metacharacters are literal
        const searchMatcher = containsMatcher(search);
        if (searchMatcher) {
            query.$or = [{ productName: searchMatcher }, { description: searchMatcher }];
        }

        // Filtering by category id, or by exact category name (case-insensitive)
        const categoryTerm = toSearchString(category);
        if (categoryTerm) {
            if (mongoose.isValidObjectId(categoryTerm)) {
                query.category = categoryTerm;
            } else {
                const categoryDoc = await Category.findOne({ categoryName: exactMatcher(categoryTerm) });
                if (!categoryDoc) {
                    // If category is not found, return empty result
                    return res.status(HttpStatus.OK).json({
                        success: true,
                        message: 'Products retrieved successfully.',
                        count: 0,
                        total: 0,
                        totalPages: 0,
                        currentPage: 1,
                        data: []
                    });
                }
                query.category = categoryDoc._id;
            }
        }

        // Price range filter (only these extra filters are accepted - never raw query keys)
        const min = Number(minPrice);
        const max = Number(maxPrice);
        if (Number.isFinite(min) || Number.isFinite(max)) {
            query.price = {};
            if (Number.isFinite(min)) query.price.$gte = min;
            if (Number.isFinite(max)) query.price.$lte = max;
        }

        // Sorting - only these fields may be sorted on, so no arbitrary paths reach Mongo
        const SORTABLE = ['price', '-price', 'productName', '-productName', 'createdAt', '-createdAt'];
        const sortOption = SORTABLE.includes(toSearchString(sort)) ? toSearchString(sort) : '-createdAt';

        // Pagination - capped so one request cannot pull the whole collection
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), MAX_PAGE_SIZE);
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const skip = (pageNum - 1) * limitNum;

        const products = await Product.find(query)
            .populate('category')
            .populate('seller', 'name email')
            .sort(sortOption)
            .skip(skip)
            .limit(limitNum);

        const totalProducts = await Product.countDocuments(query);

        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Products retrieved successfully.',
            count: products.length,
            total: totalProducts,
            totalPages: Math.ceil(totalProducts / limitNum),
            currentPage: pageNum,
            data: products
        });
    } catch (error) {
        failServer(res, error, 'getAllProducts', 'Could not load the catalog. Please try again.');
    }
};

// Create a new product
exports.createProduct = async (req, res) => {
    try {
        const { productName, description, price, stockQuantity, category, imageUrl } = req.body;

        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'The selected category does not exist.'
            });
        }

        const savedProduct = await new Product({
            productName,
            description,
            price,
            stockQuantity,
            imageUrl,
            category,
            seller: req.user.userId // the signed-in admin owns the listing
        }).save();

        const populated = await savedProduct.populate('category');

        res.status(HttpStatus.CREATED).json({
            success: true,
            message: 'Product created successfully.',
            data: populated
        });
    } catch (error) {
        failValidation(res, error, 'createProduct', 'The product could not be created.');
    }
};

// Get product by ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category')
            .populate('seller', 'name email');

        if (!product) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Product not found.' });
        }
        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Product retrieved successfully.',
            data: product
        });
    } catch (error) {
        failServer(res, error, 'getProductById', 'Could not load this product. Please try again.');
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    try {
        const { productName, description, price, stockQuantity, category, imageUrl } = req.body;

        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'The selected category does not exist.'
            });
        }

        // Read the old image before overwriting it so a replaced upload can be cleaned up.
        const previous = await Product.findById(req.params.id).select('imageUrl');

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { productName, description, price, stockQuantity, category, imageUrl },
            { new: true, runValidators: true }
        ).populate('category');

        if (!updatedProduct) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Product not found.' });
        }

        // Only touches files under /uploads - a seeded /img/... path is left alone.
        if (previous && previous.imageUrl && previous.imageUrl !== updatedProduct.imageUrl) {
            removeUploadedFile(previous.imageUrl);
        }
        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Product updated successfully.',
            data: updatedProduct
        });
    } catch (error) {
        failValidation(res, error, 'updateProduct', 'The product could not be updated.');
    }
};

// Delete product
exports.deleteProduct = async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Product not found.' });
        }

        removeUploadedFile(deletedProduct.imageUrl);

        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Product deleted successfully.',
            data: null
        });
    } catch (error) {
        failServer(res, error, 'deleteProduct', 'The product could not be deleted.');
    }
};
