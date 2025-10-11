// routes/bankPassbook.js

const express = require('express');
const router = express.Router();
const BankPassbook = require('../models/BankPassbook');
const authMiddleware = require('../middleware/authMiddleware');
const logActivity = require('../utils/logActivity');

/**
 * @route   GET /api/bank-passbook
 * @desc    Get all transactions
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const transactions = await BankPassbook.find()
      .sort({ date: 1, createdAt: 1 }) // Sort by date, then creation time
      .lean();

    res.json(transactions);
  } catch (err) {
    console.error('Error fetching bank transactions:', err.message);
    res.status(500).json({ message: 'Server error while fetching transactions' });
  }
});

/**
 * @route   POST /api/bank-passbook
 * @desc    Add a new transaction (Credit/Debit)
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  const { date, time, description, type, amount } = req.body;

  // Validation
  if (!date || !time || !description || !type || !amount) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (!['Credit', 'Debit'].includes(type)) {
    return res.status(400).json({ message: 'Type must be "Credit" or "Debit"' });
  }

  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  try {
    const newTransaction = new BankPassbook({
      date,
      time,
      description,
      type,
      amount: numericAmount,
      addedBy: req.user._id || 'system', // if using JWT with user
    });

    const saved = await newTransaction.save();

    // ✅ LOG: Detailed create activity
    await logActivity({
      req,
      action: 'create',
      resource: 'BankPassbook',
      description: `Added ${type} transaction: "${description}" for ${numericAmount} on ${date} at ${time}`
    });
    
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error adding transaction:', err.message);
    res.status(500).json({ message: 'Failed to add transaction' });
  }
});

/**
 * @route   PUT /api/bank-passbook/:id
 * @desc    Update a transaction
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { date, time, description, type, amount } = req.body;

  // Validation
  if (!date || !time || !description || !type || !amount) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (!['Credit', 'Debit'].includes(type)) {
    return res.status(400).json({ message: 'Type must be "Credit" or "Debit"' });
  }

  if (isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  try {
    const updated = await BankPassbook.findByIdAndUpdate(
      id,
      { date, time, description, type, amount, updatedBy: req.user?.id || 'system' },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // ✅ LOG: Edit BankPassbook
    await logActivity({
      req,
      action: 'Edit',
      resource: 'BankPassbook',
      description: `Updated ${type} transaction: "${description}" to amount ${numericAmount} on ${date} at ${time}`
    });

    res.json(updated);
  } catch (err) {
    console.error('Error updating transaction:', err.message);
    res.status(500).json({ message: 'Failed to update transaction' });
  }
});

/**
 * @route   DELETE /api/bank-passbook/:id
 * @desc    Delete a transaction
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await BankPassbook.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // ✅ LOG: Delete BankPassbook
    await logActivity({
      req,
      action: 'delete',
      resource: 'BankPassbook',
      description: `Deleted ${deleted.type} transaction: "${deleted.description}" for ${deleted.amount} on ${deleted.date}`
    });

    res.json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    console.error('Error deleting transaction:', err.message);
    res.status(500).json({ message: 'Failed to delete transaction' });
  }
});

module.exports = router;