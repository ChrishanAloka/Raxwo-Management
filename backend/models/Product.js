const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
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
  Supplier: {
    type: String,
    default: 'Unknown'
  },
  // New Updated Values
  newBuyingPrice: {
    type: Number,
    min: [0, 'Price must be positive']
  },
  newSellingPrice: {
    type: Number,
    min: [0, 'Price must be positive']
  },
  newStock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  // Old Values
  oldStock: Number,
  oldBuyingPrice: Number,
  oldSellingPrice: Number,
  // Change history to track modifications
  changeHistory: [{
    field: { type: String },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    changedBy: { type: String },
    changedAt: { type: Date, default: Date.now },
    changeType: { type: String, enum: ['create', 'update', 'delete', 'stock'] }
  }],
  // Add deleted flag to track soft-deleted products
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: String },
  // Add visible flag to track product visibility
  visible: { type: Boolean, default: true },
  hiddenAt: { type: Date },
  hiddenBy: { type: String },
  // Add clicked flag to track if product has been clicked with Add Product button
  clickedForAdd: { type: Boolean, default: false },
  clickedAt: { type: Date },
  clickedBy: { type: String }
}, { timestamps: true });

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);