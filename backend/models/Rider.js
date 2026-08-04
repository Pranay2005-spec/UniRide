const mongoose = require('mongoose');

const riderSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  profilePicture: String,
  licenseNumber: String,
  licensePhoto: String,
  upiId: String,
  verificationStatus: { type: String, enum: ['not_submitted', 'pending', 'verified', 'rejected'], default: 'not_submitted' },
  ridesOffered: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  blocked: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Rider', riderSchema);
