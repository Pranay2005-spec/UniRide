const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const rideController = require('../controllers/rideController');

router.post('/', auth, rideController.createRide);
router.get('/search', auth, rideController.searchRides);
router.post('/:id/join', auth, rideController.joinRide);
router.get('/offered', auth, rideController.getMyOfferedRides);
router.get('/joined', auth, rideController.getMyJoinedRides);

module.exports = router;
