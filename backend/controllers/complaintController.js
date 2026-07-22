const Complaint = require('../models/Complaint');

exports.createComplaint = async (req, res) => {
  try {
    const { targetUserId, rideId, subject, description } = req.body;
    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description required' });
    }

    const complaint = await Complaint.create({
      userId: req.userId,
      targetUserId,
      rideId,
      subject,
      description,
    });

    res.json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ userId: req.userId })
      .populate('targetUserId', 'name phone')
      .populate('rideId')
      .sort({ createdAt: -1 });
    res.json({ success: true, complaints });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
