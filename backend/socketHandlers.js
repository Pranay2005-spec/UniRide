const jwt = require('jsonwebtoken');
const RideRequest = require('./models/RideRequest');
const Ride = require('./models/Ride');
const User = require('./models/User');
const Rider = require('./models/Rider');

function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MAX_DISTANCE = 2000;

const rateLimitMap = new Map();

function checkRateLimit(socket, event, maxPerMinute = 10) {
  const key = `${socket.userId}:${event}`;
  const now = Date.now();
  const window = 60000;
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, []);
  }
  const timestamps = rateLimitMap.get(key).filter(t => now - t < window);
  if (timestamps.length >= maxPerMinute) {
    socket.emit('error', { message: 'Too many requests. Please slow down.' });
    return false;
  }
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const filtered = timestamps.filter(t => now - t < 60000);
    if (filtered.length === 0) rateLimitMap.delete(key);
    else rateLimitMap.set(key, filtered);
  }
}, 60000);

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
    socket.join(`user:${socket.userId}`);

    // Passenger requests a ride
    socket.on('requestRide', async (data) => {
      if (!checkRateLimit(socket, 'requestRide', 5)) return;
      try {
        const { college, pickup, fare, paymentMethod } = data;

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
          price: fare || 30,
          paymentMethod: paymentMethod || 'cash',
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
      if (!checkRateLimit(socket, 'cancelRequest', 10)) return;
      const cancelled = await RideRequest.findOneAndUpdate(
        { passenger: socket.userId, status: 'pending' },
        { status: 'cancelled' },
        { new: true }
      );
      if (cancelled) {
        io.to(`college:${cancelled.college.id}`).emit('passengerCancelled', {
          requestId: cancelled._id,
        });
      }
    });

    // Rider starts looking for passengers
    socket.on('findRiders', async (data) => {
      if (!checkRateLimit(socket, 'findRiders', 15)) return;
      try {
        const { collegeId, riderLat, riderLng } = data;
        socket.join(`college:${collegeId}`);

        const requests = await RideRequest.find({
          'college.id': Number(collegeId),
          status: 'pending',
        }).populate('passenger', 'name collegeName profilePicture');

        const nearby = requests.filter(r => {
          if (!riderLat || !riderLng || !r.pickup?.position) return true;
          return calcDistance(riderLat, riderLng, r.pickup.position[0], r.pickup.position[1]) <= MAX_DISTANCE;
        }).map(r => {
          const plain = r.toObject();
          if (riderLat && riderLng && r.pickup?.position) {
            plain.distance = Math.round(calcDistance(riderLat, riderLng, r.pickup.position[0], r.pickup.position[1]));
          }
          return plain;
        }).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        socket.emit('waitingPassengers', nearby);
      } catch (err) {
        socket.emit('findRidersError', { message: err.message });
      }
    });

    socket.on('stopFindRiders', (collegeId) => {
      socket.leave(`college:${collegeId}`);
    });

    // Rider accepts a request
    socket.on('acceptRequest', async (requestId) => {
      if (!checkRateLimit(socket, 'acceptRequest', 10)) return;
      try {
        const request = await RideRequest.findById(requestId)
          .populate('passenger', 'name collegeName profilePicture phone');

        if (!request) return socket.emit('error', { message: 'Request not found' });
        if (request.status !== 'pending') return socket.emit('error', { message: 'Request already accepted or cancelled' });

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const now = new Date();
        const rideCode = await Ride.generateUniqueCode();

        const ride = await Ride.create({
          rideCode,
          driver: socket.userId,
          driverModel: 'Rider',
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

        await User.findByIdAndUpdate(request.passenger._id, { $inc: { ridesJoined: 1, moneySaved: request.price || 30 } });

        let driverUser = await User.findById(socket.userId).select('name collegeName profilePicture avgRating');
        if (!driverUser) {
          driverUser = await Rider.findById(socket.userId).select('name profilePicture avgRating');
        }

        io.to(`user:${request.passenger._id}`).emit('matched', {
          ride: {
            _id: ride._id,
            rideCode: ride.rideCode,
            driver: driverUser,
            currentLocation: ride.currentLocation,
            price: ride.price,
            pickup: ride.pickup,
            route: ride.route,
            paymentMethod: ride.paymentMethod,
            otp,
          },
          otp,
        });

        socket.emit('requestAccepted', {
          ride: ride.toObject(),
          otp,
          passenger: request.passenger,
          pickup: request.pickup,
        });

        io.to(`college:${request.college.id}`).emit('passengerAccepted', { requestId: request._id });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Chat messages
    socket.on('sendMessage', async (data) => {
      if (!checkRateLimit(socket, 'sendMessage', 20)) return;
      try {
        const { rideId, message } = data;
        if (!rideId || !message || !message.trim()) return;

        const ride = await Ride.findById(rideId);
        if (!ride) return;

        const isDriver = ride.driver.toString() === socket.userId.toString();
        const isPassenger = ride.passengers.some(p => p.user.toString() === socket.userId.toString());
        if (!isDriver && !isPassenger) return;

        let senderName = 'Unknown';
        if (isDriver) {
          const driver = await User.findById(socket.userId).select('name');
          if (driver) senderName = driver.name;
          else {
            const rider = await Rider.findById(socket.userId).select('name');
            if (rider) senderName = rider.name;
          }
        } else {
          const user = await User.findById(socket.userId).select('name');
          if (user) senderName = user.name;
        }

        io.to(`ride:${rideId}`).emit('newMessage', {
          rideId,
          senderId: socket.userId,
          senderName,
          message: message.trim(),
          timestamp: new Date().toISOString(),
        });
      } catch {}
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
        if (!rideId || typeof lat !== 'number' || typeof lng !== 'number') return;
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
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

    // On disconnect — cancel pending requests but NOT active rides (survives page refresh)
    socket.on('disconnect', async () => {
      try {
        const pending = await RideRequest.findOneAndUpdate(
          { passenger: socket.userId, status: 'pending' },
          { status: 'cancelled' },
          { new: true }
        );
        if (pending) {
          io.to(`college:${pending.college.id}`).emit('passengerCancelled', {
            requestId: pending._id,
          });
        }
      } catch {}
    });
  });
}

module.exports = setupSocketHandlers;
