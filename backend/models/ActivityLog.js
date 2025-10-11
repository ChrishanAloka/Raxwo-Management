// models/ActivityLog.js
const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    }
  },
  action: {
    type: String,
    // enum: ['login', 'logout', 'create', 'edit', 'delete'],
    required: true
  },
  resource: {
    type: String,
    // enum: ['Supplier', 'Product', 'GRN', 'User', 'Payment', 'System'],
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);