const express = require("express");
const router = express.Router();
const DeviceType = require("../models/DeviceType");
const authMiddleware = require('../middleware/authMiddleware');
const logActivity = require('../utils/logActivity');

// GET: Get all device types
router.get("/", async (req, res) => {
  try {
    const deviceTypes = await DeviceType.find().sort({ createdAt: -1 });
    res.json(deviceTypes);
  } catch (err) {
    console.error("GET /api/deviceTypes error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST: Add a new device type
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { type } = req.body;
    if (!type || !type.trim()) {
      return res.status(400).json({ message: "Device type is required" });
    }

    const trimmedType = type.trim();
    const existingType = await DeviceType.findOne({ type: trimmedType });
    if (existingType) {
      return res.status(400).json({ message: "This device type already exists" });
    }

    const deviceType = new DeviceType({ type: trimmedType });
    const newType = await deviceType.save();

    // ✅ LOG: Create DeviceType
    await logActivity({
      req,
      action: 'create',
      resource: 'DeviceType',
      description: `Created device type: "${trimmedType}"`
    });

    res.status(201).json(newType);
  } catch (err) {
    console.error("POST /api/deviceTypes error:", err);
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;