const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || decoded.userId !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.userId = 'admin';
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
