const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const PORT = process.env.PORT || 5000;

// Reusable error example builder so every documented error has the same shape.
const errorExample = (message) => ({ success: false, message });

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Bulldogs Exchange API',
            version: '1.0.0',
            description:
                'REST API for **Bulldogs Exchange**, the NU campus marketplace. ' +
                'It covers authentication, user accounts, the product catalog (categories, suppliers, products, ' +
                'product images), reviews, shopping carts, and pickup orders.\n\n' +
                '**Authentication:** call `POST /users/login`, copy the `token` from the response, then click ' +
                '**Authorize** and paste it. Protected routes expect `Authorization: Bearer <token>`. Tokens expire after 24 hours.\n\n' +
                '**Roles:** `Customer` (default for new accounts) and `Admin`.\n\n' +
                '**Response envelope:** every response has `success` and `message`. Successful responses add `data` ' +
                '(and `count` for lists); validation failures add `errors: [{ field, message }]`.',
            contact: { name: 'Marius Clarence P. Panahon (INF232)' },
        },
        servers: [
            { url: `http://localhost:${PORT}/api/v1`, description: 'Local development server' },
        ],
        tags: [
            { name: 'Health', description: 'Service status' },
            { name: 'Authentication', description: 'Register and log in to obtain a JWT' },
            { name: 'Users', description: 'Profile and account management' },
            { name: 'Categories', description: 'Product categories' },
            { name: 'Suppliers', description: 'Suppliers that stock the campus store' },
            { name: 'Products', description: 'Product catalog and product images (Cloudinary)' },
            { name: 'Reviews', description: 'Product ratings and comments' },
            { name: 'Carts', description: 'The logged-in user\'s shopping cart' },
            { name: 'Orders', description: 'Checkout and order lifecycle' },
            { name: 'Uploads', description: 'Standalone image uploads stored on the server disk' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Paste the token returned by POST /users/login.',
                },
            },
            parameters: {
                IdParam: {
                    name: 'id',
                    in: 'path',
                    required: true,
                    description: 'MongoDB ObjectId (24 hex characters)',
                    schema: { type: 'string', example: '66f1c2a4b5d6e7f8091a2b3c' },
                },
            },
            schemas: {
                ObjectId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '66f1c2a4b5d6e7f8091a2b3c' },
                User: {
                    type: 'object',
                    properties: {
                        _id: { $ref: '#/components/schemas/ObjectId' },
                        name: { type: 'string', example: 'Juan Dela Cruz' },
                        email: { type: 'string', format: 'email', example: 'student@nu.edu.ph' },
                        role: { type: 'string', enum: ['Customer', 'Admin'], example: 'Customer' },
                        address: { type: 'string', example: 'Block 4 Lot 12, Quezon City' },
                        isActive: { type: 'boolean', example: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Category: {
                    type: 'object',
                    properties: {
                        _id: { $ref: '#/components/schemas/ObjectId' },
                        categoryName: { type: 'string', example: 'Stationery' },
                        description: { type: 'string', example: 'Notebooks, pens, and daily class supplies.' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                CategoryInput: {
                    type: 'object',
                    required: ['categoryName'],
                    properties: {
                        categoryName: { type: 'string', minLength: 2, maxLength: 60, example: 'Stationery' },
                        description: { type: 'string', maxLength: 2000, example: 'Notebooks, pens, and daily class supplies.' },
                    },
                },
                Supplier: {
                    type: 'object',
                    properties: {
                        _id: { $ref: '#/components/schemas/ObjectId' },
                        supplierName: { type: 'string', example: 'Sampaloc School Supplies Co.' },
                        contactPerson: { type: 'string', example: 'Ana Reyes' },
                        email: { type: 'string', format: 'email', example: 'sales@sampalocsupplies.ph' },
                        phone: { type: 'string', example: '+63 917 123 4567' },
                        address: { type: 'string', example: '1234 P. Noval St., Sampaloc, Manila' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                SupplierInput: {
                    type: 'object',
                    required: ['supplierName'],
                    properties: {
                        supplierName: { type: 'string', minLength: 2, maxLength: 80, example: 'Sampaloc School Supplies Co.' },
                        contactPerson: { type: 'string', maxLength: 80, example: 'Ana Reyes' },
                        email: { type: 'string', format: 'email', maxLength: 120, example: 'sales@sampalocsupplies.ph' },
                        phone: { type: 'string', maxLength: 20, example: '+63 917 123 4567' },
                        address: { type: 'string', maxLength: 200, example: '1234 P. Noval St., Sampaloc, Manila' },
                    },
                },
                Product: {
                    type: 'object',
                    properties: {
                        _id: { $ref: '#/components/schemas/ObjectId' },
                        productName: { type: 'string', example: 'Campus Tote Bag' },
                        description: { type: 'string', example: 'Durable canvas tote that fits a laptop and notebooks.' },
                        price: { type: 'number', example: 349 },
                        stockQuantity: { type: 'integer', example: 25 },
                        imageUrl: { type: 'string', example: 'https://res.cloudinary.com/demo/image/upload/v1/bulldogs-exchange/products/abc.jpg' },
                        imagePublicId: { type: 'string', example: 'bulldogs-exchange/products/abc' },
                        category: { $ref: '#/components/schemas/Category' },
                        seller: {
                            type: 'object',
                            properties: {
                                _id: { $ref: '#/components/schemas/ObjectId' },
                                name: { type: 'string', example: 'Marius Panahon' },
                                email: { type: 'string', example: 'admin@nu.edu.ph' },
                            },
                        },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                ProductInput: {
                    type: 'object',
                    required: ['productName', 'description', 'price', 'stockQuantity', 'category'],
                    properties: {
                        productName: { type: 'string', minLength: 3, maxLength: 120, example: 'Campus Tote Bag' },
                        description: { type: 'string', minLength: 10, maxLength: 2000, example: 'Durable canvas tote that fits a laptop and notebooks.' },
                        price: { type: 'number', minimum: 0, maximum: 1000000, example: 349 },
                        stockQuantity: { type: 'integer', minimum: 0, maximum: 1000000, example: 25 },
                        category: { $ref: '#/components/schemas/ObjectId' },
                        imageUrl: { type: 'string', maxLength: 500, description: 'Optional. A path starting with / or an http(s) URL.', example: '/img/campus_tote_bag.png' },
                    },
                },
                ProductMultipartInput: {
                    allOf: [
                        { $ref: '#/components/schemas/ProductInput' },
                        {
                            type: 'object',
                            properties: {
                                image: { type: 'string', format: 'binary', description: 'Optional JPG, PNG or WEBP, max 5MB. Uploaded to Cloudinary.' },
                            },
                        },
                    ],
                },
                Review: {
                    type: 'object',
                    properties: {
                        _id: { $ref: '#/components/schemas/ObjectId' },
                        product: {
                            type: 'object',
                            properties: {
                                _id: { $ref: '#/components/schemas/ObjectId' },
                                productName: { type: 'string', example: 'Campus Tote Bag' },
                                imageUrl: { type: 'string' },
                            },
                        },
                        user: {
                            type: 'object',
                            properties: {
                                _id: { $ref: '#/components/schemas/ObjectId' },
                                name: { type: 'string', example: 'Juan Dela Cruz' },
                                email: { type: 'string', example: 'student@nu.edu.ph' },
                            },
                        },
                        rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
                        comment: { type: 'string', example: 'Very sturdy tote. It fits my laptop and two notebooks.' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                CartItem: {
                    type: 'object',
                    properties: {
                        product: { $ref: '#/components/schemas/Product' },
                        quantity: { type: 'integer', minimum: 1, example: 2 },
                    },
                },
                Cart: {
                    type: 'object',
                    properties: {
                        _id: { $ref: '#/components/schemas/ObjectId' },
                        user: { $ref: '#/components/schemas/ObjectId' },
                        items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
                        totalPrice: { type: 'number', example: 698 },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                OrderItem: {
                    type: 'object',
                    properties: {
                        product: { $ref: '#/components/schemas/ObjectId' },
                        productName: { type: 'string', example: 'Campus Tote Bag' },
                        quantity: { type: 'integer', example: 2 },
                        priceAtPurchase: { type: 'number', example: 349 },
                    },
                },
                Order: {
                    type: 'object',
                    properties: {
                        _id: { $ref: '#/components/schemas/ObjectId' },
                        user: {
                            type: 'object',
                            properties: {
                                _id: { $ref: '#/components/schemas/ObjectId' },
                                name: { type: 'string', example: 'Juan Dela Cruz' },
                                email: { type: 'string', example: 'student@nu.edu.ph' },
                            },
                        },
                        orderItems: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
                        shippingAddress: { type: 'string', example: 'NU Campus Pickup Counter' },
                        paymentMethod: { type: 'string', enum: ['Cash on Pickup', 'GCash', 'Bank Transfer', 'Maya'], example: 'GCash' },
                        totalPrice: { type: 'number', example: 698 },
                        orderStatus: { type: 'string', enum: ['Pending', 'Confirmed', 'Ready for Claiming', 'Claimed', 'Cancelled'], example: 'Pending' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Login successful.' },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                        data: { $ref: '#/components/schemas/User' },
                    },
                },
                MessageResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Deleted successfully.' },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', example: 'Something went wrong.' },
                    },
                },
                ValidationError: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', example: 'Validation failed. Please review the highlighted fields.' },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    field: { type: 'string', example: 'email' },
                                    message: { type: 'string', example: 'Invalid email address' },
                                },
                            },
                        },
                    },
                },
            },
            responses: {
                ValidationFailed: {
                    description: 'Validation failed (bad body, query or id)',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } },
                },
                Unauthorized: {
                    description: 'Missing, invalid or expired token',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: errorExample('Authentication required. Please log in.'),
                        },
                    },
                },
                Forbidden: {
                    description: 'Logged in, but the role or ownership check failed',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: errorExample('Access denied. This action requires the Admin role.'),
                        },
                    },
                },
                NotFound: {
                    description: 'The record does not exist',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: errorExample('Record not found.'),
                        },
                    },
                },
                ServerError: {
                    description: 'Unexpected server error',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: errorExample('An unexpected server error occurred.'),
                        },
                    },
                },
            },
        },
        paths: {
            '/health': {
                get: {
                    tags: ['Health'],
                    summary: 'Check that the API and database are up',
                    responses: {
                        200: {
                            description: 'API is running',
                            content: {
                                'application/json': {
                                    example: { success: true, message: 'Bulldogs Exchange API is running.', database: 'connected' },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    // Absolute path so the docs build no matter which folder the server is started from.
    // The glob library only understands forward slashes, so normalise Windows separators.
    apis: [path.join(__dirname, '../Routes/*.js').replace(/\\/g, '/')],
};

const swaggerSpec = swaggerJsdoc(options);

function swaggerDocs(app) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'Bulldogs Exchange API Docs',
        swaggerOptions: { persistAuthorization: true },
    }));

    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
}

module.exports = { swaggerDocs, swaggerSpec };
