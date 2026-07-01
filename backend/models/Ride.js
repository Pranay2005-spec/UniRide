const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pickup: { type: String, required: true },
  destination: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  seats: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
  },
  passengers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Ride', rideSchema);
