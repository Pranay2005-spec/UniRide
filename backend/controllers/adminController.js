const User = require('../models/User');
const Rider = require('../models/Rider');
const Ride = require('../models/Ride');
const RideRequest = require('../models/RideRequest');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');

exports.adminLogin = async (req, res) => {
  try {
    const { adminId, password } = req.body;
    const validAdminId = process.env.ADMIN_ID || 'admin';
    const validPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (!adminId || !password) {
      return res.status(400).json({ error: 'Admin ID and password required' });
    }

    if (adminId !== validAdminId || password !== validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: { id: 'admin', adminId, role: 'admin' },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPendingStudents = async (req, res) => {
  try {
    const students = await User.find({
      role: 'passenger',
      studentVerificationStatus: 'pending',
    }).select('-password');
    res.json({ success: true, students });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPendingRiders = async (req, res) => {
  try {
    const riders = await Rider.find({
      verificationStatus: 'pending',
    });
    res.json({ success: true, riders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.verifyStudent = async (req, res) => {
  try {
    const { userId, action } = req.body;
    if (!userId || !['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'userId and action (approved/rejected) required' });
    }

    const student = await User.findById(userId);
    if (!student) return res.status(400).json({ error: 'User not found' });

    student.studentVerificationStatus = action === 'approved' ? 'verified' : 'rejected';
    student.isVerified = action === 'approved';
    await student.save();

    res.json({ success: true, message: `Student ${action}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.verifyRider = async (req, res) => {
  try {
    const { userId, action } = req.body;
    if (!userId || !['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'userId and action (approved/rejected) required' });
    }

    const rider = await Rider.findById(userId);
    if (!rider) return res.status(400).json({ error: 'Rider not found' });

    rider.verificationStatus = action === 'approved' ? 'verified' : 'rejected';
    await rider.save();

    res.json({ success: true, message: `Rider ${action}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('userId', 'name phone')
      .populate('targetUserId', 'name phone')
      .populate('rideId')
      .sort({ createdAt: -1 });
    res.json({ success: true, complaints });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [totalUsers, totalRiders, todayRides, activeRides, pendingRiders, pendingStudents] = await Promise.all([
      User.countDocuments({ role: 'passenger' }),
      Rider.countDocuments(),
      Ride.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      Ride.countDocuments({ status: 'active', active: true }),
      Rider.countDocuments({ verificationStatus: 'pending' }),
      User.countDocuments({ studentVerificationStatus: 'pending' }),
    ]);

    res.json({
      success: true,
      stats: { totalUsers, totalRiders, todayRides, activeRides, pendingRiders, pendingStudents },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLiveRides = async (req, res) => {
  try {
    const rides = await Ride.find()
      .populate('driver', 'name phone profilePicture collegeName vehicleModel')
      .populate('passengers.user', 'name collegeName profilePicture')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, rides });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password -__v').sort({ createdAt: -1 });
    const riders = await Rider.find().select('-password -__v').sort({ createdAt: -1 });
    res.json({ success: true, users, riders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.toggleBlock = async (req, res) => {
  try {
    const { id, model, blocked } = req.body;
    if (!id || !model || typeof blocked !== 'boolean') {
      return res.status(400).json({ error: 'id, model and blocked (boolean) required' });
    }
    if (model === 'Rider') {
      await Rider.findByIdAndUpdate(id, { blocked });
    } else {
      await User.findByIdAndUpdate(id, { blocked });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const daysAgo7 = new Date(now);
    daysAgo7.setDate(now.getDate() - 6);
    daysAgo7.setHours(0, 0, 0, 0);

    const [ridesPerDay, topColleges, totals] = await Promise.all([
      Ride.aggregate([
        { $match: { createdAt: { $gte: daysAgo7 } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      RideRequest.aggregate([
        { $match: { status: { $in: ['accepted', 'cancelled'] } } },
        { $group: { _id: '$college.short', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
      Ride.aggregate([
        { $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          } },
      ]),
    ]);

    res.json({
      success: true,
      analytics: {
        ridesPerDay,
        topColleges: topColleges.filter(c => c._id),
        totals: totals[0] || { total: 0, completed: 0, cancelled: 0, active: 0 },
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.broadcastNotification = async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const notification = await Notification.create({ title, message });

    if (global.io) {
      global.io.emit('broadcast', {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt,
      });
    }

    res.status(201).json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBroadcasts = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.resolveComplaint = async (req, res) => {
  try {
    const { complaintId, action } = req.body;
    if (!complaintId || !['resolved', 'dismissed'].includes(action)) {
      return res.status(400).json({ error: 'complaintId and action (resolved/dismissed) required' });
    }

    const complaint = await Complaint.findByIdAndUpdate(
      complaintId,
      { status: action },
      { new: true }
    );
    if (!complaint) return res.status(400).json({ error: 'Complaint not found' });

    res.json({ success: true, message: `Complaint ${action}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
