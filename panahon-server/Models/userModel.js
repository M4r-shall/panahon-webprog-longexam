const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Customer', 'Admin'], default: 'Customer' },
    address: { type: String },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Never expose the password hash to any client
userSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        delete returnedObject.password;
        return returnedObject;
    }
});

module.exports = mongoose.model('User', userSchema);
