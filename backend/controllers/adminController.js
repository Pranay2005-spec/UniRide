const User = require('../models/User');
const Rider = require('../models/Rider');
const Complaint = require('../models/Complaint');
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
