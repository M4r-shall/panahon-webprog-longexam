const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
    address: { type: String }
}, { timestamps: true });

// Index for login queries
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
