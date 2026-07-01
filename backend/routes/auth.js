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
router.put('/profile', auth, authController.updateProfile);

module.exports = router;
