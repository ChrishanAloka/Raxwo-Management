const express = require('express');
const router = express.Router(); // ✅ This line is required
const Return = require('../models/Return');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/authMiddleware');
const logActivity = require('../utils/logActivity');

// Add Return Record
router.post('/return', authMiddleware, async (req, res) => {
  try {
    const { productId, itemCode, itemName, returnQuantity, returnType } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const quantity = Number(returnQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Invalid return quantity' });
    }

    if (returnType === 'out-stock') {
      if (product.stock < quantity) {
        return res.status(400).json({ message: 'Return quantity exceeds available stock' });
      }
      product.stock -= quantity; // Reduce stock if returned out of stock
    }

    await product.save();

    const newReturn = new Return({
      productId,
      itemCode,
      itemName,
      returnQuantity,
      returnType
    });

    const savedReturn = await newReturn.save();

    // ✅ LOG: Create Return
    await logActivity({
      req,
      action: 'create',
      resource: 'Return',
      description: `Recorded return of ${quantity} units of "${itemName}" (Code: ${itemCode}) - Type: ${returnType}`
    });

    res.json({ message: 'Return recorded successfully', newReturn: savedReturn });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


