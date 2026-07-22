const User = require('../models/User');
const Rider = require('../models/Rider');
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
    let user;
    if (req.userRole === 'rider') {
      user = await Rider.findById(req.userId).select('-password -__v');
    } else {
      user = await User.findById(req.userId).select('-__v');
    }
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

    let user;
    if (req.userRole === 'rider') {
      user = await Rider.findByIdAndUpdate(req.userId, updates, { new: true });
    } else {
      user = await User.findByIdAndUpdate(req.userId, updates, { new: true });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    if (req.userRole === 'rider') {
      await Rider.findByIdAndDelete(req.userId);
    } else {
      await User.findByIdAndDelete(req.userId);
    }
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.verifyRiderSignupOtp = async (req, res) => {
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

    res.json({ success: true, message: 'Phone verified', phone });
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
      isVerified: false,
      studentVerificationStatus: 'pending',
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
    const { phone, password, docType, docNumber } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await Rider.findOne({ phone });
    if (existing) {
      return res.status(400).json({ error: 'Rider account already exists with this phone. Please login.' });
    }

    const riderDoc = {};
    if (docType) riderDoc.docType = docType;
    if (docNumber) riderDoc.docNumber = docNumber;
    if (req.files?.riderDoc) riderDoc.filePath = req.files.riderDoc[0].path;

    const hashedPassword = await bcrypt.hash(password, 10);
    const rider = await Rider.create({
      phone,
      password: hashedPassword,
      riderDocs: Object.keys(riderDoc).length > 0 ? [riderDoc] : [],
      verificationStatus: riderDoc.filePath ? 'pending' : 'not_submitted',
    });

    const token = jwt.sign({ userId: rider._id, role: 'rider' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: rider._id,
        phone: rider.phone,
        name: rider.name,
        role: 'rider',
        riderVerificationStatus: rider.verificationStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.applyRider = async (req, res) => {
  try {
    const userId = req.userId;
    const { password, docType, docNumber } = req.body;

    const currentUser = await User.findById(userId);
    if (!currentUser) return res.status(400).json({ error: 'User not found' });

    const existingRider = await Rider.findOne({ phone: currentUser.phone });
    if (existingRider) {
      return res.json({
        success: true,
        alreadyApplied: true,
        status: existingRider.verificationStatus,
        message: `Rider application already submitted. Status: ${existingRider.verificationStatus}`,
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!docNumber) return res.status(400).json({ error: 'Driving license number required' });
    if (!req.files?.riderDoc) return res.status(400).json({ error: 'Driving license image required' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const rider = await Rider.create({
      phone: currentUser.phone,
      password: hashedPassword,
      riderDocs: [{
        docType: docType || 'driving_license',
        docNumber,
        filePath: req.files.riderDoc[0].path,
      }],
      verificationStatus: 'pending',
    });

    res.json({
      success: true,
      message: 'Rider application submitted for admin approval',
      status: 'pending',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRiderApplicationStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const currentUser = await User.findById(userId);
    if (!currentUser) return res.status(400).json({ error: 'User not found' });

    const rider = await Rider.findOne({ phone: currentUser.phone }).select('verificationStatus riderDocs');

    if (!rider) {
      return res.json({ success: true, applied: false });
    }

    res.json({
      success: true,
      applied: true,
      status: rider.verificationStatus,
      docs: rider.riderDocs,
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

    const rider = await Rider.findOne({ phone });
    if (!rider) {
      return res.status(400).json({ error: 'No rider account found with this phone. Please set up one first.' });
    }

    const valid = await bcrypt.compare(password, rider.password);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    await Otp.deleteMany({ phone });

    const code = generateOTP();
    await Otp.create({ phone, code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) });

    console.log(`Rider OTP for ${phone}: ${code}`);

    res.json({ success: true, needOtp: true, phone });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.verifyRiderOtp = async (req, res) => {
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

    const rider = await Rider.findOne({ phone });
    if (!rider) return res.status(400).json({ error: 'Rider account not found' });

    const token = jwt.sign({ userId: rider._id, role: 'rider' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: rider._id,
        phone: rider.phone,
        name: rider.name,
        role: 'rider',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
