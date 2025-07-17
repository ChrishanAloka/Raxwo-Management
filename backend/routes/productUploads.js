const express = require('express');
const multer = require('multer');
const router = express.Router();
const XLSX = require('xlsx');
const UploadedProduct = require('../models/UploadedProduct');

// Multer setup for Excel files
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed (.xlsx, .xls)'));
    }
  }
});

// POST /api/product-uploads/bulk-upload
router.post('/bulk-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const uploadedBy = req.body.uploadedBy || 'system';
    const uploadId = req.body.uploadId || null;
    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // Find duplicates by a chosen field (e.g., itemCode or itemName)
    const seen = new Set();
    const records = jsonData.map((row, idx) => {
      const flags = [];
      // Example required fields: itemName, itemCode
      if (!row['Item Name'] && !row['itemName'] && !row['ItemName']) {
        flags.push('missing:itemName');
      }
      if (!row['Item Code'] && !row['itemCode'] && !row['ItemCode']) {
        flags.push('missing:itemCode');
      }
      // Check for duplicate itemCode (case-insensitive)
      const code = (row['Item Code'] || row['itemCode'] || row['ItemCode'] || '').toString().toLowerCase();
      if (code) {
        if (seen.has(code)) {
          flags.push('duplicate:itemCode');
        } else {
          seen.add(code);
        }
      }
      return {
        data: row,
        flags,
        uploadId,
        uploadedBy
      };
    });

    // Insert all records (even with flags)
    await UploadedProduct.insertMany(records);
    res.json({ message: 'Upload successful', count: records.length, flagged: records.filter(r => r.flags.length > 0).length });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ message: 'Bulk upload failed', error: err.message });
  }
});

// GET /api/product-uploads (paginated)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await UploadedProduct.countDocuments();
    const records = await UploadedProduct.find()
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      records
    });
  } catch (err) {
    console.error('Pagination error:', err);
    res.status(500).json({ message: 'Pagination failed', error: err.message });
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