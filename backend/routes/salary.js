const express = require("express");
const router = express.Router();
const Salary = require("../models/salaryModel");
const Cashier = require("../models/cashierModel");
const authMiddleware = require('../middleware/authMiddleware');
const logActivity = require('../utils/logActivity');

// Add Salary
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { employeeId, date, ...rest } = req.body;

    const employee = await Cashier.findOne({ id: employeeId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Validate date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const newSalary = new Salary({
      employeeId,
      employeeName: employee.cashierName,
      date: parsedDate, // ensure it's a Date object
      ...rest
    });
    
    const savedSalary = await newSalary.save();

    // ✅ LOG: Create Salary
    await logActivity({
      req,
      action: 'create',
      resource: 'Salary',
      description: `Recorded salary for "${employee.cashierName}" (ID: ${employeeId}) on ${parsedDate.toISOString().split('T')[0]}`
    });

    res.status(201).json(savedSalary);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all Salaries
router.get("/", async (req, res) => {
  try {
    const salaries = await Salary.find().sort({ date: -1 });
    res.json(salaries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single Salary
router.get("/:id", async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id);
    if (!salary) return res.status(404).json({ message: "Salary not found" });
    res.json(salary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Salary
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (employeeId) {
      const employee = await Cashier.findOne({ id: employeeId });
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      req.body.employeeName = employee.cashierName;
    }
    const updatedSalary = await Salary.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedSalary) return res.status(404).json({ message: "Salary not found" });

    // ✅ LOG: Edit Salary
    await logActivity({
      req,
      action: 'Edit',
      resource: 'Salary',
      description: `Updated salary for "${updatedSalary.employeeName}" (ID: ${updatedSalary.employeeId}) on ${updatedSalary.date.toISOString().split('T')[0]}`
    });

    res.json(updatedSalary);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete Salary
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const salary = await Salary.findByIdAndDelete(req.params.id);
    if (!salary) return res.status(404).json({ message: "Salary not found" });

    await logActivity({
      req,
      action: 'Delete',
      resource: 'Salary',
      description: `Deleted salary record for employee "${salary.employeeName}" (ID: ${salary.employeeId}) on ${salary.date.toISOString().split('T')[0]}`
    });

    res.json({ message: "Salary deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Salary Summary by Date Range
router.get("/summary/:startDate/:endDate", async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    const salaries = await Salary.find({
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    });
    const totalCost = salaries.reduce((sum, salary) => sum + salary.advance, 0);

    const groupedByDate = salaries.reduce((acc, salary) => {
      const date = new Date(salary.date).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + salary.advance;
      return acc;
    }, {});

    // Group by employeeId
    const groupedByEmployee = salaries.reduce((acc, salary) => {
      const { employeeName, advance } = salary;
      acc[employeeName] = (acc[employeeName] || 0) + advance;
      return acc;
    }, {});


    res.json({ totalCost, groupedByDate, groupedByEmployee });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Employee by ID for Auto-fill
router.get("/employee/:employeeId", async (req, res) => {
  try {
    const employee = await Cashier.findOne({ id: req.params.employeeId });
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json({ employeeName: employee.cashierName });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;