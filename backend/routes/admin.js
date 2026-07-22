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

module.exports = router;
