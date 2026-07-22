const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);
