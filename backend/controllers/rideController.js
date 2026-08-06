const Ride = require('../models/Ride');
const User = require('../models/User');
const Rider = require('../models/Rider');
const RideRequest = require('../models/RideRequest');

// When a ride ends/cancels, send any of its passengers' requests back to the
// pending pool so OTHER riders can see and accept them again.
async function releasePassengers(ride) {
  const requests = await RideRequest.find({ matchedRide: ride._id, status: 'accepted' });
  for (const request of requests) {
    request.status = 'pending';
    request.matchedRide = null;
    await request.save();
    const populated = await RideRequest.findById(request._id).populate('passenger', 'name collegeName profilePicture');
    if (global.io) {
      global.io.to(`college:${request.college.id}`).emit('newPassenger', populated);
    }
  }
}

exports.createRide = async (req, res) => {
  try {
    const { pickup, destination, route, date, time, seats, price } = req.body;
    const ride = await Ride.create({
      driver: req.userId,
      driverModel: req.userRole === 'rider' ? 'Rider' : 'User',
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
      driverModel: req.userRole === 'rider' ? 'Rider' : 'User',
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

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    if (!['pending', 'paid'].includes(paymentStatus)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    const ride = await Ride.findById(req.params.id)
      .populate('passengers.user', '_id name')
      .populate('driver', '_id name');
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    const isDriver = ride.driver?._id?.toString() === req.userId.toString();
    if (!isDriver) return res.status(403).json({ error: 'Only the rider can confirm payment' });

    ride.paymentStatus = paymentStatus;
    await ride.save();

    await RideRequest.updateOne(
      { matchedRide: ride._id },
      { paymentStatus }
    );

    if (global.io) {
      global.io.to(`ride:${ride._id}`).emit('paymentConfirmed', {
        rideId: ride._id,
        paymentStatus,
        completed: ride.status === 'completed',
        verified: ride.passengers.some(p => p.verified),
        showReview: paymentStatus === 'paid' && ride.status === 'completed' && ride.passengers.some(p => p.verified),
        driver: ride.driver ? { _id: ride.driver._id || ride.driver, name: ride.driver.name } : null,
        passengers: ride.passengers.map(p => ({ _id: p.user?._id || p.user, name: p.user?.name, verified: p.verified })),
      });
    }

    res.json({ success: true, paymentStatus: ride.paymentStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.completeRide = async (req, res) => {
  try {
    // First fetch without populate to get raw driver ObjectId for existing rides
    let rawRide = await Ride.findById(req.params.id);
    if (!rawRide) return res.status(404).json({ error: 'Ride not found' });

    // Existing rides may lack driverModel — detect and set it
    if (!rawRide.driverModel) {
      const driverId = rawRide.driver;
      const rider = await Rider.findById(driverId).select('_id');
      rawRide.driverModel = rider ? 'Rider' : 'User';
      await rawRide.save();
    }

    const ride = await Ride.findById(req.params.id)
      .populate('passengers.user', '_id name')
      .populate('driver', '_id name');

    if (ride.driver._id.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Not your ride' });

    const wasVerified = ride.passengers.some(p => p.verified);

    ride.status = 'completed';
    ride.active = false;
    await ride.save();

    // If no passenger was ever verified, they never actually rode —
    // release them back to the waiting pool so they can find another rider.
    if (!wasVerified) {
      await releasePassengers(ride);
    }

    if (global.io) {
      global.io.to(`ride:${ride._id}`).emit('rideCompleted', {
        rideId: ride._id,
        driver: { _id: ride.driver._id, name: ride.driver.name },
        passengers: ride.passengers.map(p => ({ _id: p.user._id, name: p.user.name, verified: p.verified })),
        verified: wasVerified,
        showReview: wasVerified && (ride.paymentMethod !== 'online' || ride.paymentStatus === 'paid'),
        paymentMethod: ride.paymentMethod,
        paymentStatus: ride.paymentStatus,
      });
    }

    res.json({ success: true, showReview: wasVerified && (ride.paymentMethod !== 'online' || ride.paymentStatus === 'paid'), ride });
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

    // A cancelled ride releases its passengers back to the waiting pool.
    await releasePassengers(ride);

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
      populate: { path: 'driver', select: 'name collegeName profilePicture phone upiId' },
    });

    if (!request) {
      const hasPending = await RideRequest.exists({ passenger: req.userId, status: 'pending' });
      return res.json({ success: true, matched: false, hasPending: !!hasPending });
    }

    const ride = request.matchedRide;
    if (!ride || !ride.active) {
      if (ride) {
        request.status = 'cancelled';
        await request.save();
      }
      const hasPending = await RideRequest.exists({ passenger: req.userId, status: 'pending' });
      return res.json({ success: true, matched: false, hasPending: !!hasPending });
    }

    const otpEntry = ride.passengers.find(
      p => p.user.toString() === req.userId.toString()
    );

    res.json({
      success: true,
      matched: true,
      ride: {
        _id: ride._id,
        rideCode: ride.rideCode,
        driver: ride.driver,
        currentLocation: ride.currentLocation,
        price: ride.price,
        paymentMethod: ride.paymentMethod,
        paymentStatus: ride.paymentStatus,
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
    const rideCode = await Ride.generateUniqueCode();

    const ride = await Ride.create({
      rideCode,
      driver: req.userId,
      driverModel: req.userRole === 'rider' ? 'Rider' : 'User',
      pickup: request.pickup.address,
      route: [{
        college: request.college,
        order: 0,
      }],
      date: now,
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      seats: 3,
      price: request.price || 30,
      active: true,
      currentStop: 0,
      paymentMethod: request.paymentMethod || 'cash',
      passengers: [{ user: request.passenger._id, otp }],
    });

    request.status = 'accepted';
    request.matchedRide = ride._id;
    await request.save();

    await User.findByIdAndUpdate(request.passenger._id, { $inc: { ridesJoined: 1, moneySaved: 30 } });

    res.json({ success: true, ride: { ...ride.toObject(), driver: req.userId, rideCode: ride.rideCode }, otp });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyRideHistory = async (req, res) => {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let rides;

    if (req.userRole === 'rider') {
      rides = await Ride.find({
        driver: req.userId,
        status: 'completed',
        updatedAt: { $gte: oneWeekAgo },
      }).populate('driver', 'name avgRating')
        .populate('passengers.user', 'name avgRating')
        .sort({ updatedAt: -1 });
    } else {
      rides = await Ride.find({
        'passengers.user': req.userId,
        status: 'completed',
        updatedAt: { $gte: oneWeekAgo },
      }).populate('driver', 'name avgRating')
        .populate('passengers.user', 'name avgRating')
        .sort({ updatedAt: -1 });
    }

    res.json({ success: true, rides });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Passenger cancels their ride request
// Rider checks their active ride on page refresh
exports.checkMyActiveRide = async (req, res) => {
  try {
    const ride = await Ride.findOne({
      driver: req.userId,
      active: true,
      status: 'active',
    }).populate('passengers.user', 'name collegeName profilePicture phone');

    if (!ride) {
      return res.json({ success: true, active: false });
    }

    res.json({
      success: true,
      active: true,
      ride,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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
