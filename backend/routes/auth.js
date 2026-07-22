const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const authController = require('../controllers/authController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/complete-profile', auth, upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'studentIdCard', maxCount: 1 },
]), authController.completeProfile);
router.post('/verify-college', auth, upload.fields([
  { name: 'studentIdCard', maxCount: 1 },
]), authController.verifyCollege);
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, upload.fields([{ name: 'profilePicture', maxCount: 1 }]), authController.updateProfile);
router.delete('/profile', auth, authController.deleteAccount);
router.post('/verify-rider-signup-otp', authController.verifyRiderSignupOtp);
router.post('/setup-rider', upload.fields([{ name: 'riderDoc', maxCount: 1 }]), authController.setupRiderAccount);
router.post('/create-rider', authController.setupRiderAccount);
router.post('/apply-rider', auth, upload.fields([{ name: 'riderDoc', maxCount: 1 }]), authController.applyRider);
router.get('/rider-application-status', auth, authController.getRiderApplicationStatus);
router.post('/login-rider', authController.loginRider);
router.post('/verify-rider-otp', authController.verifyRiderOtp);

module.exports = router;
