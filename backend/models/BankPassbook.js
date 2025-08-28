// models/BankPassbook.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  date: { type: String, required: true },
  time: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['Credit', 'Debit'], required: true },
  amount: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('BankPassbook', transactionSchema);