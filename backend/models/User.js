const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  password: String,
  role: { type: String, enum: ['passenger', 'rider'], default: 'passenger' },
  name: String,
  collegeName: String,
  rollNumber: String,
  email: String,
  profilePicture: String,
  studentIdCard: String,
  isVerified: { type: Boolean, default: false },
  ridesOffered: { type: Number, default: 0 },
  ridesJoined: { type: Number, default: 0 },
  moneySaved: { type: Number, default: 0 },
}, { timestamps: true });

userSchema.index({ phone: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
