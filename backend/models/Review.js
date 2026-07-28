const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  reviewer: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'reviewerModel' },
  reviewerModel: { type: String, required: true, enum: ['User', 'Rider'] },
  reviewerRole: { type: String, required: true, enum: ['passenger', 'rider'] },
  target: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'targetModel' },
  targetModel: { type: String, required: true, enum: ['User', 'Rider'] },
  targetRole: { type: String, required: true, enum: ['passenger', 'rider'] },
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

reviewSchema.index({ reviewer: 1, rideId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
