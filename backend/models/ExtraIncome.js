const mongoose = require("mongoose");

const extraIncomeSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  incomeType: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  serviceCharge: {
    type: Number,
    required: false
  },
  totalAmount: {
    type: Number,
    required: false
  },
  description: {
    type: String,
    trim: true,
    default: "",
  },
  returnAlert: { 
    type: String, 
    default: '' 
  },
  assignedTo: { 
    type: String, 
    default: '' 
  },
  paymentMethod: {
    type: String, 
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("ExtraIncome", extraIncomeSchema);