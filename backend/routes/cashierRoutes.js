const express = require("express");
const router = express.Router();
const Cashier = require("../models/cashierModel");
const authMiddleware = require('../middleware/authMiddleware');
const logActivity = require('../utils/logActivity');

// Add Cashier
router.post("/", authMiddleware, async (req, res) => {
  try {
    const newCashier = new Cashier(req.body);
    const savedCashier = await newCashier.save();

    // ✅ LOG: Detailed create activity
    await logActivity({
      req,
      action: 'create',
      resource: 'Cashier',
      description: `Created cashier "${savedCashier.cashierName}" (ID: ${savedCashier.id}, Role: ${savedCashier.jobRole || 'N/A'})`
    });

    res.status(201).json(savedCashier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all Cashiers
router.get("/", async (req, res) => {
  try {
    const cashiers = await Cashier.find();
    res.json(cashiers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single Cashier
router.get("/:id", async (req, res) => {
  try {
    const cashier = await Cashier.findById(req.params.id);
    if (!cashier) return res.status(404).json({ message: "Cashier not found" });
    res.json(cashier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Cashier
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const updatedCashier = await Cashier.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // ✅ LOG: Edit Cashier
    await logActivity({
      req,
      action: 'Edit',
      resource: 'Cashier',
      description: `Updated cashier "${updatedCashier.cashierName}" (ID: ${updatedCashier.id}, Role: ${updatedCashier.jobRole || 'N/A'})`
    });

    res.json(updatedCashier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete Cashier
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const cashier = await Cashier.findById(req.params.id);
    if (!cashier) {
      return res.status(404).json({ message: "Cashier not found" });
    }
    
    await Cashier.findByIdAndDelete(req.params.id);

    // ✅ LOG: Delete Cashier
    await logActivity({
      req,
      action: 'delete',
      resource: 'Cashier',
      description: `Deleted cashier "${cashier.cashierName}" (ID: ${cashier.id}, Role: ${cashier.jobRole || 'N/A'})`
    });


    res.json({ message: "Cashier deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;