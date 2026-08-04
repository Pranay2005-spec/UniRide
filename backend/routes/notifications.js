const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');

router.get('/', auth, notificationController.getNotifications);
router.post('/read', auth, notificationController.markAllRead);
router.post('/:id/read', auth, notificationController.markRead);
router.post('/:id/dismiss', auth, notificationController.dismissNotification);

module.exports = router;
