const jwt = require('jsonwebtoken');
const RideRequest = require('./models/RideRequest');
const Ride = require('./models/Ride');
const User = require('./models/User');

function setupSocketHandlers(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Join personal room for direct notifications
    socket.join(`user:${socket.userId}`);

    // Passenger requests a ride
    socket.on('requestRide', async (data) => {
      try {
        const { college, pickup } = data;

        if (!college || !college.id) {
          return socket.emit('error', { message: 'College information is required' });
        }
        if (!pickup || !pickup.address || !pickup.position) {
          return socket.emit('error', { message: 'Pickup location is required' });
        }

        await RideRequest.updateMany(
          { passenger: socket.userId, status: { $in: ['pending', 'accepted'] } },
          { status: 'cancelled' }
        );

        const request = await RideRequest.create({
          passenger: socket.userId,
          college,
          pickup,
        });

        const populated = await RideRequest.findById(request._id)
          .populate('passenger', 'name collegeName profilePicture');

        socket.emit('rideRequestCreated', { success: true });
        io.to(`college:${college.id}`).emit('newPassenger', populated);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Cancel pending request
    socket.on('cancelRequest', async () => {
      const cancelled = await RideRequest.findOneAndUpdate(
        { passenger: socket.userId, status: 'pending' },
        { status: 'cancelled' },
        { new: true }
      );
      if (cancelled) {
        io.to(`college:${cancelled.college.id}`).emit('passengerCancelled', {
          passengerId: socket.userId,
        });
      }
    });

    // Rider starts/stops looking for passengers for a college
    socket.on('findRiders', async (collegeId) => {
      socket.join(`college:${collegeId}`);

      const cutoff = new Date(Date.now() - 30 * 1000);
      await RideRequest.updateMany(
        { 'college.id': Number(collegeId), status: 'pending', createdAt: { $lt: cutoff } },
        { status: 'cancelled' }
      );

      const requests = await RideRequest.find({
        'college.id': Number(collegeId),
        status: 'pending',
        createdAt: { $gte: cutoff },
      }).populate('passenger', 'name collegeName profilePicture');

      socket.emit('waitingPassengers', requests);
    });

    socket.on('stopFindRiders', (collegeId) => {
      socket.leave(`college:${collegeId}`);
    });

    // Rider accepts a request
    socket.on('acceptRequest', async (requestId) => {
      try {
        const request = await RideRequest.findById(requestId)
          .populate('passenger', 'name collegeName profilePicture phone');

        if (!request) return socket.emit('error', { message: 'Request not found' });
        if (request.status !== 'pending') return socket.emit('error', { message: 'Request already accepted or cancelled' });

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const now = new Date();

        const ride = await Ride.create({
          driver: socket.userId,
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

        // Fetch driver info for the passenger
        const driverUser = await User.findById(socket.userId).select('name collegeName profilePicture');

        // Notify the passenger they've been matched
        io.to(`user:${request.passenger._id}`).emit('matched', {
          ride: {
            _id: ride._id,
            driver: driverUser,
            currentLocation: ride.currentLocation,
            price: ride.price,
          },
          otp,
        });

        // Confirm to the rider
        socket.emit('requestAccepted', { ride: ride.toObject(), otp, passenger: request.passenger });

        // Remove from waiting list
        io.to(`college:${request.college.id}`).emit('passengerAccepted', { requestId: request._id });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Join ride room for location sharing
    socket.on('joinRideRoom', async (rideId) => {
      try {
        const ride = await Ride.findById(rideId);
        if (!ride) return;

        const isDriver = ride.driver.toString() === socket.userId.toString();
        const isPassenger = ride.passengers.some(p => p.user.toString() === socket.userId.toString());
        if (isDriver || isPassenger) {
          socket.join(`ride:${rideId}`);
          socket.emit('joinedRideRoom', { rideId });
        }
      } catch {}
    });

    // Location updates
    socket.on('updateLocation', async (data) => {
      try {
        const { rideId, lat, lng } = data;
        const ride = await Ride.findById(rideId);
        if (!ride) return;

        const isDriver = ride.driver.toString() === socket.userId.toString();

        if (isDriver) {
          ride.currentLocation = { lat, lng };
          await ride.save();
          socket.to(`ride:${rideId}`).emit('riderLocation', { lat, lng });
        } else {
          await Ride.updateOne(
            { _id: rideId, 'passengers.user': socket.userId },
            { $set: { 'passengers.$.location': { lat, lng } } }
          );
          socket.to(`ride:${rideId}`).emit('passengerLocation', { userId: socket.userId, lat, lng });
        }
      } catch {}
    });

    // On disconnect - clean up pending requests
    socket.on('disconnect', async () => {
      try {
        const pending = await RideRequest.findOneAndUpdate(
          { passenger: socket.userId, status: 'pending' },
          { status: 'cancelled' },
          { new: true }
        );
        if (pending) {
          io.to(`college:${pending.college.id}`).emit('passengerCancelled', {
            passengerId: socket.userId,
          });
        }
      } catch {}
    });
  });
}

module.exports = setupSocketHandlers;
