const HttpStatus = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
};

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Ready for Claiming', 'Claimed', 'Cancelled'];

const PAYMENT_METHODS = ['Cash on Pickup', 'GCash', 'Bank Transfer', 'Maya'];

// Upper bounds on free-text fields, so a single request cannot store megabytes.
const FIELD_LIMITS = {
    name: 80,
    email: 120,
    password: 72, // bcrypt ignores anything past 72 bytes
    address: 200,
    productName: 120,
    description: 2000,
    categoryName: 60,
    comment: 500,
    imageUrl: 500,
    shippingAddress: 200,
};

// Largest page a client may request from a list endpoint.
const MAX_PAGE_SIZE = 50;

module.exports = { HttpStatus, ORDER_STATUSES, PAYMENT_METHODS, FIELD_LIMITS, MAX_PAGE_SIZE };
