const mongoose = require('mongoose');

const savedRouteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pickup: {
    position: { type: [Number], required: true },
    address: { type: String, required: true },
  },
  college: {
    id: String,
    name: String,
    short: String,
    lat: Number,
    lng: Number,
  },
  destination: {
    position: [Number],
    address: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('SavedRoute', savedRouteSchema);
