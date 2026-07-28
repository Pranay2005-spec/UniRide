const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const reviewController = require('../controllers/reviewController');

router.post('/', auth, reviewController.createReview);
router.get('/pending', auth, reviewController.getPendingReviews);
router.get('/target/:targetId', auth, reviewController.getReviewsForTarget);

module.exports = router;
