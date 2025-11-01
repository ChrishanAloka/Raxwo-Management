const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const Counter = require('../models/Counter');
const Repair = require("../models/ProductRepair");
const authMiddleware = require('../middleware/authMiddleware');
const logActivity = require('../utils/logActivity');

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
    const { items, totalAmount, discountApplied, paymentMethods, totalPaid, changeGiven, cashierId, cashierName, customerName, contactNumber, address, description, assignedTo, isWholesale, customerDetails, paymentDate, creditedDate, hasCredit } = req.body;
    console.log('Received payment data in backend:', { items, totalAmount, discountApplied, cashierId, cashierName, customerName, contactNumber, address, description, assignedTo, isWholesale, customerDetails }); // Debug log

    const calculatedTotalPaid = paymentMethods.reduce((sum, p) => sum + (p.amount || 0), 0);
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided' });
    }
    
    else if (!totalAmount || !paymentMethods || !Array.isArray(paymentMethods) || paymentMethods.length === 0) {
      return res.status(400).json({ message: 'Total amount and at least one payment method are required' });
    }

    else if (Math.abs(calculatedTotalPaid - totalPaid) > 0.01 && !hasCredit) {
      return res.status(400).json({ message: 'Total paid does not match sum of payment methods' });
    }

    else if (totalPaid < totalAmount && !hasCredit) {
      return res.status(400).json({ message: 'Total paid is less than total amount due' });
    }

    else if (!cashierId || !cashierName) {
      return res.status(400).json({ message: 'Cashier ID and name are required' });
    }

    else {

      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product || product.stock < item.quantity) {
          return res.status(400).json({ message: `Insufficient stock for ${item.itemName}` });
        }
      }

      // for (const item of items) {
      //   await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
      // }

      const invoiceNumber = `INV-${await getNextInvoiceNumber()}`;

      const payment = new Payment({
        invoiceNumber,
        items,
        totalAmount,
        discountApplied: discountApplied || 0,
        paymentMethods, // ✅ array
        totalPaid,
        changeGiven,
        cashierId,
        cashierName,
        customerName: customerName || '',
        contactNumber: contactNumber || '',
        address: address || '',
        description: description || '',
        assignedTo: assignedTo || '',
        isWholesale: isWholesale || false,
        customerDetails: isWholesale ? customerDetails : null,
        date: paymentDate,
        creditedDate: creditedDate,
        stockDeducted: false,
      });

      const savedPayment = await payment.save();
      console.log('Saved payment document:', savedPayment); // Debug log

      try {
        for (const item of items) {
          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: -item.quantity } }
          );
        }

        // ✅ Mark stock as deducted
        await Payment.findByIdAndUpdate(savedPayment._id, { stockDeducted: true });
      } catch (stockError) {
        // ⚠️ Stock deduction failed — but payment exists!
        console.error(`Stock deduction failed for ${invoiceNumber}:`, stockError);
        // → Log for admin review, or trigger alert
        // → Optionally: send to queue for retry
      }

      // ✅ LOG: Create Payment (Sale)
      const customer = customerName || contactNumber || 'Anonymous';
      await logActivity({
        req,
        action: 'create',
        resource: 'Payment',
        description: `Processed sale ${invoiceNumber} for ${items.length} items, total=${savedPayment.totalAmount}, customer="${customer}", cashier="${savedPayment.cashierName}"`
      });

      res.status(201).json({ 
        message: 'Payment successful', 
        payment: savedPayment, 
        invoiceNumber 
      });
    }
  } catch (err) {
    console.error('Payment save error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET: Retrieve all payments (Protected route)
router.get('/', authMiddleware, async (req, res) => {
  try {
    // if(req.user.role === 'admin'){
    const payments = await Payment.find().populate('items.productId').sort({ createdAt: -1 });
    console.log('Fetched payments from backend:', payments); // Debug log
    res.json(payments);
    // }
    // else{
    //   res.status(500).json({ message: "User is not an admin" });
    // }
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
    }).select('invoiceNumber customerName items returnAlert createdAt');

    // Step 3: Extract and group item usage, summing quantities by invoice
    const usageMap = new Map();

    payments.forEach(payment => {
      const matchedItems = payment.items.filter(item => item.productId.equals(productId));
      const totalQuantityInPayment = matchedItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalRetQuantityInPayment = matchedItems.reduce((sum, item) => sum + item.retquantity, 0);
      const totalgivenQuantityInPayment = matchedItems.reduce((sum, item) => sum + item.givenQty, 0);

      const invoiceNo = payment.invoiceNumber;
      if (usageMap.has(invoiceNo)) {
        // If invoice already exists, add quantity
        const existing = usageMap.get(invoiceNo);
        usageMap.set(invoiceNo, {
          ...existing,
          quantity: existing.quantity + totalQuantityInPayment,
          retquantity: existing.retquantity + totalRetQuantityInPayment,
          givenQty: existing.givenQty + totalgivenQuantityInPayment,
          retalert: payment.returnAlert,
        });
      } else {
        // New invoice entry
        usageMap.set(invoiceNo, {
          type: 'Payment',
          invoiceNo,
          customerName: payment.customerName || 'Unknown',
          quantity: totalQuantityInPayment,
          retquantity: totalRetQuantityInPayment,
          givenQty: totalgivenQuantityInPayment,
          retalert: payment.returnAlert,
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

// Add this route in your payments (or a new usage) router
router.get('/track-all', async (req, res) => {
  try {
    // Step 1: Fetch all products to map itemCode <-> productId
    const allProducts = await Product.find({}, 'itemCode');
    const productMap = {};
    allProducts.forEach(p => {
      productMap[p._id.toString()] = p.itemCode;
    });

    // Step 2: Fetch all payments
    const payments = await Payment.find(
      { 'items.productId': { $exists: true, $ne: null } },
      'items createdAt'
    ).lean();

    // Step 3: Fetch all repairs (assuming you have a Repair model)
    const repairs = await Repair.find(
      { $or: [{ 'repairCart.itemCode': { $exists: true } }, { 'returnCart.itemCode': { $exists: true } }] },
      'repairCart returnCart createdAt'
    ).lean();

    // Step 4: Initialize usage accumulator
    const usageByItemCode = {};

    // Helper to ensure key exists
    const addUsage = (itemCode, qty) => {
      if (!usageByItemCode[itemCode]) usageByItemCode[itemCode] = 0;
      usageByItemCode[itemCode] += qty;
    };

    // Process payments
    payments.forEach(payment => {
      (payment.items || []).forEach(item => {
        const pid = item.productId?.toString();
        if (pid && productMap[pid]) {
          addUsage(productMap[pid], item.quantity || 0);
        }
      });
    });

    // Process repairs (used = positive)
    repairs.forEach(repair => {
      (repair.repairCart || []).forEach(item => {
        if (item.itemCode) {
          addUsage(item.itemCode, item.quantity || 0);
        }
      });
    });

    // Process repair returns (returned = negative usage)
    repairs.forEach(repair => {
      (repair.returnCart || []).forEach(item => {
        if (item.itemCode) {
          addUsage(item.itemCode, -(item.quantity || 0)); // subtract returned
        }
      });
    });

    // Optional: Remove zero or negative-only entries? Keep all for consistency.
    res.json(usageByItemCode);
  } catch (err) {
    console.error('Error in /track-all:', err);
    res.status(500).json({ message: 'Failed to fetch global usage data', error: err.message });
  }
});

// In your payments router file (e.g., routes/payments.js)

router.get('/with-itemcodes', async (req, res) => {
  try {
    // Step 1: Fetch all products (include buyingPrice and stock)
    const products = await Product.find().select('_id itemCode category buyingPrice stock').lean();
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // Step 2: Fetch all payments
    const payments = (await Payment.find().lean().sort({ createdAt: -1 }));

    // Step 3: Enrich each payment item with category, buyingPrice, and stock
    const enrichedPayments = payments.map(payment => {
      const enrichedItems = (payment.items || []).map(item => {
        const product = productMap.get(item.productId?.toString());
        return {
          ...item,
          itemCode: product?.itemCode || 'NoItemCode',
          category: product?.category || 'Uncategorized',
          buyingPrice: product?.buyingPrice || 0,
          stock: product?.stock || 0
        };
      });
      return { ...payment, items: enrichedItems };
    });

    res.json(enrichedPayments);
  } catch (error) {
    console.error('Error in /with-categories:', error);
    res.status(500).json({ message: 'Failed to fetch payments with categories' });
  }
});

// routes/payments.js
router.get('/with-categories', async (req, res) => {
  try {
    // Step 1: Fetch all products (include buyingPrice and stock)
    const products = await Product.find().select('_id category buyingPrice stock').lean();
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // Step 2: Fetch all payments
    const payments = (await Payment.find().lean().sort({ createdAt: -1 }));

    // Step 3: Enrich each payment item with category, buyingPrice, and stock
    const enrichedPayments = payments.map(payment => {
      const enrichedItems = (payment.items || []).map(item => {
        const product = productMap.get(item.productId?.toString());
        return {
          ...item,
          category: product?.category || 'Uncategorized',
          buyingPrice: product?.buyingPrice || 0,
          stock: product?.stock || 0
        };
      });
      return { ...payment, items: enrichedItems };
    });

    res.json(enrichedPayments);
  } catch (error) {
    console.error('Error in /with-categories:', error);
    res.status(500).json({ message: 'Failed to fetch payments with categories' });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // ✅ Allow both legacy (single) and new (split) payment fields
    const allowedTopLevelFields = [
      'invoiceNumber',
      'paymentMethod',        // ← Keep this for legacy/single-method
      'discountApplied',
      'totalAmount',
      'cashierName',
      'cashierId',
      'customerName',
      'contactNumber',
      'address',
      'description',
      'assignedTo',
      'returnAlert',
      'serviceCharge',
      'rettotalAmount',
      // New split-payment fields (optional)
      'paymentMethods',
      'totalPaid',
      'changeGiven'
    ];

    const topLevelChanges = [];

    // 🔁 Process all allowed top-level fields
    Object.keys(updates)
      .filter(key => allowedTopLevelFields.includes(key))
      .forEach(key => {
        let newValue = updates[key];
        let oldValue = payment[key];

        // Special handling for paymentMethods (array)
        if (key === 'paymentMethods') {
          if (!Array.isArray(newValue) || newValue.length === 0) {
            throw new Error('paymentMethods must be a non-empty array');
          }
          // Validate structure
          newValue = newValue.map(pm => ({
            method: pm.method,
            amount: parseFloat(pm.amount)
          }));
          // Check duplicates
          const methods = newValue.map(pm => pm.method);
          if (new Set(methods).size !== methods.length) {
            throw new Error('Duplicate payment methods are not allowed');
          }
          // Validate totalPaid if totalAmount exists
          const totalPaid = newValue.reduce((sum, pm) => sum + pm.amount, 0);
          if (totalPaid < payment.totalAmount) {
            throw new Error('Total paid cannot be less than total amount due');
          }
          updates.totalPaid = totalPaid;
          updates.changeGiven = totalPaid - payment.totalAmount;
        }

        // Compare values (handle null/undefined)
        const oldFormatted = formatValue(oldValue);
        const newFormatted = formatValue(newValue);

        if (oldFormatted !== newFormatted) {
          topLevelChanges.push(`${key}: ${oldFormatted} → ${newFormatted}`);
          payment[key] = newValue;
        }
      });

    // 🔍 Track item-level changes (unchanged from your original logic)
    const itemChanges = [];
    let itemsUpdated = false;

    if (Array.isArray(updates.items)) {
      for (const update of updates.items) {
        const itemId = update._id;
        if (!itemId) {
          return res.status(400).json({ message: 'Missing _id in item update' });
        }

        const item = payment.items.id(itemId);
        if (!item) {
          return res.status(404).json({ message: `Item with _id ${itemId} not found` });
        }

        if (update.assignedTo !== undefined && item.assignedTo !== update.assignedTo) {
          const oldVal = formatValue(item.assignedTo);
          const newVal = formatValue(update.assignedTo);
          itemChanges.push(`Item "${item.itemName}" assignedTo: ${oldVal} → ${newVal}`);
          item.assignedTo = update.assignedTo;
          itemsUpdated = true;
        }

        if (update.retquantity !== undefined && item.retquantity !== update.retquantity) {
          const oldVal = formatValue(item.retquantity);
          const newVal = formatValue(update.retquantity);
          const deltaret = update.retquantity - item.retquantity;
          itemChanges.push(`Item "${item.itemName}" retquantity: ${oldVal} → ${newVal}`);

          if (item.retquantity < update.retquantity) {
            if (update.productId) {
              await Product.findByIdAndUpdate(update.productId, { $inc: { returnstock: deltaret } });
            }
          }
          else if (update.retquantity < item.retquantity){
            if (update.productId) {
              await Product.findByIdAndUpdate(update.productId, { $inc: { returnstock: deltaret } });
            }
          }

          if (deltaret > 0) {
            const product = await Product.findById(update.productId);
            if (product && (product.returnRelease || 0) > 0) {
              // Reduce returnRelease by min(deltaRet, current returnRelease)
              const reduceBy = Math.min(product.returnRelease, deltaret);
              product.returnRelease = Math.max(0, product.returnRelease - reduceBy);
              console.log(`Reduced returnRelease by ${reduceBy} for ${product.itemCode}`);
            }
          }
          
          item.retquantity = update.retquantity;
          itemsUpdated = true;
        }

        if (update.givenQty !== undefined) {
          const delta = update.givenQty - item.givenQty;
          if (delta > 0 && update.productId) {
            const product = await Product.findById(update.productId);
            if (!product) {
              return res.status(404).json({ message: `Product not found for item: ${item.itemName}` });
            }
            if (product.stock < delta) {
              return res.status(400).json({
                message: `Insufficient stock for "${item.itemName}". Available: ${product.stock}, Requested: ${delta}`
              });
            }
            await Product.findByIdAndUpdate(update.productId, { $inc: { stock: -delta } });
          }
          else if (delta < 0 && update.productId){
            const product = await Product.findById(update.productId);
            if (!product) {
              return res.status(404).json({ message: `Product not found for item: ${item.itemName}` });
            }
            await Product.findByIdAndUpdate(update.productId, { $inc: { stock: -delta } });
          }
          if (item.givenQty !== update.givenQty) {
            const oldVal = formatValue(item.givenQty);
            const newVal = formatValue(update.givenQty);
            itemChanges.push(`Item "${item.itemName}" givenQty: ${oldVal} → ${newVal}`);
            item.givenQty = update.givenQty;
            itemsUpdated = true;
          }
        }
      }
    }

    // Save if changes detected
    if (topLevelChanges.length > 0 || itemsUpdated) {
      payment.changedBy = req.user.username;
      payment.changeSource = req.body.changeSource || 'Payment';
      await payment.save();

      const customer = payment.customerName || payment.contactNumber || 'Anonymous';
      const allChanges = [...topLevelChanges, ...itemChanges];
      await logActivity({
        req,
        action: 'edit',
        resource: 'Payment',
        description: `Updated payment ${payment.invoiceNumber} for "${customer}": ${allChanges.join('; ')}`
      });

      return res.json(payment);
    } else {
      return res.status(400).json({ message: 'No valid changes detected' });
    }
  } catch (err) {
    console.error('Error updating payment:', err.message);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

function formatValue(val) {
  if (val === null || val === undefined) return 'null';
  
  if (typeof val === 'number') {
    return val.toFixed(2);
  }

  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      // Format array of objects specially for paymentMethods
      if (val.length > 0 && val[0] && typeof val[0] === 'object' && val[0].method !== undefined) {
        return val.map(pm => `${pm.method}: ${pm.amount}`).join(', ');
      }
      // Fallback for other arrays
      return `[${val.map(formatValue).join(', ')}]`;
    }
    // Handle plain objects (e.g., { method: "Cash", amount: 500 })
    if (val.method !== undefined && val.amount !== undefined) {
      return `${val.method}: ${val.amount}`;
    }
    // Generic object fallback (avoid [object Object])
    try {
      return JSON.stringify(val);
    } catch {
      return '[object]';
    }
  }

  // Fallback for strings, booleans, etc.
  return String(val).substring(0, 50) + (String(val).length > 50 ? '...' : '');
}

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

    const customer = payment.customerName || payment.contactNumber || 'Anonymous';
    await logActivity({
      req,
      action: 'delete',
      resource: 'Payment',
      description: `Deleted payment ${payment.invoiceNumber} for ${payment.items.length} items, total=${payment.totalAmount}, customer="${customer}"`
    });

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

    // ✅ LOG: Create Payment (Return/Refund)
    const customer = customerName || contactNumber || 'Anonymous';
    await logActivity({
      req,
      action: 'create',
      resource: 'Payment',
      description: `Processed return ${returnInvoiceNumber} for ${items.length} items, refund=${totalRefund}, customer="${customer}", cashier="${savedReturn.cashierName}"`
    });
    
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