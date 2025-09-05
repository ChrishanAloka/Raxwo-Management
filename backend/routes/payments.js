const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const Counter = require('../models/Counter');
const authMiddleware = require('../middleware/authMiddleware');

const getNextInvoiceNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'invoiceNumber' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

// POST: Create a new payment (Protected route)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { items, totalAmount, discountApplied, paymentMethod, cashierId, cashierName, customerName, contactNumber, address, description, assignedTo, isWholesale, customerDetails } = req.body;
    console.log('Received payment data in backend:', { items, totalAmount, discountApplied, paymentMethod, cashierId, cashierName, customerName, contactNumber, address, description, assignedTo, isWholesale, customerDetails }); // Debug log

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided' });
    }
    
    if (!totalAmount || !paymentMethod) {
      return res.status(400).json({ message: 'Total amount and payment method are required' });
    }

    if (!cashierId || !cashierName) {
      return res.status(400).json({ message: 'Cashier ID and name are required' });
    }

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({ message: `Not enough stock for ${item.itemName}` });
      }
    }

    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
    }

    const invoiceNumber = `INV-${await getNextInvoiceNumber()}`;

    const payment = new Payment({
      invoiceNumber,
      items,
      totalAmount,
      discountApplied: discountApplied || 0,
      paymentMethod,
      cashierId,
      cashierName,
      customerName: customerName || '',
      contactNumber: contactNumber || '',
      address: address || '',
      description: description || '',
      assignedTo: assignedTo || '',
      isWholesale: isWholesale || false,
      customerDetails: isWholesale ? customerDetails : null,
    });

    const savedPayment = await payment.save();
    console.log('Saved payment document:', savedPayment); // Debug log
    res.status(201).json({ 
      message: 'Payment successful', 
      payment: savedPayment, 
      invoiceNumber 
    });
  } catch (err) {
    console.error('Payment save error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET: Retrieve all payments (Protected route)
router.get('/', authMiddleware, async (req, res) => {
  try {
    if(req.user.role === 'admin'){
    const payments = await Payment.find().populate('items.productId').sort({ createdAt: -1 });
    console.log('Fetched payments from backend:', payments); // Debug log
    res.json(payments);
    }
    else{
      res.status(500).json({ message: "User is not an admin" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET: Retrieve all payments (Protected route)
router.get('/forsummery', async (req, res) => {
  try {
    const payments = await Payment.find().populate('items.productId');
    console.log('Fetched payments from backend:', payments); // Debug log
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/track', async (req, res) => {
  try {
    const { itemCode } = req.query;

    if (!itemCode) {
      return res.status(400).json({ message: 'itemCode is required' });
    }

    // Step 1: Find product by itemCode (case-insensitive)
    const product = await Product.findOne({
      itemCode: { $regex: new RegExp(`^${itemCode}$`, 'i') }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const productId = product._id;

    // Step 2: Find payments that have this productId in items
    const payments = await Payment.find({
      'items.productId': productId
    }).select('invoiceNumber customerName items createdAt');

    // Step 3: Extract and group item usage, summing quantities by invoice
    const usageMap = new Map();

    payments.forEach(payment => {
      const matchedItems = payment.items.filter(item => item.productId.equals(productId));
      const totalQuantityInPayment = matchedItems.reduce((sum, item) => sum + item.quantity, 0);

      const invoiceNo = payment.invoiceNumber;
      if (usageMap.has(invoiceNo)) {
        // If invoice already exists, add quantity
        const existing = usageMap.get(invoiceNo);
        usageMap.set(invoiceNo, {
          ...existing,
          quantity: existing.quantity + totalQuantityInPayment
        });
      } else {
        // New invoice entry
        usageMap.set(invoiceNo, {
          type: 'Payment',
          invoiceNo,
          customerName: payment.customerName || 'Unknown',
          quantity: totalQuantityInPayment,
          date: payment.createdAt
        });
      }
    });

    // Convert map to array and sort by date (newest first)
    const usageRecords = Array.from(usageMap.values())
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(usageRecords);
  } catch (err) {
    console.error('Error in payment tracking:', err.message);
    res.status(500).json({ message: 'Server error while fetching payment usage' });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Step 1: Find the payment
    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Step 2: Handle top-level updates (safe list)
    const allowedTopLevelFields = [
      'invoiceNumber',
      'paymentMethod',
      'discountApplied',
      'totalAmount',
      'cashierName',
      'cashierId',
      'customerName',
      'contactNumber',
      'address',
      'description',
      'assignedTo', // top-level assignment
    ];

    // Apply allowed top-level updates
    Object.keys(updates)
      .filter(key => allowedTopLevelFields.includes(key))
      .forEach(key => {
        payment[key] = updates[key];
      });

    // Step 3: Handle item-level assignedTo updates
    let itemsUpdated = false;

    if (Array.isArray(updates.items)) {
      for (const update of updates.items) {
        const itemId = update._id;
        const assignedTo = update.assignedTo;

        // Validate item ID
        if (!itemId) {
          return res.status(400).json({ message: 'Missing _id in item update' });
        }

        // Validate assignedTo
        if (assignedTo !== undefined) {

          // Find item in payment.items
          const item = payment.items.id(itemId); // Mongoose subdocument findById
          if (!item) {
            return res.status(404).json({ message: `Item with _id ${itemId} not found in payment` });
          }

          // Update only if changed
          if (item.assignedTo !== assignedTo) {
            item.assignedTo = assignedTo;
            itemsUpdated = true;
          }
        }
      }
    }

    // Step 4: Only save if something changed
    if (Object.keys(updates).some(key => allowedTopLevelFields.includes(key)) || itemsUpdated) {
      // Optional: Add metadata
      payment.changedBy = req.body.changedBy || 'Unknown';
      payment.changeSource = req.body.changeSource || 'Payment';

      await payment.save(); // Mongoose handles validation
    } else {
      return res.status(400).json({ message: 'No valid changes detected' });
    }

    // Step 5: Return updated payment
    res.json(payment);
  } catch (err) {
    console.error('Error updating payment:', err.message);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

// DELETE: Delete a payment by ID (Protected route)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const paymentId = req.params.id;
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.paymentMethod !== 'Refund') {
      for (const item of payment.items) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
      }
    }

    await Payment.findByIdAndDelete(paymentId);
    res.json({ message: 'Payment deleted successfully' });
  } catch (err) {
    console.error('Delete payment error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST: Process a return payment (Protected route)
router.post('/return', authMiddleware, async (req, res) => {
  try {
    const { items, totalRefund, cashierId, cashierName, customerName, contactNumber, address } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided for return' });
    }

    if (!totalRefund || totalRefund <= 0) {
      return res.status(400).json({ message: 'Invalid refund amount' });
    }

    if (!cashierId || !cashierName) {
      return res.status(400).json({ message: 'Cashier ID and name are required' });
    }

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.itemName} not found` });
      }
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
    }

    const returnInvoiceNumber = `RET-${await getNextInvoiceNumber()}`;

    const returnPayment = new Payment({
      invoiceNumber: returnInvoiceNumber,
      items,
      totalAmount: -totalRefund,
      discountApplied: 0,
      paymentMethod: 'Refund',
      cashierId,
      cashierName,
      customerName: customerName || '',
      contactNumber: contactNumber || '',
      address: address || ''
    });

    const savedReturn = await returnPayment.save();
    res.status(201).json({
      message: 'Return processed successfully',
      returnPayment: savedReturn,
      returnInvoiceNumber
    });
  } catch (err) {
    console.error('Return save error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;