const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    priceAtPurchase: { type: Number, required: true } // Preserves historical price
});

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderItems: [orderItemSchema], // Embedded array
    shippingAddress: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    totalPrice: { type: Number, required: true },
    orderStatus: { type: String, enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending' }
}, { timestamps: true });

// Index to quickly fetch a user's order history
orderSchema.index({ user: 1 });

module.exports = mongoose.model('Order', orderSchema);
