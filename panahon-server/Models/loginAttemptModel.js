const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
  username: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lockUntil: { type: Date }
});

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
