const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  readBy: [{ type: String }],
  deletedBy: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
