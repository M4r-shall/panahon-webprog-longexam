const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    supplierName: { type: String, required: true, unique: true, trim: true },
    contactPerson: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);
