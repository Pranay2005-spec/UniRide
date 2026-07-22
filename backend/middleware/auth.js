const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Rider = require('../models/Rider');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user = await User.findById(decoded.userId);
    let role = 'passenger';

    if (!user) {
      user = await Rider.findById(decoded.userId);
      role = 'rider';
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.userId = user._id;
    req.userRole = role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
