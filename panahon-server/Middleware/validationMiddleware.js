const { body, param, validationResult } = require('express-validator');
const { HttpStatus, ORDER_STATUSES, PAYMENT_METHODS, FIELD_LIMITS } = require('../config/constants');

// Shared terminator for every validation chain below.
// Shape is { field, message } so the client can attach messages to inputs.
const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'Validation failed. Please review the highlighted fields.',
            errors: errors.array().map((error) => ({
                field: error.path || error.param,
                message: error.msg,
            })),
        });
    }
    next();
};

const isObjectId = (value) => typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);

/**
 * Guards a route parameter before it reaches Mongoose. Without this a request to
 * /products/garbage produces a CastError, which leaks the model name and internal
 * path back to the caller as a 500.
 *
 * `objectIdCheck` is the bare chain, for composing into a longer validation list.
 * `objectIdParam` is the ready-to-mount version for routes that need nothing else.
 */
const objectIdCheck = (name = 'id', label = 'record') =>
    param(name).custom(isObjectId).withMessage(`Invalid ${label} id`);

const objectIdParam = (name = 'id', label = 'record') => [
    objectIdCheck(name, label),
    handleValidation,
];

// Rejects an image reference that is not a same-origin path or an http(s) URL,
// which keeps javascript:/data: URLs out of the catalog.
const isSafeImageRef = (value) => {
    if (typeof value !== 'string') return false;
    if (value.startsWith('/') && !value.startsWith('//')) return true;
    try {
        return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
        return false;
    }
};

const registerValidation = [
    body('name')
        .isString().withMessage('Name must be a string')
        .bail()
        .trim()
        .isLength({ min: 3 }).withMessage('Name must be at least 3 characters long')
        .isLength({ max: FIELD_LIMITS.name }).withMessage(`Name must be at most ${FIELD_LIMITS.name} characters`),
    body('email')
        .isString().withMessage('Email must be a string')
        .bail()
        .trim()
        .isEmail().withMessage('Invalid email address')
        .isLength({ max: FIELD_LIMITS.email }).withMessage(`Email must be at most ${FIELD_LIMITS.email} characters`)
        .normalizeEmail(),
    body('password')
        .isString().withMessage('Password must be a string')
        .bail()
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
        .isLength({ max: FIELD_LIMITS.password }).withMessage(`Password must be at most ${FIELD_LIMITS.password} characters`),
    body('address')
        .optional({ values: 'falsy' })
        .isString().withMessage('Address must be a string')
        .bail()
        .trim()
        .isLength({ max: FIELD_LIMITS.address }).withMessage(`Address must be at most ${FIELD_LIMITS.address} characters`),
    handleValidation
];

const loginValidation = [
    body('email')
        .isString().withMessage('Email must be a string')
        .bail()
        .trim()
        .isEmail().withMessage('Invalid email address'),
    body('password')
        .isString().withMessage('Password must be a string')
        .bail()
        .notEmpty().withMessage('Password is required'),
    handleValidation
];

const updateProfileValidation = [
    objectIdCheck('id', 'user'),
    body('name')
        .optional()
        .isString().withMessage('Name must be a string')
        .bail()
        .trim()
        .isLength({ min: 3 }).withMessage('Name must be at least 3 characters long')
        .isLength({ max: FIELD_LIMITS.name }).withMessage(`Name must be at most ${FIELD_LIMITS.name} characters`),
    body('email')
        .optional()
        .isString().withMessage('Email must be a string')
        .bail()
        .trim()
        .isEmail().withMessage('Invalid email address')
        .isLength({ max: FIELD_LIMITS.email }).withMessage(`Email must be at most ${FIELD_LIMITS.email} characters`),
    body('address')
        .optional({ values: 'falsy' })
        .isString().withMessage('Address must be a string')
        .bail()
        .trim()
        .isLength({ max: FIELD_LIMITS.address }).withMessage(`Address must be at most ${FIELD_LIMITS.address} characters`),
    body('role')
        .optional()
        .isIn(['Customer', 'Admin']).withMessage('Role must be either Customer or Admin'),
    handleValidation
];

const changePasswordValidation = [
    body('currentPassword')
        .isString().withMessage('Current password must be a string')
        .bail()
        .notEmpty().withMessage('Current password is required'),
    body('newPassword')
        .isString().withMessage('New password must be a string')
        .bail()
        .isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
        .isLength({ max: FIELD_LIMITS.password }).withMessage(`Password must be at most ${FIELD_LIMITS.password} characters`)
        .custom((value, { req }) => value !== req.body.currentPassword)
        .withMessage('New password must be different from the current password'),
    handleValidation
];

const userStatusValidation = [
    objectIdCheck('id', 'user'),
    body('isActive')
        .isBoolean().withMessage('isActive must be true or false'),
    handleValidation
];

const productBodyValidation = [
    body('productName')
        .isString().withMessage('Product name must be a string')
        .bail()
        .trim()
        .notEmpty().withMessage('Product name is required')
        .isLength({ min: 3 }).withMessage('Product name must be at least 3 characters long')
        .isLength({ max: FIELD_LIMITS.productName }).withMessage(`Product name must be at most ${FIELD_LIMITS.productName} characters`),
    body('description')
        .isString().withMessage('Description must be a string')
        .bail()
        .trim()
        .notEmpty().withMessage('Description is required')
        .isLength({ min: 10 }).withMessage('Description must be at least 10 characters long')
        .isLength({ max: FIELD_LIMITS.description }).withMessage(`Description must be at most ${FIELD_LIMITS.description} characters`),
    body('price')
        .isFloat({ min: 0, max: 1_000_000 }).withMessage('Price must be a number between 0 and 1,000,000'),
    body('stockQuantity')
        .isInt({ min: 0, max: 1_000_000 }).withMessage('Stock quantity must be a whole number between 0 and 1,000,000'),
    body('category')
        .custom(isObjectId).withMessage('Please select a valid category'),
    body('imageUrl')
        .optional({ values: 'falsy' })
        .isString().withMessage('Image URL must be a string')
        .bail()
        .trim()
        .isLength({ max: FIELD_LIMITS.imageUrl }).withMessage(`Image URL must be at most ${FIELD_LIMITS.imageUrl} characters`)
        .custom(isSafeImageRef).withMessage('Image URL must be a path like /img/item.png or an http(s) URL'),
];

const productValidation = [...productBodyValidation, handleValidation];

const productUpdateValidation = [
    objectIdCheck('id', 'product'),
    ...productBodyValidation,
    handleValidation
];

const categoryValidation = [
    body('categoryName')
        .isString().withMessage('Category name must be a string')
        .bail()
        .trim()
        .notEmpty().withMessage('Category name is required')
        .isLength({ min: 2 }).withMessage('Category name must be at least 2 characters long')
        .isLength({ max: FIELD_LIMITS.categoryName }).withMessage(`Category name must be at most ${FIELD_LIMITS.categoryName} characters`),
    body('description')
        .optional({ values: 'falsy' })
        .isString().withMessage('Description must be a string')
        .bail()
        .trim()
        .isLength({ max: FIELD_LIMITS.description }).withMessage(`Description must be at most ${FIELD_LIMITS.description} characters`),
    handleValidation
];

const categoryUpdateValidation = [
    objectIdCheck('id', 'category'),
    ...categoryValidation,
];

const reviewValidation = [
    body('product')
        .custom(isObjectId).withMessage('A valid product is required'),
    body('rating')
        .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment')
        .isString().withMessage('Comment must be a string')
        .bail()
        .trim()
        .notEmpty().withMessage('Comment is required')
        .isLength({ min: 3, max: FIELD_LIMITS.comment })
        .withMessage(`Comment must be between 3 and ${FIELD_LIMITS.comment} characters`),
    handleValidation
];

const reviewUpdateValidation = [
    objectIdCheck('id', 'review'),
    body('rating')
        .optional()
        .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment')
        .optional()
        .isString().withMessage('Comment must be a string')
        .bail()
        .trim()
        .isLength({ min: 3, max: FIELD_LIMITS.comment })
        .withMessage(`Comment must be between 3 and ${FIELD_LIMITS.comment} characters`),
    handleValidation
];

const cartItemValidation = [
    body('productId')
        .custom(isObjectId).withMessage('A valid product is required'),
    body('quantity')
        .isInt({ min: 1, max: 1000 }).withMessage('Quantity must be between 1 and 1000'),
    handleValidation
];

const cartQuantityValidation = [
    param('productId').custom(isObjectId).withMessage('Invalid product id'),
    body('quantity')
        .isInt({ min: 0, max: 1000 }).withMessage('Quantity must be between 0 and 1000'),
    handleValidation
];

const orderValidation = [
    body('shippingAddress')
        .optional({ values: 'falsy' })
        .isString().withMessage('Pickup location must be a string')
        .bail()
        .trim()
        .isLength({ min: 5 }).withMessage('Pickup location must be at least 5 characters long')
        .isLength({ max: FIELD_LIMITS.shippingAddress })
        .withMessage(`Pickup location must be at most ${FIELD_LIMITS.shippingAddress} characters`),
    body('paymentMethod')
        .isIn(PAYMENT_METHODS)
        .withMessage(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`),
    handleValidation
];

const orderStatusValidation = [
    objectIdCheck('id', 'order'),
    body('orderStatus')
        .isIn(ORDER_STATUSES)
        .withMessage(`Order status must be one of: ${ORDER_STATUSES.join(', ')}`),
    handleValidation
];

module.exports = {
    handleValidation,
    objectIdParam,
    objectIdCheck,
    isObjectId,
    registerValidation,
    loginValidation,
    updateProfileValidation,
    changePasswordValidation,
    userStatusValidation,
    productValidation,
    productUpdateValidation,
    categoryValidation,
    categoryUpdateValidation,
    reviewValidation,
    reviewUpdateValidation,
    cartItemValidation,
    cartQuantityValidation,
    orderValidation,
    orderStatusValidation,
};
