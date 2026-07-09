const mongoose = require('mongoose');

const routeStopSchema = new mongoose.Schema({
  college: {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    short: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  order: { type: Number, required: true },
}, { _id: false });

const rideSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pickup: { type: String },
  destination: { type: String },
  route: [routeStopSchema],
  date: { type: Date, required: true },
  time: { type: String, required: true },
  seats: { type: Number, min: 1, default: 3 },
  price: { type: Number, min: 0, default: 0 },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
  },
  active: { type: Boolean, default: false },
  currentStop: { type: Number, default: 0 },
  passengers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
    otp: { type: String },
  }],
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number },
  },
}, { timestamps: true });

module.exports = mongoose.model('Ride', rideSchema);
