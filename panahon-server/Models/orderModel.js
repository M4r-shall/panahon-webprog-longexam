const mongoose = require('mongoose');
const { ORDER_STATUSES, PAYMENT_METHODS } = require('../config/constants');

const orderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true }, // Snapshot in case the product is later renamed/removed
    quantity: { type: Number, required: true },
    priceAtPurchase: { type: Number, required: true } // Preserves historical price
});

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderItems: [orderItemSchema], // Embedded array
    shippingAddress: { type: String, required: true, default: 'NU Campus Pickup Counter' },
    paymentMethod: { type: String, required: true, enum: PAYMENT_METHODS, default: 'Cash on Pickup' },
    totalPrice: { type: Number, required: true },
    orderStatus: { type: String, enum: ORDER_STATUSES, default: 'Pending' }
}, { timestamps: true });

// Index to quickly fetch a user's order history
orderSchema.index({ user: 1 });

module.exports = mongoose.model('Order', orderSchema);
