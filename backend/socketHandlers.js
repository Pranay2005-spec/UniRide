const jwt = require('jsonwebtoken');
const RideRequest = require('./models/RideRequest');
const Ride = require('./models/Ride');
const User = require('./models/User');
const Rider = require('./models/Rider');
const { calcDistance } = require('./utils/distance');

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
    socket.emit('error', { message: 'Too many requests. Please slow down.', event });
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

  // Re-queue a cancelled ride's accepted passengers so other riders can see them.
  async function releaseRidePassengers(ride) {
    const requests = await RideRequest.find({ matchedRide: ride._id, status: 'accepted' });
    for (const request of requests) {
      request.status = 'pending';
      request.matchedRide = null;
      await request.save();
      const populated = await RideRequest.findById(request._id).populate('passenger', 'name collegeName profilePicture');
      if (populated) {
        io.to(`college:${populated.college.id}`).emit('newPassenger', populated);
      }
    }
  }

  async function deactivateRide(rideId) {
    const ride = await Ride.findById(rideId);
    if (!ride) return;
    ride.active = false;
    ride.status = 'cancelled';
    await ride.save();
    io.to(`ride:${rideId}`).emit('rideDeactivated', { rideId });
  }

  // Delayed cleanup for accepted rides when a user's socket drops. The grace
  // period lets a page refresh reconnect and keep the ride — only truly
  // abandoned rides (no reconnect within DISCONNECT_GRACE_MS) get cancelled.
  const disconnectCleanupTimers = new Map();
  const DISCONNECT_GRACE_MS = 30000;

  function clearScheduledCleanup(userId) {
    const key = String(userId);
    const timer = disconnectCleanupTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      disconnectCleanupTimers.delete(key);
    }
  }

  function scheduleDisconnectCleanup(userId) {
    clearScheduledCleanup(userId);
    const key = String(userId);
    const timer = setTimeout(async () => {
      disconnectCleanupTimers.delete(key);
      try {
        // If the user still has a live socket (e.g. a second tab open), they are
        // NOT actually gone — leave their rides alone.
        const room = io.sockets.adapter.rooms.get(`user:${key}`);
        if (room && room.size > 0) return;

        // Passenger side: an accepted request means a ride exists — cancel both.
        const accepted = await RideRequest.findOne({ passenger: userId, status: 'accepted' });
        if (accepted) {
          if (accepted.matchedRide) await deactivateRide(accepted.matchedRide);
          accepted.status = 'cancelled';
          accepted.matchedRide = null;
          await accepted.save();
        }
        // Rider side: any active ride they were driving gets cancelled and its
        // passengers are released back to the waiting pool.
        const ride = await Ride.findOne({ driver: userId, active: true, status: 'active' });
        if (ride) {
          await releaseRidePassengers(ride);
          await deactivateRide(ride._id);
        }
      } catch {}
    }, DISCONNECT_GRACE_MS);
    disconnectCleanupTimers.set(key, timer);
  }

  // Timeout auto-cancel: stale pending requests (no rider accepted within
  // REQUEST_TIMEOUT_MS) are cancelled so riders don't chase ghosts.
  const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;
  setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - REQUEST_TIMEOUT_MS);
      const stale = await RideRequest.find({ status: 'pending', createdAt: { $lt: cutoff } });
      for (const request of stale) {
        request.status = 'cancelled';
        await request.save();
        io.to(`college:${request.college.id}`).emit('passengerCancelled', {
          requestId: request._id,
        });
      }
    } catch {}
  }, 60000);

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    clearScheduledCleanup(socket.userId);

    // Passenger requests a ride
    socket.on('requestRide', async (data) => {
      if (!checkRateLimit(socket, 'requestRide', 10)) return;
      try {
        const { college, pickup, fare, paymentMethod } = data;

        if (!college || !college.id) {
          return socket.emit('error', { message: 'College information is required' });
        }
        if (!pickup || !pickup.address || !pickup.position) {
          return socket.emit('error', { message: 'Pickup location is required' });
        }

        // Superseding: if the passenger already has an accepted request, deactivate
        // its ride too — otherwise the old rider is left on a dead match.
        const oldAccepted = await RideRequest.find({ passenger: socket.userId, status: 'accepted' });
        for (const old of oldAccepted) {
          if (old.matchedRide) await deactivateRide(old.matchedRide);
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
      try {
        // Case 1: passenger is still waiting (pending) — just cancel the request
        const cancelled = await RideRequest.findOneAndUpdate(
          { passenger: socket.userId, status: 'pending' },
          { status: 'cancelled' },
          { new: true }
        );
        if (cancelled) {
          io.to(`college:${cancelled.college.id}`).emit('passengerCancelled', {
            requestId: cancelled._id,
          });
          return;
        }

        // Case 2: passenger was already matched (accepted) but never picked up —
        // cancel the request AND the ride, then let the rider go back to searching
        const accepted = await RideRequest.findOne({ passenger: socket.userId, status: 'accepted' });
        if (accepted) {
          const rideId = accepted.matchedRide;
          accepted.status = 'cancelled';
          accepted.matchedRide = null;
          await accepted.save();

          if (rideId) {
            const ride = await Ride.findById(rideId);
            if (ride) {
              ride.active = false;
              ride.status = 'cancelled';
              await ride.save();
              io.to(`ride:${rideId}`).emit('rideDeactivated', { rideId });
            }
          }
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
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

        // Resolve the driver account once and verify it is allowed to drive
        let driverUser = await User.findById(socket.userId).select('name collegeName profilePicture avgRating upiId');
        let driverModel = 'User';
        if (!driverUser) {
          driverUser = await Rider.findById(socket.userId).select('name profilePicture avgRating upiId blocked verificationStatus');
          if (!driverUser) return socket.emit('error', { message: 'Driver account not found' });
          if (driverUser.blocked) return socket.emit('error', { message: 'Your account has been blocked' });
          if (driverUser.verificationStatus !== 'verified') return socket.emit('error', { message: 'Your rider account is not verified yet' });
          driverModel = 'Rider';
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const now = new Date();
        const rideCode = await Ride.generateUniqueCode();

        const ride = await Ride.create({
          rideCode,
          driver: socket.userId,
          driverModel,
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
            paymentStatus: ride.paymentStatus,
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

    // Rider cancels an accepted ride before pickup — passenger request goes back
    // to the waiting pool so another rider can pick it up.
    socket.on('riderCancelRide', async (rideId) => {
      if (!checkRateLimit(socket, 'riderCancelRide', 10)) return;
      try {
        const ride = await Ride.findOne({ _id: rideId, driver: socket.userId, active: true, status: 'active' });
        if (!ride) return socket.emit('error', { message: 'No active ride to cancel' });
        await releaseRidePassengers(ride);
        await deactivateRide(ride._id);
        socket.emit('rideCancelled', { success: true });
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
      } catch (err) {
        console.error('sendMessage error:', err.message);
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
      } catch (err) {
        console.error('joinRideRoom error:', err.message);
      }
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
      } catch (err) {
        console.error('updateLocation error:', err.message);
      }
    });

    // On disconnect — cancel pending requests immediately, but give accepted
    // rides a grace window so a page refresh (brief reconnect) doesn't kill them.
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
        scheduleDisconnectCleanup(socket.userId);
      } catch {}
    });
  });
}

module.exports = setupSocketHandlers;
