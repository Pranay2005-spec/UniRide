const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SavedRoute = require('../models/SavedRoute');

router.get('/', auth, async (req, res) => {
  try {
    const routes = await SavedRoute.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, routes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { pickup, college, destination } = req.body;
    if (!pickup) return res.status(400).json({ error: 'Pickup is required' });

    const count = await SavedRoute.countDocuments({ user: req.userId });
    if (count >= 5) {
      return res.status(400).json({ error: 'Maximum 5 saved routes allowed' });
    }

    const existing = await SavedRoute.findOne({
      user: req.userId,
      'pickup.address': pickup.address,
      ...(college?.id ? { 'college.id': college.id } : { 'destination.address': destination?.address }),
    });

    if (existing) {
      return res.status(400).json({ error: 'Route already saved' });
    }

    const route = await SavedRoute.create({ user: req.userId, pickup, college, destination });
    res.status(201).json({ success: true, route });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const route = await SavedRoute.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!route) return res.status(404).json({ error: 'Route not found' });
    res.json({ success: true, message: 'Route removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
