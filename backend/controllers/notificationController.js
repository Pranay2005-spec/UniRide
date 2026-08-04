const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  try {
    const myId = req.userId.toString();
    const notifications = await Notification.find({ deletedBy: { $ne: myId } })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = notifications.filter(n => !n.readBy.includes(myId)).length;
    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const myId = req.userId.toString();
    await Notification.updateMany(
      { readBy: { $ne: myId } },
      { $addToSet: { readBy: myId } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { readBy: req.userId.toString() } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.dismissNotification = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { deletedBy: req.userId.toString() } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
