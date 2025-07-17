const mongoose = require('mongoose');

const UploadedProductSchema = new mongoose.Schema({
  // Store all fields as flexible key-value pairs
  data: {
    type: Object,
    required: true
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