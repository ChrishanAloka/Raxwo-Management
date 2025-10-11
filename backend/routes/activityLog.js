const express = require("express");
const router = express.Router();
const ActivityLog = require("../models/ActivityLog");
const authMiddleware = require('../middleware/authMiddleware');

// In your activityLog router (e.g., routes/activityLog.js)
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Optional: add pagination, filtering by user/resource/action
    const logs = await ActivityLog.find()
      .sort({ timestamp: -1 })
      .limit(1000); // prevent huge responses
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;