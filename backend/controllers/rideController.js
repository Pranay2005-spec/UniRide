const Ride = require('../models/Ride');
const User = require('../models/User');
const Rider = require('../models/Rider');
const RideRequest = require('../models/RideRequest');

exports.createRide = async (req, res) => {
  try {
    const { pickup, destination, route, date, time, seats, price } = req.body;
    const ride = await Ride.create({
      driver: req.userId,
      pickup,
      destination,
      route: route || [],
      date,
      time,
      seats,
      price,
    });

    if (req.userRole === 'rider') {
      await Rider.findByIdAndUpdate(req.userId, { $inc: { ridesOffered: 1 } });
    } else {
      await User.findByIdAndUpdate(req.userId, { $inc: { ridesOffered: 1 } });
    }

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
    if (destination) {
      filter.$or = [
        { destination: { $regex: destination, $options: 'i' } },
        { 'route.college.short': { $regex: destination, $options: 'i' } },
        { 'route.college.name': { $regex: destination, $options: 'i' } },
      ];
    }
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

exports.searchRidesByCollege = async (req, res) => {
  try {
    const { collegeId, collegeName } = req.query;

    const filter = {
      status: 'active',
      active: true,
      driver: { $ne: req.userId },
      'route.college.id': Number(collegeId),
    };

    const rides = await Ride.find(filter)
      .populate('driver', 'name collegeName profilePicture phone')
      .sort({ 'route.order': 1 });

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
    if (ride.driver.toString() === req.userId.toString()) return res.status(400).json({ error: 'Cannot join your own ride' });

    const alreadyJoined = ride.passengers.find(p => p.user.toString() === req.userId.toString());
    if (alreadyJoined) return res.status(400).json({ error: 'Already joined this ride' });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    ride.passengers.push({ user: req.userId, otp });
    await ride.save();

    await User.findByIdAndUpdate(req.userId, { $inc: { ridesJoined: 1, moneySaved: ride.price } });

    res.json({ success: true, otp, ride });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.startRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.driver.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Not your ride' });

    ride.active = true;
    ride.currentStop = 1;
    await ride.save();

    res.json({ success: true, ride });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateStop = async (req, res) => {
  try {
    const { stop } = req.body;
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.driver.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Not your ride' });

    ride.currentStop = stop;
    if (stop >= ride.route.length) {
      ride.status = 'completed';
      ride.active = false;
    }
    await ride.save();

    res.json({ success: true, ride });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.announceRide = async (req, res) => {
  try {
    const { collegeId, college } = req.body;

    const ride = await Ride.create({
      driver: req.userId,
      pickup: 'Current Location',
      route: [{
        college: {
          id: collegeId,
          name: college.name,
          short: college.short,
          lat: college.lat,
          lng: college.lng,
        },
        order: 0,
      }],
      date: new Date(),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      seats: 3,
      price: 0,
      active: true,
      currentStop: 0,
    });

    res.status(201).json({ success: true, ride });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPassengers = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('passengers.user', 'name collegeName phone profilePicture');
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.driver.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Not your ride' });

    res.json({ success: true, passengers: ride.passengers });
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

exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('driver', 'name collegeName profilePicture')
      .populate('passengers.user', 'name collegeName profilePicture');
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    const isDriver = ride.driver._id.toString() === req.userId.toString();
    const isPassenger = ride.passengers.some(p => p.user._id.toString() === req.userId.toString());
    if (!isDriver && !isPassenger) return res.status(403).json({ error: 'Not your ride' });
    res.json({ success: true, ride });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.driver.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Not your ride' });
    ride.currentLocation = { lat, lng };
    await ride.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Passenger updates their location in the ride
exports.updatePassengerLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    const passenger = ride.passengers.find(p => p.user.toString() === req.userId.toString());
    if (!passenger) return res.status(403).json({ error: 'You are not a passenger in this ride' });

    passenger.location = { lat, lng };
    await ride.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Rider verifies passenger OTP when within 10m radius
exports.verifyPassengerOtp = async (req, res) => {
  try {
    const { passengerId, otp } = req.body;
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.driver.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Not your ride' });

    const passenger = ride.passengers.find(
      p => p.user.toString() === passengerId
    );
    if (!passenger) return res.status(404).json({ error: 'Passenger not found in this ride' });

    if (passenger.verified) return res.status(400).json({ error: 'Passenger already verified' });

    if (passenger.otp !== otp) return res.status(400).json({ error: 'Incorrect OTP' });

    // Check proximity (10 meters)
    if (ride.currentLocation && passenger.location) {
      const R = 6371000;
      const dLat = (passenger.location.lat - ride.currentLocation.lat) * Math.PI / 180;
      const dLng = (passenger.location.lng - ride.currentLocation.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 +
                Math.cos(ride.currentLocation.lat * Math.PI / 180) *
                Math.cos(passenger.location.lat * Math.PI / 180) *
                Math.sin(dLng/2)**2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      if (dist > 10) {
        return res.status(400).json({ error: `Too far (${Math.round(dist)}m). Must be within 10m.` });
      }
    }

    passenger.verified = true;
    await ride.save();

    // Notify the passenger via socket that they've been verified
    if (global.io) {
      global.io.to(`user:${passengerId}`).emit('passengerVerified', {
        rideId: ride._id,
      });
    }

    res.json({ success: true, message: 'Passenger verified' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deactivateRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.driver.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Not your ride' });
    ride.active = false;
    ride.status = 'cancelled';
    await ride.save();

    if (global.io) {
      global.io.to(`ride:${ride._id}`).emit('rideDeactivated', {
        rideId: ride._id,
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyJoinedRides = async (req, res) => {
  try {
    const rides = await Ride.find({
      'passengers.user': req.userId,
      driver: { $ne: req.userId },
    }).populate('driver', 'name collegeName profilePicture phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, rides });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Passenger requests a ride (creates or reuses a pending request)
exports.requestRide = async (req, res) => {
  try {
    const { college, pickup } = req.body;

    if (!college || !college.id) {
      return res.status(400).json({ error: 'College information is required' });
    }
    if (!pickup || !pickup.address || !pickup.position) {
      return res.status(400).json({ error: 'Pickup location is required' });
    }

    // Cancel any existing pending or accepted requests for this passenger
    await RideRequest.updateMany(
      { passenger: req.userId, status: { $in: ['pending', 'accepted'] } },
      { status: 'cancelled' }
    );

    const request = await RideRequest.create({
      passenger: req.userId,
      college,
      pickup,
    });

    res.status(201).json({ success: true, request });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Check if the current passenger got matched
exports.checkMatch = async (req, res) => {
  try {
    const request = await RideRequest.findOne({
      passenger: req.userId,
      status: 'accepted',
    }).populate({
      path: 'matchedRide',
      populate: { path: 'driver', select: 'name collegeName profilePicture phone' },
    });

    if (!request) {
      return res.json({ success: true, matched: false });
    }

    const ride = request.matchedRide;
    if (!ride || !ride.active) {
      if (ride) {
        request.status = 'cancelled';
        await request.save();
      }
      return res.json({ success: true, matched: false });
    }

    const otpEntry = ride.passengers.find(
      p => p.user.toString() === req.userId.toString()
    );

    res.json({
      success: true,
      matched: true,
      ride: {
        _id: ride._id,
        driver: ride.driver,
        currentLocation: ride.currentLocation,
        price: ride.price,
      },
      otp: otpEntry?.otp || null,
      verified: otpEntry?.verified || false,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Rider sees waiting passengers for a college (only recent requests)
exports.getWaitingPassengers = async (req, res) => {
  try {
    const { collegeId } = req.query;
    const cutoff = new Date(Date.now() - 30 * 1000);

    // Clean up any stale pending requests older than 30 seconds
    await RideRequest.updateMany(
      { 'college.id': Number(collegeId), status: 'pending', createdAt: { $lt: cutoff } },
      { status: 'cancelled' }
    );

    const requests = await RideRequest.find({
      'college.id': Number(collegeId),
      status: 'pending',
      createdAt: { $gte: cutoff },
    }).populate('passenger', 'name collegeName profilePicture');

    res.json({ success: true, passengers: requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Rider accepts a passenger's request
exports.acceptRequest = async (req, res) => {
  try {
    const request = await RideRequest.findById(req.params.id)
      .populate('passenger', 'name collegeName profilePicture phone');
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already accepted or cancelled' });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const now = new Date();

    const ride = await Ride.create({
      driver: req.userId,
      pickup: request.pickup.address,
      route: [{
        college: request.college,
        order: 0,
      }],
      date: now,
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      seats: 3,
      price: 30,
      active: true,
      currentStop: 0,
      passengers: [{ user: request.passenger._id, otp }],
    });

    request.status = 'accepted';
    request.matchedRide = ride._id;
    await request.save();

    await User.findByIdAndUpdate(request.passenger._id, { $inc: { ridesJoined: 1, moneySaved: 30 } });

    res.json({ success: true, ride: { ...ride.toObject(), driver: req.userId }, otp });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Passenger cancels their ride request
exports.cancelRequest = async (req, res) => {
  try {
    await RideRequest.updateMany(
      { passenger: req.userId, status: 'pending' },
      { status: 'cancelled' }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
