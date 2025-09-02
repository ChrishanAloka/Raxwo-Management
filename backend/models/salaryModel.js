const mongoose = require("mongoose");

const salarySchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    advance: { type: Number, required: true },
    remarks: { type: String },
    date: { type: Date, default: Date.now },
    assignedTo: { type: String, required: false },
    paymentMethod: { type: String, required: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Salary", salarySchema);