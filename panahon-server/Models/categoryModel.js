const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    categoryName: { type: String, required: true, unique: true },
    description: { type: String }
}, { timestamps: true });

// Index for frequent category name lookups
categorySchema.index({ categoryName: 1 });

module.exports = mongoose.model('Category', categorySchema);
