const Product = require('../Models/productModel');
const Category = require('../Models/categoryModel');
const { HttpStatus } = require('../config/constants');

// Get all products with pagination, filtering, sorting, and searching
exports.getAllProducts = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, sort, category, supplier, ...filters } = req.query;
        
        let query = {};
        
        // Keyword Search
        if (search) {
            query.$or = [
                { productName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Filtering by Category Name (Resolving ObjectId)
        if (category) {
            const categoryDoc = await Category.findOne({ categoryName: { $regex: new RegExp(`^${category}$`, 'i') } });
            if (categoryDoc) {
                query.category = categoryDoc._id;
            } else {
                // If category is not found, return empty result
                return res.status(HttpStatus.OK).json({
                    success: true,
                    message: "Products retrieved successfully.",
                    count: 0,
                    data: []
                });
            }
        }

        // Additional filters (e.g. supplier mapped to seller if needed, though usually an ID)
        Object.assign(query, filters);

        // Sorting
        let sortOption = {};
        if (sort) {
            // sort=price or sort=-price
            const sortFields = sort.split(',').join(' ');
            sortOption = sortFields;
        }

        // Pagination
        const limitNum = parseInt(limit, 10);
        const pageNum = parseInt(page, 10);
        const skip = (pageNum - 1) * limitNum;

        const products = await Product.find(query)
            .populate('category')
            .populate('seller', 'firstName lastName')
            .sort(sortOption)
            .skip(skip)
            .limit(limitNum);
            
        const totalProducts = await Product.countDocuments(query);

        res.status(HttpStatus.OK).json({
            success: true,
            message: "Products retrieved successfully.",
            count: products.length,
            total: totalProducts,
            totalPages: Math.ceil(totalProducts / limitNum),
            currentPage: pageNum,
            data: products
        });
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Create a new product
exports.createProduct = async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        const savedProduct = await newProduct.save();
        res.status(HttpStatus.CREATED).json({
            success: true,
            message: "Product created successfully.",
            data: savedProduct
        });
    } catch (error) {
        res.status(HttpStatus.BAD_REQUEST).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Get product by ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category').populate('seller', 'firstName lastName');
        if (!product) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "Product not found." });
        }
        res.status(HttpStatus.OK).json({
            success: true,
            message: "Product retrieved successfully.",
            data: product
        });
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedProduct) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "Product not found." });
        }
        res.status(HttpStatus.OK).json({
            success: true,
            message: "Product updated successfully.",
            data: updatedProduct
        });
    } catch (error) {
        res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

// Delete product
exports.deleteProduct = async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "Product not found." });
        }
        res.status(HttpStatus.OK).json({
            success: true,
            message: "Product deleted successfully.",
            data: null
        });
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};
