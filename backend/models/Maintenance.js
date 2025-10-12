const mongoose = require("mongoose");

const MaintenanceSchema = new mongoose.Schema({
    no: { type: Number, unique: true, sparse: true, required: true },  // Ensure it's a number
    date: { type: String, required: true },
    time: { type: String, required: true },
    serviceType: { type: String, required: true },
    price: { type: Number, required: true },
    remarks: { type: String, required: false },
    assignedTo: { type: String, required: false },
    paymentMethod: { type: String, required: false },
},{ timestamps: true });

MaintenanceSchema.set('timestamps', true);

module.exports = mongoose.model("Maintenance", MaintenanceSchema);
