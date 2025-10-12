const express = require("express");
const router = express.Router();
const ExtraIncome = require("../models/ExtraIncome");
const authMiddleware = require('../middleware/authMiddleware');
const logActivity = require('../utils/logActivity');

// Create a new extra income record
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { date, incomeType, amount, description, assignedTo, paymentBreakdown, hasCredit, creditedDate} = req.body;
    console.log("Creating extra income:", { date, incomeType, amount, description, assignedTo });

    // ✅ Validate paymentBreakdown if provided
    if (paymentBreakdown && (!Array.isArray(paymentBreakdown) || paymentBreakdown.length === 0) && !hasCredit) {
      return res.status(400).json({ message: "paymentBreakdown must be a non-empty array" });
    }

    const extraIncome = new ExtraIncome({
      date: new Date(date),
      incomeType,
      amount: parseFloat(amount),
      description,
      assignedTo,
      paymentBreakdown: paymentBreakdown || undefined,
      creditedDate
    });

    const savedIncome = await extraIncome.save();

    // ✅ LOG: Create ExtraIncome
    await logActivity({
      req,
      action: 'create',
      resource: 'ExtraIncome',
      description: `Recorded extra income of ${savedIncome.amount} (${savedIncome.incomeType}) on ${savedIncome.date.toISOString().split('T')[0]}${savedIncome.description ? `: "${savedIncome.description}"` : ''}`
    });

    res.status(201).json(savedIncome);
  } catch (err) {
    console.error("Error creating extra income:", err);
    res.status(500).json({ message: "Error creating extra income", error: err.message });
  }
});

// Get all extra income records
router.get("/", async (req, res) => {
  try {
    const extraIncomes = await ExtraIncome.find().sort({ date: -1 });
    console.log(`Fetched ${extraIncomes.length} extra income records`);
    res.json(extraIncomes);
  } catch (err) {
    console.error("Error fetching extra incomes:", err);
    res.status(500).json({ message: "Error fetching extra incomes", error: err.message });
  }
});

// Update an extra income record
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, incomeType, amount, description, assignedTo, paymentBreakdown, returnAlert, serviceCharge, totalAmount, hasCredit, creditedDate, } = req.body;
    console.log(`Updating extra income ID ${id}:`, { date, incomeType, amount, description, assignedTo});

    // ✅ Validate paymentBreakdown if provided
    if (paymentBreakdown !== undefined) {
      if (!Array.isArray(paymentBreakdown) || paymentBreakdown.length === 0 && !hasCredit) {
        return res.status(400).json({ message: "paymentBreakdown must be a non-empty array" });
      }
    }

    const extraIncome = await ExtraIncome.findByIdAndUpdate(
      id,
      {
        date: new Date(date),
        incomeType,
        amount: parseFloat(amount),
        description,
        assignedTo,
        paymentBreakdown: paymentBreakdown || undefined,
        returnAlert, 
        serviceCharge, 
        totalAmount,
        creditedDate
      },
      { new: true, runValidators: true }
    );

    if (!extraIncome) {
      return res.status(404).json({ message: "Extra income not found" });
    }

    // ✅ LOG: Edit ExtraIncome
    await logActivity({
      req,
      action: 'Edit',
      resource: 'ExtraIncome',
      description: `Updated extra income of ${extraIncome.amount} (${extraIncome.incomeType}) on ${extraIncome.date.toISOString().split('T')[0]}${extraIncome.description ? `: "${extraIncome.description}"` : ''}`
    });

    res.json(extraIncome);
  } catch (err) {
    console.error("Error updating extra income:", err);
    res.status(500).json({ message: "Error updating extra income", error: err.message });
  }
});

// Delete an extra income record
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Deleting extra income ID ${id}`);

    const extraIncome = await ExtraIncome.findByIdAndDelete(id);
    if (!extraIncome) {
      return res.status(404).json({ message: "Extra income not found" });
    }

    await logActivity({
      req,
      action: 'delete',
      resource: 'ExtraIncome',
      description: `Deleted extra income of ${extraIncome.amount} (${extraIncome.incomeType}) on ${extraIncome.date.toISOString().split('T')[0]}`
    });

    res.json({ message: "Extra income deleted successfully" });
  } catch (err) {
    console.error("Error deleting extra income:", err);
    res.status(500).json({ message: "Error deleting extra income", error: err.message });
  }
});

module.exports = router;