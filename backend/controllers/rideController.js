const Ride = require('../models/Ride');
const User = require('../models/User');

exports.createRide = async (req, res) => {
  try {
    const { pickup, destination, date, time, seats, price } = req.body;
    const ride = await Ride.create({
      driver: req.userId,
      pickup,
      destination,
      date,
      time,
      seats,
      price,
    });

    await User.findByIdAndUpdate(req.userId, { $inc: { ridesOffered: 1 } });

    res.status(201).json({ success: true, ride });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.searchRides = async (req, res) => {
  try {
    const { pickup, destination, date } = req.query;

    const filter = { status: 'active', driver: { $ne: req.userId } };
    if (pickup) filter.pickup = { $regex: pickup, $options: 'i' };
    if (destination) filter.destination = { $regex: destination, $options: 'i' };
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    const rides = await Ride.find(filter)
      .populate('driver', 'name collegeName profilePicture')
      .sort({ date: 1, time: 1 });

    const available = rides.filter(r => r.seats > r.passengers.length);

    res.json({ success: true, rides: available });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.joinRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.status !== 'active') return res.status(400).json({ error: 'Ride not active' });
    if (ride.passengers.length >= ride.seats) return res.status(400).json({ error: 'No seats available' });
    if (ride.driver.toString() === req.userId) return res.status(400).json({ error: 'Cannot join your own ride' });

    const alreadyJoined = ride.passengers.find(p => p.user.toString() === req.userId);
    if (alreadyJoined) return res.status(400).json({ error: 'Already joined this ride' });

    ride.passengers.push({ user: req.userId });
    await ride.save();

    await User.findByIdAndUpdate(req.userId, { $inc: { ridesJoined: 1, moneySaved: ride.price } });

    res.json({ success: true, ride });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyOfferedRides = async (req, res) => {
  try {
    const rides = await Ride.find({ driver: req.userId })
      .populate('passengers.user', 'name collegeName')
      .sort({ createdAt: -1 });
    res.json({ success: true, rides });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyJoinedRides = async (req, res) => {
  try {
    const rides = await Ride.find({
      'passengers.user': req.userId,
      driver: { $ne: req.userId },
    }).populate('driver', 'name collegeName profilePicture')
      .sort({ createdAt: -1 });
    res.json({ success: true, rides });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
