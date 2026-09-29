const mongoose = require('mongoose');
const Product = require('../Models/productModel');
const Category = require('../Models/categoryModel');
const { HttpStatus, MAX_PAGE_SIZE } = require('../config/constants');
const { containsMatcher, exactMatcher, toSearchString } = require('../config/sanitize');
const { failServer, failValidation } = require('../Middleware/errorHandler');
const cloudinary = require('../config/cloudinary');

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

        // A file sent with the form goes to Cloudinary; its URL is stored on the product.
        let image = { imageUrl, imagePublicId: '' };
        if (req.file) {
            const result = await cloudinary.uploadBuffer(req.file.buffer);
            image = { imageUrl: result.secure_url, imagePublicId: result.public_id };
        }

        const savedProduct = await new Product({
            productName,
            description,
            price,
            stockQuantity,
            imageUrl: image.imageUrl,
            imagePublicId: image.imagePublicId,
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

        // Read the old image before overwriting it so a replaced image can be cleaned up.
        const previous = await Product.findById(req.params.id).select('imageUrl imagePublicId');
        if (!previous) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Product not found.' });
        }

        // Keep the current image unless a new file was sent or the image was removed.
        const update = { productName, description, price, stockQuantity, category, imageUrl };
        if (req.file) {
            const result = await cloudinary.uploadBuffer(req.file.buffer);
            update.imageUrl = result.secure_url;
            update.imagePublicId = result.public_id;
        } else if (imageUrl !== previous.imageUrl) {
            update.imagePublicId = '';
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true, runValidators: true }
        ).populate('category');

        if (!updatedProduct) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Product not found.' });
        }

        // The old Cloudinary image is no longer used by this product.
        if (previous.imagePublicId && previous.imagePublicId !== updatedProduct.imagePublicId) {
            await cloudinary.deleteImage(previous.imagePublicId);
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

        await cloudinary.deleteImage(deletedProduct.imagePublicId);

        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Product deleted successfully.',
            data: null
        });
    } catch (error) {
        failServer(res, error, 'deleteProduct', 'The product could not be deleted.');
    }
};

// Upload / replace a product's image
// POST /api/v1/products/:id/upload-image  (Admin) - multipart/form-data, field name "image"
exports.uploadProductImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Please choose an image to upload.',
                errors: [{ field: 'image', message: 'Please choose an image to upload.' }]
            });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Product not found.' });
        }

        const result = await cloudinary.uploadBuffer(req.file.buffer);

        // Replace: point the product at the new image, then remove the old one from Cloudinary.
        const oldPublicId = product.imagePublicId;
        product.imageUrl = result.secure_url;
        product.imagePublicId = result.public_id;
        await product.save();
        await cloudinary.deleteImage(oldPublicId);

        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Product image uploaded successfully.',
            imageUrl: result.secure_url,
            publicId: result.public_id,
            data: product
        });
    } catch (error) {
        failServer(res, error, 'uploadProductImage', 'The image could not be uploaded.');
    }
};
