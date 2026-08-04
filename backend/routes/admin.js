const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');

router.post('/login', adminController.adminLogin);

router.get('/pending-students', adminAuth, adminController.getPendingStudents);
router.get('/pending-riders', adminAuth, adminController.getPendingRiders);
router.post('/verify-student', adminAuth, adminController.verifyStudent);
router.post('/verify-rider', adminAuth, adminController.verifyRider);
router.get('/complaints', adminAuth, adminController.getAllComplaints);
router.post('/resolve-complaint', adminAuth, adminController.resolveComplaint);
router.get('/stats', adminAuth, adminController.getStats);
router.get('/live-rides', adminAuth, adminController.getLiveRides);
router.get('/users', adminAuth, adminController.getUsers);
router.post('/toggle-block', adminAuth, adminController.toggleBlock);
router.get('/analytics', adminAuth, adminController.getAnalytics);
router.post('/broadcast', adminAuth, adminController.broadcastNotification);
router.get('/broadcasts', adminAuth, adminController.getBroadcasts);

module.exports = router;
