const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const authMiddleware = require('../middleware/authMiddleware');
const logActivity = require('../utils/logActivity');

// Save customer details (Credit/Wholesale)
router.post('/customers', authMiddleware, async (req, res) => {
  try {
    const customer = new Customer(req.body);
    const savedCustomer = await customer.save();

    // ✅ Build a safe, readable customer identifier for the log
    const customerName = savedCustomer.name || savedCustomer.fullName || 'Unnamed Customer';
    const customerContact = savedCustomer.phone || savedCustomer.email || 'No contact';

    // ✅ LOG: Detailed create activity
    await logActivity({
      req,
      action: 'create',
      resource: 'Customer',
      description: `Created customer "${customerName}" (Contact: ${customerContact})`
    });

    res.status(201).json({ message: 'Customer details saved successfully!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all customers
router.get('/customers', async (req, res) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
