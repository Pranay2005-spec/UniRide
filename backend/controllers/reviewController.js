const mongoose = require('mongoose');
const Review = require('../models/Review');
const Rider = require('../models/Rider');
const User = require('../models/User');

exports.createReview = async (req, res) => {
  try {
    const { targetId, targetRole, rideId, rating, comment } = req.body;

    if (!targetId || !targetRole || !rideId || !rating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const reviewerId = req.userId;
    const reviewerRole = req.userRole;

    if (targetRole === reviewerRole) {
      return res.status(400).json({ error: 'Cannot review yourself' });
    }

    const reviewerModel = reviewerRole === 'rider' ? 'Rider' : 'User';
    const targetModel = targetRole === 'rider' ? 'Rider' : 'User';

    const existing = await Review.findOne({ reviewer: reviewerId, rideId });
    if (existing) {
      return res.status(400).json({ error: 'You already reviewed this ride' });
    }

    const review = await Review.create({
      reviewer: reviewerId,
      reviewerModel,
      reviewerRole,
      target: targetId,
      targetModel,
      targetRole,
      rideId,
      rating,
      comment: comment || '',
    });

    // Update average rating on the target
    const stats = await Review.aggregate([
      { $match: { target: review.target, targetModel: review.targetModel } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    const avg = stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : rating;
    const count = stats.length > 0 ? stats[0].count : 1;

    if (targetRole === 'rider') {
      await Rider.findByIdAndUpdate(targetId, { avgRating: avg, totalReviews: count });
    } else {
      await User.findByIdAndUpdate(targetId, { avgRating: avg, totalReviews: count });
    }

    res.status(201).json({ success: true, review });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getReviewsForTarget = async (req, res) => {
  try {
    const { targetId } = req.params;
    const { role } = req.query;

    const targetModel = role === 'rider' ? 'Rider' : 'User';

    const reviews = await Review.find({ target: targetId, targetModel })
      .populate({ path: 'reviewer', select: 'name profilePicture' })
      .sort({ createdAt: -1 });

    const stats = await Review.aggregate([
      { $match: { target: new mongoose.Types.ObjectId(targetId), targetModel } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      reviews,
      avgRating: stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0,
      totalReviews: stats.length > 0 ? stats[0].count : 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPendingReviews = async (req, res) => {
  try {
    const Ride = require('../models/Ride');
    const reviewerId = req.userId;
    const reviewerRole = req.userRole;

    // Find completed rides where the user hasn't left a review yet
    const rideFilter = reviewerRole === 'rider'
      ? { driver: reviewerId, status: 'completed' }
      : { 'passengers.user': reviewerId, status: 'completed', driver: { $ne: reviewerId } };

    const completedRides = await Ride.find(rideFilter).lean();

    const reviewedRides = await Review.find({ reviewer: reviewerId }).distinct('rideId');
    const reviewedSet = new Set(reviewedRides.map(r => r.toString()));

    const pending = completedRides.filter(r => !reviewedSet.has(r._id.toString()));

    // Attach target info
    const result = await Promise.all(pending.map(async (ride) => {
      const targetId = reviewerRole === 'rider'
        ? (ride.passengers[0]?.user || null)
        : ride.driver;

      if (!targetId) return null;

      const targetModel = reviewerRole === 'rider' ? 'User' : 'Rider';
      const target = reviewerRole === 'rider'
        ? await User.findById(targetId).select('name profilePicture')
        : await Rider.findById(targetId).select('name profilePicture');

      return {
        rideId: ride._id,
        target,
        targetRole: reviewerRole === 'rider' ? 'passenger' : 'rider',
        ride: { pickup: ride.pickup, date: ride.date, time: ride.time },
      };
    }));

    res.json({ success: true, pending: result.filter(Boolean) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
