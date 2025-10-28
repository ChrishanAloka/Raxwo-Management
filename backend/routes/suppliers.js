const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Supplier = require('../models/Supplier');
const GRN = require('../models/GRN');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/authMiddleware');
const logActivity = require('../utils/logActivity');

// GET: Get all suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Middleware: Function to get a supplier by ID with ObjectId validation
async function getSupplier(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid supplier ID format' });
  }

  let supplier;
  try {
    supplier = await Supplier.findById(req.params.id);
    if (supplier == null) {
      return res.status(404).json({ message: 'Cannot find supplier' });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
  res.supplier = supplier;
  next();
}

// GET: Fetch products by supplierName
router.get('/retitems/:supplierName', async (req, res) => {
  try {
    const { supplierName } = req.params;

    let filter = {};
    if (supplierName) {
      filter.Supplier = { $regex: new RegExp(supplierName, 'i') };
    }

    const products = await Product.find(filter).select(
      'itemCode itemName category stock buyingPrice returnstock Supplier'
    );

    res.json(products);
    console.log("log",supplierName)
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET: Get a single supplier by ID
router.get('/:id', getSupplier, (req, res) => {
  res.json(res.supplier);
});

// POST: Create a new supplier
router.post('/', authMiddleware, async (req, res) => {
  console.log('POST /api/suppliers body:', req.body);
  const supplierData = {
    date: req.body.date,
    time: req.body.time,
    businessName: req.body.businessName || '',
    supplierName: req.body.supplierName || '',
    phoneNumber: req.body.phoneNumber || '',
    address: req.body.address || '',
    totalPayments: req.body.totalPayments || 0,
    items: req.body.items || [],
    changeHistory: [{
      field: 'creation',
      oldValue: null,
      newValue: req.body,
      changedBy: req.body.changedBy || 'system',
      changedAt: new Date(),
      changeType: 'create'
    }]
  };

  const supplier = new Supplier(supplierData);

  try {
    const newSupplier = await supplier.save();

    // ✅ LOG: Create Supplier
    const name = newSupplier.businessName || newSupplier.supplierName || 'Unnamed Supplier';
    await logActivity({
      req,
      action: 'create',
      resource: 'Supplier',
      description: `Created supplier "${name}" with ${newSupplier.items.length} initial items`
    });
    
    console.log('POST /api/suppliers changeHistory:', newSupplier.changeHistory);
    res.status(201).json(newSupplier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH: Update an existing supplier
router.patch('/:id', authMiddleware, getSupplier, async (req, res) => {
  console.log('PATCH /api/suppliers/:id body:', req.body);
  const updates = {};
  if (req.body.date != null) updates.date = req.body.date;
  if (req.body.time != null) updates.time = req.body.time;
  if (req.body.supplierName != null) updates.supplierName = req.body.supplierName;
  if (req.body.businessName != null) updates.businessName = req.body.businessName;
  if (req.body.phoneNumber != null) updates.phoneNumber = req.body.phoneNumber;
  if (req.body.address != null) updates.address = req.body.address;
  if (req.body.totalPayments != null) updates.totalPayments = req.body.totalPayments;
  if (req.body.items != null) updates.items = req.body.items;
  
  // Track field changes for logging
  const changeDetails = [];
  // Log changes
  const changes = [];
  for (const [field, newValue] of Object.entries(updates)) {
    if (res.supplier[field] !== newValue) {
      const oldVal = formatValue(res.supplier[field]);
      const newVal = formatValue(newValue);
      changeDetails.push(`${field}: ${oldVal} → ${newVal}`);

      changes.push({
        field,
        oldValue: res.supplier[field],
        newValue,
        changedBy: req.body.changedBy || 'system',
        changedAt: new Date(),
        changeType: 'update'
      });
    }
  }
  if (changes.length > 0) {
    res.supplier.changeHistory = [...(res.supplier.changeHistory || []), ...changes];
  }

  // Apply updates to the supplier object
  for (const [field, value] of Object.entries(updates)) {
    res.supplier[field] = value;
  }

  try {
    const updatedSupplier = await res.supplier.save();

    // ✅ LOG DETAILED ACTIVITY
    if (changeDetails.length > 0) {
      const supplierName = updatedSupplier.businessName || updatedSupplier.supplierName || 'Unnamed Supplier';
      await logActivity({
        req,
        action: 'edit',
        resource: 'Supplier',
        description: `Updated supplier "${supplierName}": ${changeDetails.join('; ')}`
      });
    }

    console.log('PATCH /api/suppliers/:id changeHistory:', updatedSupplier.changeHistory);
    res.json(updatedSupplier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Helper to format values for logs
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

// DELETE: Remove a supplier
router.delete('/:id', authMiddleware, getSupplier, async (req, res) => {
  console.log('DELETE /api/suppliers/:id body:', req.body);
  try {
    const supplierName = res.supplier.businessName || res.supplier.supplierName || 'Unnamed Supplier';
    // Log delete
    res.supplier.changeHistory = [...(res.supplier.changeHistory || []), {
      field: 'deletion',
      oldValue: res.supplier.toObject(),
      newValue: null,
      changedBy: req.body.changedBy || 'system',
      changedAt: new Date(),
      changeType: 'delete'
    }];
    await res.supplier.save();
    console.log('DELETE /api/suppliers/:id changeHistory:', res.supplier.changeHistory);
    await res.supplier.deleteOne();

    // ✅ LOG: Delete Supplier
    await logActivity({
      req,
      action: 'Delete',
      resource: 'Supplier',
      description: `Deleted supplier "${supplierName}" (ID: ${res.supplier._id})`
    });


    res.json({ message: 'Supplier deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function getFormattedTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// POST: Add an item to a supplier's cart
router.post('/:id/items', authMiddleware, getSupplier, async (req, res) => {

  // Generate itemCode if missing
    const resitem = req.body;
    const categoryCode = resitem.category.slice(0, 3).toUpperCase(); // first 3 letters
    const itemNameNoSpaces = resitem.itemName.replace(/\s+/g, ''); // remove spaces
    const itemNameCode = itemNameNoSpaces.slice(0, 4).toUpperCase(); // first 4 letters

    const timestamp = getFormattedTimestamp();
    // const baseCode = `Ite${categoryCode}${itemNameCode}${Date.now().toString().slice(-3)}`;
    const baseCode = `Ite${timestamp}${categoryCode}${itemNameCode}`;
    let counter = 1;
    let candidate = baseCode + String(counter).padStart(2, '0');

    // Check DB and current batch
    // while (await Product.exists({ itemCode: candidate })) {
    //   counter++;
    //   candidate = baseCode + String(counter).padStart(2, '0');
    // }

  const now = new Date();

  const item = {
    date: now,          // your custom field
    createdAt: now,     // force Mongoose timestamp
    updatedAt: now, 
    itemCode: candidate,
    itemName: req.body.itemName,
    category: req.body.category,
    quantity: req.body.quantity,
    buyingPrice: req.body.buyingPrice,
    sellingPrice: req.body.sellingPrice,
    grnNumber: req.body.itemCode || 'GRN-' + Math.random().toString(36).substr(2, 9).toUpperCase()
  };

  res.supplier.items.push(item);

  try {
    const updatedSupplier = await res.supplier.save();

    // ✅ LOG: Add item to supplier
    await logActivity({
      req,
      action: 'edit',
      resource: 'Supplier',
      description: `Added item "${item.itemName}" (Code: ${item.itemCode}, Qty: ${item.quantity}, BuyingPrice: ${item.buyingPrice}) to supplier "${res.supplier.businessName || res.supplier.supplierName}"`
    });
    
    // ✅ Send back the itemCode in response
    res.status(201).json({
      message: 'Item added successfully',
      itemCode: item.itemCode,
      supplier: updatedSupplier   
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/:id/pastpayments', authMiddleware, getSupplier, async (req, res) => {
  
  const item = {
    paymentdescription: req.body.paymentdescription || "Empty",
    paymentCharge: req.body.paymentCharge || 0
  };

  res.supplier.pastPayments.push(item);

  try {
    const updatedSupplier = await res.supplier.save();

    // ✅ LOG: Add past payment
    await logActivity({
      req,
      action: 'edit',
      resource: 'Supplier',
      description: `Added past payment of ${item.paymentCharge} to supplier "${res.supplier.businessName || res.supplier.supplierName}" - Description: "${item.paymentdescription}"`
    });
    
    // ✅ Send back the itemCode in response
    res.status(201).json({
      message: 'Past Payment added successfully',
      supplier: updatedSupplier   
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/:id/discounts', authMiddleware, getSupplier, async (req, res) => {
  
  const item = {
    grnNumber: req.body.grnNumber || "-",
    discountdescription: req.body.discountdescription || "Empty",
    discountCharge: req.body.discountCharge || 0
  };

  res.supplier.discounts.push(item);

  try {
    const updatedSupplier = await res.supplier.save();

    // ✅ LOG: Add discount
    await logActivity({
      req,
      action: 'edit',
      resource: 'Supplier',
      description: `Added discount of ${item.discountCharge} to supplier "${res.supplier.businessName || res.supplier.supplierName}" - GRN: ${item.grnNumber}, Description: "${item.discountdescription}"`
    });
    
    // ✅ Send back the itemCode in response
    res.status(201).json({
      message: 'Discount added successfully',
      supplier: updatedSupplier   
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/:id/repairService', authMiddleware, getSupplier, async (req, res) => {
  
  const item = {
    jobNumber: req.body.jobNumber || "-",
    repairDevice: req.body.repairDevice,
    serielNo: req.body.serielNo || "-",
    deviceIssue: req.body.deviceIssue,
    paymentdescription: req.body.paymentdescription || "Empty",
    paymentCharge: req.body.paymentCharge || 0
  };

  res.supplier.repairService.push(item);

  try {
    const updatedSupplier = await res.supplier.save();

    // ✅ LOG: Add repair service
    await logActivity({
      req,
      action: 'edit',
      resource: 'Supplier',
      description: `Added repair service for "${item.repairDevice}" (Job: ${item.jobNumber}) to supplier "${res.supplier.businessName || res.supplier.supplierName}" - Charge: ${item.paymentCharge}, Issue: "${item.deviceIssue?.substring(0, 40)}${item.deviceIssue?.length > 40 ? '...' : ''}"`
    });
    
    // ✅ Send back the itemCode in response
    res.status(201).json({
      message: 'Repair Service added successfully',
      supplier: updatedSupplier   
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH: Update an item in a supplier's cart by item ID
router.patch('/:id/items/:itemid', authMiddleware, getSupplier, async (req, res) => {
  try {
    const itemId = req.params.itemid;

    // Find the item in the supplier's items array by _id
    const item = res.supplier.items.id(itemId); // Mongoose subdocument .id() method

    if (!item) {
      return res.status(404).json({ message: 'Item not found in supplier cart' });
    }

    // Store old value for logging (optional)
    const oldItem = { ...item.toObject() };

    // Update fields if provided
    // Track changes
    const itemChanges = [];
    if (req.body.itemCode != null && item.itemCode !== req.body.itemCode) {
      itemChanges.push(`itemCode: ${item.itemCode} → ${req.body.itemCode}`);
      item.itemCode = req.body.itemCode;
    }
    if (req.body.itemName != null && item.itemName !== req.body.itemName) {
      itemChanges.push(`itemName: ${item.itemName} → ${req.body.itemName}`);
      item.itemName = req.body.itemName;
    }
    if (req.body.category != null && item.category !== req.body.category) {
      itemChanges.push(`category: ${item.category} → ${req.body.category}`);
      item.category = req.body.category;
    }
    if (req.body.quantity != null && item.quantity !== req.body.quantity) {
      itemChanges.push(`quantity: ${item.quantity} → ${req.body.quantity}`);
      item.quantity = req.body.quantity;
    }
    if (req.body.buyingPrice != null && item.buyingPrice !== req.body.buyingPrice) {
      itemChanges.push(`buyingPrice: ${item.buyingPrice} → ${req.body.buyingPrice}`);
      item.buyingPrice = req.body.buyingPrice;
    }
    if (req.body.sellingPrice != null && item.sellingPrice !== req.body.sellingPrice) {
      itemChanges.push(`sellingPrice: ${item.sellingPrice} → ${req.body.sellingPrice}`);
      item.sellingPrice = req.body.sellingPrice;
    }
    if (req.body.grnNumber != null && item.grnNumber !== req.body.grnNumber) {
      itemChanges.push(`grnNumber: ${item.grnNumber} → ${req.body.grnNumber}`);
      item.grnNumber = req.body.grnNumber;
    }

    // if (itemChanges.length > 0) {
    //   res.supplier.changeHistory = [...(res.supplier.changeHistory || []), {
    //     field: 'cart-update',
    //     oldValue: oldItem,
    //     newValue: item.toObject(),
    //     changedBy,
    //     changedAt: new Date(),
    //     changeType: 'cart'
    //   }];
    // }

    // Optional: Log cart update in supplier history
    // res.supplier.changeHistory = [...(res.supplier.changeHistory || []), {
    //   field: 'cart-update',
    //   oldValue: oldItem,
    //   newValue: item,
    //   changedBy: req.body.changedBy || 'system',
    //   changedAt: new Date(),
    //   changeType: 'cart'
    // }];

    // Optional: Update product's changeHistory if product exists
    // try {
    //   const product = await Product.findOne({ itemCode: item.itemCode });
    //   if (product) {
    //     product.changeHistory = [...(product.changeHistory || []), {
    //       field: 'cart',
    //       oldValue: oldItem,
    //       newValue: item,
    //       changedBy: req.body.changedBy || 'system',
    //       changedAt: new Date(),
    //       changeType: 'cart'
    //     }];
    //     await product.save();
    //   }
    // } catch (err) {
    //   console.error('Error updating product changeHistory:', err);
    // }

    // Save updated supplier
    const updatedSupplier = await res.supplier.save();

    // ✅ LOG DETAILED ACTIVITY
    if (itemChanges.length > 0) {
      const supplierName = res.supplier.businessName || res.supplier.supplierName || 'Unnamed Supplier';
      await logActivity({
        req,
        action: 'edit',
        resource: 'Supplier',
        description: `Updated cart item "${oldItem.itemName}" (Code: ${oldItem.itemCode}) for supplier "${supplierName}": ${itemChanges.join('; ')}`
      });
    }

    res.status(200).json({
      message: 'Item updated successfully',
      itemCode: item.itemCode,
      itemId: item._id,
      supplier: updatedSupplier
    });
  } catch (err) {
    console.error('Error updating cart item:', err);
    res.status(400).json({ message: 'Bad request', error: err.message });
  }
});

// DELETE: Remove an item from a supplier's cart
router.delete('/:id/items/:itemIndex', authMiddleware, getSupplier, async (req, res) => {
  const itemIndex = parseInt(req.params.itemIndex);
  if (isNaN(itemIndex) || itemIndex < 0 || itemIndex >= res.supplier.items.length) {
    return res.status(400).json({ message: 'Invalid item index' });
  }

  const oldItem = { ...res.supplier.items[itemIndex] };
  res.supplier.items.splice(itemIndex, 1);

  // Log cart delete
  res.supplier.changeHistory = [...(res.supplier.changeHistory || []), {
    field: 'cart-delete',
    oldValue: oldItem,
    newValue: null,
    changedBy: req.body.changedBy || 'system',
    changedAt: new Date(),
    changeType: 'cart'
  }];

  try {
    const updatedSupplier = await res.supplier.save();

    // ✅ LOG: Delete item from supplier cart
    const supplierName = res.supplier.businessName || res.supplier.supplierName || 'Unnamed Supplier';
    await logActivity({
      req,
      action: 'Edit',
      resource: 'Supplier',
      description: `Removed item "${oldItem.itemName}" (Code: ${oldItem.itemCode}) from supplier "${supplierName}" cart`
    });

    res.json(updatedSupplier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST: Record a payment for a supplier
router.post('/:id/payments', authMiddleware, getSupplier, async (req, res) => {
  const { paymentAmount, paymentMethod, assignedTo, returnedProductsValue, grnNumber, description, paymentDate} = req.body;

  // Validate paymentDate if provided
  let parsedPaymentDate;
  if (paymentDate) {
    parsedPaymentDate = new Date(paymentDate);
    if (isNaN(parsedPaymentDate.getTime())) {
      return res.status(400).json({ message: 'Invalid paymentDate format' });
    }
  }
  
  if (typeof paymentAmount !== 'number' || paymentAmount <= 0) {
    return res.status(400).json({ message: 'Payment amount must be a positive number' });
  }


  // Calculate total cost and amount due
  const totalitemCost = res.supplier.items.reduce(
    (sum, item) => sum + (item.buyingPrice || 0) * (item.quantity || 0),
    0
  );
  const pastcharges = res.supplier.pastPayments.reduce(
    (sum, ppayments) => sum + (ppayments.paymentCharge || 0),
    0
  );
  const discounts= res.supplier.discounts.reduce(
    (sum, ppayments) => sum + (ppayments.discountCharge || 0),
    0
  );
  const repairServicecharges = res.supplier.repairService.reduce(
    (sum, ppayments) => sum + (ppayments.paymentCharge || 0),
    0
  );
  const paymentHistory = res.supplier.paymentHistory.reduce(
    (sum, ppayments) => sum + parseFloat(ppayments.currentPayment || 0),
    0
  );

  const totalCost = parseFloat(totalitemCost + pastcharges + repairServicecharges - discounts - returnedProductsValue).toFixed(2);
  const currentPayments = parseFloat(paymentHistory).toFixed(2) || 0;
  const amountDue = parseFloat(totalCost - currentPayments).toFixed(2);

  if (paymentAmount > amountDue) {
    return res.status(400).json({ message: 'Payment amount cannot exceed amount due' });
  }
  
  

  const paymenthistory = {
    date: parsedPaymentDate || new Date(),
    uptodateCost: amountDue || 0,
    currentPayment: parseFloat(paymentAmount).toFixed(2),
    amountDue: parseFloat(amountDue - paymentAmount).toFixed(2),
    assignedTo,
    paymentMethod,
    ...(grnNumber && { grnNumber }),      // Only add if exists
    ...(description && { description })   // Only add if exists
  };

  res.supplier.paymentHistory.push(paymenthistory);

  res.supplier.totalPayments = parseFloat(currentPayments) + parseFloat(paymentAmount);

try {
    const updatedSupplier = await res.supplier.save();

    // ✅ LOG: Payment recorded
    const supplierName = res.supplier.businessName || res.supplier.supplierName || 'Unnamed Supplier';
    await logActivity({
      req,
      action: 'edit',
      resource: 'Supplier',
      description: `Recorded payment of ${paymentAmount} to supplier "${supplierName}" via ${paymentMethod}${grnNumber ? ` (GRN: ${grnNumber})` : ''}${description ? ` - ${description}` : ''}`
    });
    
    res.status(200).json(updatedSupplier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST: Create a GRN for a supplier
router.post('/:id/grns', authMiddleware, getSupplier, async (req, res) => {
  try {
    const { items, totalAmount, grnNumber } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required for GRN' });
    }
    if (typeof totalAmount !== 'number' || totalAmount < 0) {
      return res.status(400).json({ message: 'Total amount must be a non-negative number' });
    }
    if (!grnNumber) {
      return res.status(400).json({ message: 'GRN is required' });
    }

    // Check if GRN is unique
    const existingGRN = await GRN.findOne({ grnNumber });
    if (existingGRN) {
      return res.status(400).json({ message: 'GRN must be unique' });
    }

    const grn = new GRN({
      supplier: res.supplier._id,
      date: new Date(),
      items,
      totalAmount,
      grnNumber
    });
    const newGRN = await grn.save();

    // ✅ LOG: GRN created
    const supplierName = res.supplier.businessName || res.supplier.supplierName || 'Unnamed Supplier';
    await logActivity({
      req,
      action: 'create',
      resource: 'Supplier',
      description: `Created GRN ${grnNumber} for supplier "${supplierName}" with ${items.length} items, total=${totalAmount}`
    });

    res.status(201).json(newGRN);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET: List all GRNs for a supplier
// router.get('/:id/grns', getSupplier, async (req, res) => {
//   try {
//     const grns = await GRN.find({ supplier: res.supplier._id });
//     res.json(grns);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// GET: Get a single GRN by its ID for a supplier
// router.get('/:id/grns/:grnId', getSupplier, async (req, res) => {
//   try {
//     const grn = await GRN.findOne({ _id: req.params.grnId, supplier: res.supplier._id });
//     if (!grn) {
//       return res.status(404).json({ message: 'GRN not found for this supplier' });
//     }
//     res.json(grn);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

router.get('/:id/items/grn/:grnNumber', async (req, res) => {
  try {
    const { id, grnNumber } = req.params;

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const filteredItems = supplier.items.filter(item => item.grnNumber === grnNumber);

    return res.json(filteredItems);
  } catch (err) {
    console.error('Error fetching supplier items by GRN:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE: Delete a GRN by its ID for a supplier
router.delete('/:id/grns/:grnId', authMiddleware, getSupplier, async (req, res) => {
  try {
    const grn = await GRN.findOneAndDelete({ _id: req.params.grnId, supplier: res.supplier._id });
    if (!grn) {
      return res.status(404).json({ message: 'GRN not found for this supplier' });
    }

    // ✅ LOG: Delete GRN
    const supplierName = res.supplier.businessName || res.supplier.supplierName || 'Unnamed Supplier';
    await logActivity({
      req,
      action: 'Delete',
      resource: 'GRN',
      description: `Deleted GRN ${grn.grnNumber} for supplier "${supplierName}"`
    });


    res.json({ message: 'GRN deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;