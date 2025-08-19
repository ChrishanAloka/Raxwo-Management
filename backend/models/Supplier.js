const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemCode: { type: String, required: true },
  itemName: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  buyingPrice: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  grnNumber:{ type: String, required: false }
});

const pastpaymentSchema = new mongoose.Schema({
  paymentdescription: { type: String, required: true },
  paymentCharge: { type: Number, required: true, min: 0 }
});

const repairServiceSchema = new mongoose.Schema({
  jobNumber: { type: String, required: false },
  repairDevice: { type: String, required: true },
  serielNo: { type: String, required: false },
  deviceIssue: { type: String, required: true },
  paymentdescription: { type: String, required: false },
  paymentCharge: { type: Number, required: true, min: 0 }
});

const supplierSchema = new mongoose.Schema({
  date: { type: String, required: true },
  time: { type: String, required: true },
  supplierName: { type: String, required: true },
  businessName: { type: String, required: false },
  phoneNumber: { type: String, required: false },
  address: { type: String, required: false },
  receiptNumber: { type: String, required: false },
  totalPayments: { type: Number, required: false, default: 0, min: 0 },
  pastPayments: [pastpaymentSchema],
  repairService: [repairServiceSchema],
  items: [itemSchema],
  changeHistory: [{
    field: { type: String, required: true },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    changedBy: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changeType: { type: String, enum: ['create', 'update', 'delete', 'cart'], required: true }
  }]
}, { timestamps: true });

module.exports = mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema);