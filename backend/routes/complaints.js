const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const complaintController = require('../controllers/complaintController');

router.post('/', auth, complaintController.createComplaint);
router.get('/mine', auth, complaintController.getMyComplaints);

module.exports = router;
