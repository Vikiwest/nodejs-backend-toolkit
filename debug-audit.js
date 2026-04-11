const mongoose = require('mongoose');
require('dotenv').config();

async function checkLoginActivities() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/nodejs-backend-toolkit'
    );

    const userId = '69d367bb2c6ea06cdfa72d58';

    console.log('Checking for login activities for user:', userId);

    // Check for login activities in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const loginLogs = await mongoose.connection.db
      .collection('auditlogs')
      .find({
        userId: { $in: [userId, new mongoose.Types.ObjectId(userId)] },
        action: 'login',
        timestamp: { $gte: thirtyDaysAgo },
      })
      .toArray();

    console.log('Login activities found for user:', loginLogs.length);
    loginLogs.forEach((log) => {
      console.log(`- Timestamp: ${log.timestamp}, UserId: ${log.userId}`);
    });

    // Check all recent login activities in DB
    const allLoginLogs = await mongoose.connection.db
      .collection('auditlogs')
      .find({
        action: 'login',
      })
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();

    console.log('Recent login activities in DB:');
    allLoginLogs.forEach((log) => {
      console.log(`- User: ${log.userId}, Time: ${log.timestamp}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkLoginActivities();
