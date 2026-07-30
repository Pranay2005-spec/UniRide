const mongoose = require('mongoose');

function generateRideCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'RIDE-';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const routeStopSchema = new mongoose.Schema({
  college: {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    short: { type: String, required: true },
    lat: Number,
    lng: Number,
  },
  order: { type: Number, required: true },
}, { _id: false });

const rideSchema = new mongoose.Schema({
  rideCode: { type: String, unique: true },
  driver: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'driverModel' },
  driverModel: { type: String, required: true, enum: ['User', 'Rider'] },
  pickup: { type: String },
  destination: { type: String },
  route: [routeStopSchema],
  date: { type: Date, required: true },
  time: { type: String, required: true },
  seats: { type: Number, min: 1, default: 3 },
  price: { type: Number, min: 0, default: 0 },
  paymentMethod: { type: String, enum: ['cash', 'online'], default: 'cash' },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
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
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    verified: { type: Boolean, default: false },
  }],
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number },
  },
}, { timestamps: true });

rideSchema.statics.generateUniqueCode = async function () {
  let code;
  let exists = true;
  while (exists) {
    code = generateRideCode();
    exists = await this.findOne({ rideCode: code });
  }
  return code;
};

module.exports = mongoose.model('Ride', rideSchema);
