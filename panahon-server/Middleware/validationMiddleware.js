const { body, validationResult } = require('express-validator');

const registerValidation = [
    body('name')
        .isString().withMessage('Name must be a string')
        .isLength({ min: 3 }).withMessage('Name must be at least 3 characters long'),
    body('email')
        .isEmail().withMessage('Invalid email address'),
    body('password')    
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('role')
        .optional()
        .isIn(['Customer', 'Admin']).withMessage('Role must be either Customer or Admin'),
    body('address')
        .optional()
        .isString().withMessage('Address must be a string'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const loginValidation = [
    body('email')
        .isEmail().withMessage('Invalid email address'),
    body('password')    
        .notEmpty().withMessage('Password is required'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

module.exports = { registerValidation, loginValidation };
