const express = require('express');
const multer = require('multer');
const router = express.Router();
const XLSX = require('xlsx');
const UploadedProduct = require('../models/Product');
const Item = require('../models/Product'); // Use your actual Item model here
const authMiddleware = require('../middleware/authMiddleware');
const logActivity = require('../utils/logActivity');

// Multer setup for Excel files
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed (.xlsx, .xls)'));
    }
  }
});

function getTimestamp() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}${h}${min}${s}`;
}

// POST /api/product-uploads/bulk-upload
router.post('/bulk-upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    const validItems = [];
    const errors = [];
    
    const generatedCodes = new Set(); // Track codes generated in this batch

    let grnnumbercount = 1;

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const item = {};
      const flags = [];

      // Map itemCode
      item.itemCode = (row['Item Code'] || row['itemCode'] || row['ItemCode'] || '').toString().trim();

      // Map itemName
      item.itemName = (row['Item Name'] || row['itemName'] || row['ItemName'] || '').toString().trim();
      if (!item.itemName) {
        flags.push('missing:itemName');
      }

      // Map category
      item.category = (row['Category'] || row['category'] || 'General').toString().trim().toLowerCase();

      // Map Grn No
      item.grnNumber = (row['GRN'] || row['grn'] || '' ).toString().trim().toLowerCase();
      if (!item.grnNumber) {
        let baseCode = `GRN-SYS`;
        item.grnNumber = baseCode + String(grnnumbercount).padStart(2, '0');
      }

      // Map buyingPrice
      item.buyingPrice = parseFloat(row['Buying Price'] || row['buyingPrice'] || row['BuyingPrice'] || 0);
      if (isNaN(item.buyingPrice) || item.buyingPrice < 0) {
        item.buyingPrice = 0;
        flags.push('invalid:buyingPrice');
      }

      // Map sellingPrice
      item.sellingPrice = parseFloat(row['Selling Price'] || row['sellingPrice'] || row['SellingPrice'] || 0);
      if (isNaN(item.sellingPrice) || item.sellingPrice < 0) {
        item.sellingPrice = 0;
        flags.push('invalid:sellingPrice');
      }

      // Map stock
      item.stock = parseInt(row['Stock'] || row['stock'] || 0, 10);
      if (isNaN(item.stock) || item.stock < 0) {
        item.stock = 0;
        flags.push('invalid:stock');
      }

      item.rowNumber = i + 2;

      // Only process if itemName is present
      if (!item.itemName) {
        errors.push({ item, flags });
        continue;
      }

      // Generate itemCode if missing
      if (!item.itemCode) {
        const categoryCode = item.category.slice(0, 3).toUpperCase(); // first 3 letters
        const itemNameNoSpaces = item.itemName.replace(/\s+/g, ''); // remove spaces
        const itemNameCode = itemNameNoSpaces.slice(0, 4).toUpperCase(); // first 4 letters

        const timestamp = getTimestamp(); // e.g. "20251011175055"
        let baseCode = `Ite${categoryCode}${itemNameCode}${timestamp}`;
        let counter = 1;
        let candidate = baseCode + String(counter).padStart(2, '0');

        // Check DB and current batch
        while (
          generatedCodes.has(candidate)
        ) {
          counter++;
          candidate = baseCode + String(counter).padStart(2, '0');
        }

        item.itemCode = candidate;
        generatedCodes.add(candidate); // Add to batch tracker
      }

      validItems.push(item);
    }

    grnnumbercount += 1;

    // Insert valid items
    if (validItems.length > 0) {
      await Item.insertMany(validItems);
    }

    // ✅ LOG: Bulk product upload
    await logActivity({
      req,
      action: 'create',
      resource: 'Product',
      description: `Bulk uploaded ${validItems.length} products from file "${req.file.originalname}" (${errors.length} rows flagged)`
    });

    res.json({
      message: 'Upload complete',
      count: jsonData.length,
      inserted: validItems.length,
      flagged: errors.length,
      errors: errors.length ? errors : null
    });

  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ message: 'Bulk upload failed', error: err.message });
  }
});

// GET /api/product-uploads (paginated)
router.get('/', async (req, res) => {
  try {
    const pipeline = [
      // Step 1: Apply your filters
      {
        $match: {
          deleted: { $ne: true },
          visible: { $ne: false },
          $or: [
            { stock: { $gt: 0 } }
          ]
        }
      },

      // Step 2: Sort by uploadedAt descending → newest first
      { $sort: { uploadedAt: -1 } },

      // Step 3: Group by the 3 fields to deduplicate
      {
        $group: {
          _id: {
            grnNumber: "$grnNumber",
            itemName: "$itemName",
            category: "$category",
            buyingPrice: "$buyingPrice"
          },
          doc: { $first: "$$ROOT" } // Keep the most recent (due to sort)
        }
      },

      // Step 4: Promote the full document back
      { $replaceRoot: { newRoot: "$doc" } }

      // No pagination: just return all unique docs
    ];

    const pipeline2 = [
      // Step 1: Apply your filters
      {
        $match: {
          deleted: { $ne: true },
          visible: { $ne: false },
          stock: { $eq: 0 } 
        }
      },

      // Step 2: Sort by uploadedAt descending → newest first
      { $sort: { uploadedAt: -1 } },

      // Step 3: Group by the 3 fields to deduplicate
      {
        $group: {
          _id: {
            grnNumber: "$grnNumber",
            itemName: "$itemName",
            category: "$category",
            buyingPrice: "$buyingPrice"
          },
          doc: { $first: "$$ROOT" } // Keep the most recent (due to sort)
        }
      },

      // Step 4: Promote the full document back
      { $replaceRoot: { newRoot: "$doc" } }

      // No pagination: just return all unique docs
    ];

    const pipeline3 = [
      // Step 1: Apply your filters
      {
        $match: {
          deleted: { $ne: true },
          visible: { $ne: false },
          stock: { $eq: 0 } 
        }
      },

      // Step 2: Sort by uploadedAt descending → newest first
      { $sort: { uploadedAt: -1 } },

      // Step 3: Group by the 3 fields to deduplicate
      {
        $group: {
          _id: {
            itemCode: "$itemCode"
          },
          doc: { $first: "$$ROOT" } // Keep the most recent (due to sort)
        }
      },

      // Step 4: Promote the full document back
      { $replaceRoot: { newRoot: "$doc" } }

      // No pagination: just return all unique docs
    ];

    const pipeline4 = [
      // Step 1: Apply your filters
      {
        $match: {
          deleted: { $ne: true },
          visible: { $ne: false },
          // stock: { $gt: 0 } 
        }
      },

      // Step 2: Sort by uploadedAt descending → newest first
      { $sort: { uploadedAt: -1 } },

      // Step 3: Group by the 3 fields to deduplicate
      {
        $group: {
          _id: {
            itemCode: "$itemCode"
          },
          doc: { $first: "$$ROOT" } // Keep the most recent (due to sort)
        }
      },

      // Step 4: Promote the full document back
      { $replaceRoot: { newRoot: "$doc" } }

      // No pagination: just return all unique docs
    ];

    // Add timeout to avoid hanging
    const uniqueRecords = await UploadedProduct.aggregate(pipeline)
      // .maxTimeMS(20000) // 20 seconds max
      .exec();

    const uniqueRecords2 = await UploadedProduct.aggregate(pipeline2)
      // .maxTimeMS(20000) // 20 seconds max
      .exec();

    const uniqueRecords3 = await UploadedProduct.aggregate(pipeline3)
      // .maxTimeMS(20000) // 20 seconds max
      .exec();

    const uniqueRecords4 = await UploadedProduct.aggregate(pipeline4)
      // .maxTimeMS(20000) // 20 seconds max
      .exec();

    // Optionally add total count
    const total = uniqueRecords.length + uniqueRecords2.length;

    const total4 = uniqueRecords4.length;

    const records = [...uniqueRecords, ...uniqueRecords2 ];

    res.json({
      success: true,
      total,
      total4,
      records,
      records4: uniqueRecords4,
      records3: uniqueRecords3
      
    });

  } catch (err) {
    console.error('Fetch all unique records error:', err);

    if (err.name === 'MongoTimeoutError' || err.message.includes('timed out')) {
      return res.status(504).json({
        success: false,
        message: 'Query timed out. Too much data? Try filtering or use pagination.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch records',
      error: err.message
    });
  }
});

// GET /api/product-uploads/export-all
router.get('/export-all', async (req, res) => {
  try {
    const records = await UploadedProduct.find().lean();
    // Flatten data and include flags
    const exportData = records.map(r => ({ ...r.data, flags: r.flags.join(', '), uploadId: r.uploadId, uploadedBy: r.uploadedBy, uploadedAt: r.uploadedAt }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'UploadedProducts');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="uploaded_products.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ message: 'Export failed', error: err.message });
  }
});

module.exports = router; 