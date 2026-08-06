const mongoose = require('mongoose');
(async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/uniride', { serverSelectionTimeoutMS: 3000 });
    const db = mongoose.connection.db;

    // Legacy users without a role field
    const legacy = await db.collection('users').find({ role: { $exists: false } }).project({ _id: 1, phone: 1, name: 1, createdAt: 1 }).toArray();
    console.log('LEGACY (no role):', JSON.stringify(legacy, null, 2));

    for (const u of legacy) {
      const id = String(u._id);
      const refs = {
        rideRequests: await db.collection('riderequests').countDocuments({ passenger: new mongoose.Types.ObjectId(id) }),
        savedRoutes: await db.collection('savedroutes').countDocuments({ user: new mongoose.Types.ObjectId(id) }),
        complaints: await db.collection('complaints').countDocuments({ userId: new mongoose.Types.ObjectId(id) }),
        ridesAsPassenger: await db.collection('rides').countDocuments({ 'passengers.user': new mongoose.Types.ObjectId(id) }),
        reviews: await db.collection('reviews').countDocuments({ reviewer: new mongoose.Types.ObjectId(id) }),
        notifications: await db.collection('notifications').countDocuments({ userId: new mongoose.Types.ObjectId(id) }),
      };
      console.log(`\nLegacy user ${id} (${u.phone}, ${u.name}):`, JSON.stringify(refs));
    }
  } catch (e) {
    console.error('ERR:', e.message);
  }
  process.exit(0);
})();
