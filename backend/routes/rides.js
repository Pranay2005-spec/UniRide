const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const rideController = require('../controllers/rideController');

router.post('/', auth, rideController.createRide);
router.post('/announce', auth, rideController.announceRide);
router.get('/search', auth, rideController.searchRides);
router.get('/search-by-college', auth, rideController.searchRidesByCollege);
router.post('/:id/join', auth, rideController.joinRide);
router.post('/:id/start', auth, rideController.startRide);
router.patch('/:id/stop', auth, rideController.updateStop);
router.get('/:id/passengers', auth, rideController.getPassengers);
router.get('/offered', auth, rideController.getMyOfferedRides);
router.get('/joined', auth, rideController.getMyJoinedRides);

// Ride request flow (passenger requests, rider accepts)
router.post('/request', auth, rideController.requestRide);
router.get('/my-match', auth, rideController.checkMatch);
router.get('/waiting-passengers', auth, rideController.getWaitingPassengers);
router.post('/accept-request/:id', auth, rideController.acceptRequest);
router.delete('/request', auth, rideController.cancelRequest);

// Passenger location + verification
router.patch('/:id/passenger-location', auth, rideController.updatePassengerLocation);
router.post('/:id/verify-passenger', auth, rideController.verifyPassengerOtp);

// Parameterized routes — must come after all fixed routes
router.get('/:id', auth, rideController.getRideById);
router.patch('/:id/location', auth, rideController.updateLocation);
router.patch('/:id/deactivate', auth, rideController.deactivateRide);

module.exports = router;
