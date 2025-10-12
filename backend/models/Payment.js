const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true },
    retquantity: { type: Number, required: false },
    givenQty: { type: Number, default: 0 },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    assignedTo: { type: String }
  }],
  serviceCharge: {
    type: Number,
    required: false
  },
  rettotalAmount: {
    type: Number,
    required: false
  },
  totalAmount: {
    type: Number,
    required: true
  },
  discountApplied: {
    type: Number,
    default: 0
  },
  returnAlert: { 
    type: String, 
    default: '' 
  },
  paymentMethod: {
    type: String,
    required: false
  },
  // In your Payment schema
  paymentMethods: [{
    method: { type: String, required: true }, // "Cash", "Card", etc.
    amount: { type: Number, required: true }
  }],
  totalPaid: { type: Number, required: false },
  changeGiven: { type: Number, default: 0 },
  cashierId: {
    type: String,
    required: true
  },
  cashierName: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    default: ''
  },
  contactNumber: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  assignedTo: { 
    type: String, 
    default: '' 
  },
  date: {
    type: Date,
    default: Date.now
  },
  creditedDate:{
    type: Date,
  },
  stockDeducted:{
    type: String,
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);