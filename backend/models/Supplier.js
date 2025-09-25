const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  date: {type: Date, default: Date.now},
  itemCode: { type: String, required: true },
  itemName: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  buyingPrice: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  grnNumber:{ type: String, required: false }
}, { timestamps: true });

const pastpaymentSchema = new mongoose.Schema({
  date: {type: Date, default: Date.now},
  paymentdescription: { type: String, required: true },
  paymentCharge: { type: Number, required: true, min: 0 }
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
  date: {type: Date, default: Date.now},
  grnNumber: { type: String, required: false },
  description: { type: String, required: false },
  uptodateCost: { type: String, required: true },
  currentPayment: { type: String, required: true },
  amountDue: { type: String, required: true },
  assignedTo: { type: String, required: false },
  paymentMethod: { type: String, required: false },
}, { timestamps: true });

const repairServiceSchema = new mongoose.Schema({
  date: {type: Date, default: Date.now},
  jobNumber: { type: String, required: false },
  repairDevice: { type: String, required: true },
  serielNo: { type: String, required: false },
  deviceIssue: { type: String, required: true },
  paymentdescription: { type: String, required: false },
  paymentCharge: { type: Number, required: true, min: 0 }
}, { timestamps: true });

const discountSchema = new mongoose.Schema({
  date: {type: Date, default: Date.now},
  grnNumber: { type: String, required: false },
  discountdescription: { type: String, required: true },
  discountCharge: { type: Number, required: true, min: 0 }
}, { timestamps: true });

const supplierSchema = new mongoose.Schema({
  date: { type: String, required: true },
  time: { type: String, required: true },
  supplierName: { type: String, required: true },
  businessName: { type: String, required: false },
  phoneNumber: { type: String, required: false },
  address: { type: String, required: false },
  receiptNumber: { type: String, required: false },
  paymentHistory: [paymentSchema],
  totalPayments: { type: Number, required: false, default: 0, min: 0 },
  pastPayments: [pastpaymentSchema],
  repairService: [repairServiceSchema],
  discounts: [discountSchema],
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