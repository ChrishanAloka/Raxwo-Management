const express = require("express");
const router = express.Router();
const DeviceIssue = require("../models/DeviceIssue");
const authMiddleware = require('../middleware/authMiddleware');
const logActivity = require('../utils/logActivity');

// GET: Get all device issues
router.get("/", async (req, res) => {
  try {
    const deviceIssues = await DeviceIssue.find().sort({ createdAt: -1 });
    res.json(deviceIssues);
  } catch (err) {
    console.error("GET /api/deviceIssues error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST: Add a new device issue
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { issue } = req.body;
    if (!issue || !issue.trim()) {
      return res.status(400).json({ message: "Issue description is required" });
    }

    const trimmedIssue = issue.trim();
    const existingIssue = await DeviceIssue.findOne({ issue: trimmedIssue });
    if (existingIssue) {
      return res.status(400).json({ message: "This issue already exists" });
    }

    const deviceIssue = new DeviceIssue({ issue: trimmedIssue });
    const newIssue = await deviceIssue.save();

    // ✅ LOG: Create DeviceIssue
    await logActivity({
      req,
      action: 'create',
      resource: 'DeviceIssue',
      description: `Created device issue: "${trimmedIssue}"`
    });
    
    res.status(201).json(newIssue);
  } catch (err) {
    console.error("POST /api/deviceIssues error:", err);
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;