const mongoose = require('mongoose');

const UploadedProductSchema = new mongoose.Schema({
  // Store all fields as flexible key-value pairs
  itemCode: {
    type: String
  },
  itemName: {
    type: String
  },
  category: {
    type: String,
    default: "General"
  },
  buyingPrice: {
    type: Number,
    default: 0,
    min: [0, 'Price must be positive']
  },
  sellingPrice: {
    type: Number,
    default: 0,
    min: [0, 'Price must be positive']
  },
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  data: {
    type: Object,
    required: false
  },
  // Array of flag strings, e.g. ['missing:itemName', 'duplicate:itemCode']
  flags: {
    type: [String],
    default: []
  },
  uploadId: {
    type: String,
    required: false
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: String,
    required: false
  }
});

module.exports = mongoose.model('UploadedProduct', UploadedProductSchema); 