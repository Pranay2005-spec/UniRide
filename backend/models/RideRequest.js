const mongoose = require('mongoose');

const rideRequestSchema = new mongoose.Schema({
  passenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  college: {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    short: { type: String, required: true },
    lat: Number,
    lng: Number,
  },
  pickup: {
    address: { type: String, required: true },
    position: { type: [Number], required: true },
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'cancelled'],
    default: 'pending',
  },
  matchedRide: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' },
  price: { type: Number, default: 30 },
  paymentMethod: { type: String, enum: ['cash', 'online'], default: 'cash' },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('RideRequest', rideRequestSchema);
