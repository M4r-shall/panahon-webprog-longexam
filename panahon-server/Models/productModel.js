const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    stockQuantity: { type: Number, required: true, default: 0, min: 0 },
    imageUrl: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Optimization: Indexes for frequent searches by name and category filtering
productSchema.index({ productName: 'text' });
productSchema.index({ category: 1 });

module.exports = mongoose.model('Product', productSchema);
