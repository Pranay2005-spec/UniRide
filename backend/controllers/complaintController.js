const Complaint = require('../models/Complaint');
const Ride = require('../models/Ride');

exports.createComplaint = async (req, res) => {
  try {
    const { targetUserId, rideId, rideCode, subject, description } = req.body;
    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description required' });
    }

    let resolvedRideId = rideId;
    let resolvedTargetUserId = targetUserId;

    if (rideCode && !resolvedRideId) {
      const ride = await Ride.findOne({ rideCode });
      if (ride) {
        resolvedRideId = ride._id;
        const isDriver = ride.driver.toString() === req.userId.toString();
        if (isDriver && ride.passengers.length > 0) {
          resolvedTargetUserId = ride.passengers[0].user;
        } else if (!isDriver) {
          resolvedTargetUserId = ride.driver;
        }
      }
    }

    const complaint = await Complaint.create({
      userId: req.userId,
      targetUserId: resolvedTargetUserId,
      rideId: resolvedRideId,
      rideCode,
      subject,
      description,
    });

    res.json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ userId: req.userId })
      .populate('targetUserId', 'name phone')
      .populate('rideId')
      .sort({ createdAt: -1 });
    res.json({ success: true, complaints });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
