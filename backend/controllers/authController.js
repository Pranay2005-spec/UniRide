const User = require('../models/User');
const Otp = require('../models/Otp');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    await Otp.deleteMany({ phone });

    const code = generateOTP();
    await Otp.create({ phone, code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) });

    console.log(`OTP for ${phone}: ${code}`);

    res.json({ success: true, message: 'OTP sent successfully', otp: code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'Phone and code required' });

    const otp = await Otp.findOne({ phone, code });
    if (!otp) return res.status(400).json({ error: 'Invalid OTP' });

    if (otp.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otp._id });
      return res.status(400).json({ error: 'OTP expired' });
    }

    await Otp.deleteOne({ _id: otp._id });

    let user = await User.findOne({ phone, role: 'passenger' });
    let isNewUser = false;

    if (!user) {
      user = await User.create({ phone, role: 'passenger' });
      isNewUser = true;
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      isNewUser,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.completeProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, collegeName, rollNumber, email } = req.body;

    const update = {};
    if (name) update.name = name;
    if (collegeName) update.collegeName = collegeName;
    if (rollNumber) update.rollNumber = rollNumber;
    if (email) update.email = email;
    if (req.files?.profilePicture) update.profilePicture = req.files.profilePicture[0].path;
    if (req.files?.studentIdCard) update.studentIdCard = req.files.studentIdCard[0].path;

    const user = await User.findByIdAndUpdate(userId, update, { new: true });

    res.json({
      success: true,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        collegeName: user.collegeName,
        rollNumber: user.rollNumber,
        email: user.email,
        profilePicture: user.profilePicture,
        studentIdCard: user.studentIdCard,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-__v');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const updates = {};
    const allowed = ['name', 'collegeName', 'rollNumber', 'email'];
    allowed.forEach(field => {
      if (req.body[field]) updates[field] = req.body[field];
    });
    if (req.files?.profilePicture) updates.profilePicture = req.files.profilePicture[0].path;

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.userId);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.verifyCollege = async (req, res) => {
  try {
    const userId = req.userId;
    const { collegeName, rollNumber, email } = req.body;

    if (!collegeName || !rollNumber || !email) {
      return res.status(400).json({ error: 'College name, roll number, and email are required' });
    }

    const update = {
      collegeName,
      rollNumber,
      email,
      isVerified: true,
    };

    if (req.files?.studentIdCard) {
      update.studentIdCard = req.files.studentIdCard[0].path;
    }

    const user = await User.findByIdAndUpdate(userId, update, { new: true });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.setupRiderAccount = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ phone, role: 'rider' });
    if (existing) {
      return res.status(400).json({ error: 'Rider account already exists with this phone. Please login.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const rider = await User.create({
      phone,
      password: hashedPassword,
      role: 'rider',
    });

    const token = jwt.sign({ userId: rider._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: rider._id,
        phone: rider.phone,
        name: rider.name,
        role: rider.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.loginRider = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password required' });
    }

    const rider = await User.findOne({ phone, role: 'rider' });
    if (!rider) {
      return res.status(400).json({ error: 'No rider account found with this phone. Please set up one first.' });
    }

    const valid = await bcrypt.compare(password, rider.password);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ userId: rider._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: rider._id,
        phone: rider.phone,
        name: rider.name,
        role: rider.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
