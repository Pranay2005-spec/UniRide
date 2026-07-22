const mongoose = require('mongoose');

const riderSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  profilePicture: String,
  riderDocs: [{
    docType: { type: String, enum: ['aadhaar', 'pan', 'driving_license', 'other'] },
    docNumber: String,
    filePath: String,
  }],
  verificationStatus: { type: String, enum: ['not_submitted', 'pending', 'verified', 'rejected'], default: 'not_submitted' },
  ridesOffered: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Rider', riderSchema);
