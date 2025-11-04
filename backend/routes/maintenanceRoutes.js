const express = require("express");
const router = express.Router();
const Maintenance = require("../models/Maintenance");
const authMiddleware = require('../middleware/authMiddleware');
const logActivity = require('../utils/logActivity');

router.post("/", authMiddleware, async (req, res) => {
    try {
        console.log("Incoming request body:", req.body); // Debugging
        
        const { serviceType, price, remarks, date, time, paymentMethod, assignedTo} = req.body;

        if (!serviceType || !price) {
            return res.status(400).json({ message: "Service Type and Price are required" });
        }

        // const date = new Date().toISOString().split("T")[0]; // Auto-fill date (YYYY-MM-DD)
        // const time = new Date().toLocaleTimeString(); // Auto-fill time (HH:MM:SS)
        // Combine date and time to form a valid ISO string
        const dateTimeString = `${date}T${time}`;
        const parsedTime = new Date(dateTimeString);

        // Validate the resulting date/time
        if (isNaN(parsedTime)) {
            return res.status(400).json({ message: "Invalid date or time format" });
        }

        // Format to HH:mm:ss (24-hour format)
        const utime = parsedTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }); // e.g., "14:30:00"

        // ✅ Fix: Ensure `no` is always a valid number
        const lastRecord = await Maintenance.findOne().sort({ no: -1 });

        let newNo = 1;  // Default to 1 if no records exist
        if (lastRecord && lastRecord.no) {
            newNo = lastRecord.no + 1;
        }

        const newMaintenance = new Maintenance({ 
            no: newNo, 
            date, 
            time: utime, 
            serviceType, 
            price, 
            remarks,
            paymentMethod,
            assignedTo,  
        });

        const savedMaintenance = await newMaintenance.save();
        console.log("✅ Maintenance record saved:", savedMaintenance);

        // ✅ LOG: Create Maintenance
        await logActivity({
        req,
        action: 'create',
        resource: 'Maintenance',
        description: `Created maintenance service #${savedMaintenance.no}: "${savedMaintenance.serviceType}" for ${savedMaintenance.price} on ${savedMaintenance.date} at ${savedMaintenance.time}${savedMaintenance.remarks ? ` (Remarks: "${savedMaintenance.remarks}")` : ''}`
        });
        
        res.status(201).json(savedMaintenance);
    } catch (error) {
        console.error("🔥 Error adding maintenance record:", error);
        res.status(500).json({ message: error.message });
    }
});
// Get All Maintenance Records
router.get("/", async (req, res) => {
    try {
        const maintenanceRecords = await Maintenance.find().sort({ no: -1 });
        res.status(200).json(maintenanceRecords);
    } catch (error) {
        console.error("Error fetching maintenance records:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Get a Single Maintenance Record
router.get("/:id", async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id);
        if (!maintenance) return res.status(404).json({ message: "Not Found" });

        res.status(200).json(maintenance);
    } catch (error) {
        console.error("Error fetching maintenance record:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Update Maintenance Record
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        
        const { serviceType, price, remarks, date, time, paymentMethod, assignedTo } = req.body;

        // Validate required fields
        if (!serviceType || typeof price !== 'number' || !date || !time) {
            return res.status(400).json({ 
                message: "Missing required fields: serviceType, price, date, or time" 
            });
        }
        // Combine date and time to form a valid ISO string
        const dateTimeString = `${date}T${time}`;
        const parsedTime = new Date(dateTimeString);

        // Validate the resulting date/time
        if (isNaN(parsedTime)) {
            return res.status(400).json({ message: "Invalid date or time format" });
        }

        // Format to HH:mm:ss (24-hour format)
        const utime = parsedTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }); // e.g., "14:30:00"

        const updatedMaintenance = await Maintenance.findByIdAndUpdate(
            req.params.id,
            { serviceType, price, remarks, date, time: utime, paymentMethod, assignedTo},
            { new: true }
        );

        // ✅ LOG: Edit Maintenance
        await logActivity({
            req,
            action: 'Edit',
            resource: 'Maintenance',
            description: `Updated maintenance service #${updatedMaintenance.no}: "${updatedMaintenance.serviceType}" to price ${updatedMaintenance.price} on ${updatedMaintenance.date}${updatedMaintenance.remarks ? ` (Remarks: "${updatedMaintenance.remarks}")` : ''}`
        });

        res.status(200).json(updatedMaintenance);
    } catch (error) {
        console.error("Error updating maintenance record:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Delete Maintenance Record
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id);
        if (!maintenance) {
        return res.status(404).json({ message: "Maintenance record not found" });
        }
        
        await Maintenance.findByIdAndDelete(req.params.id);
        
        await logActivity({
            req,
            action: 'delete',
            resource: 'Maintenance',
            description: `Deleted maintenance service #${maintenance.no}: "${maintenance.serviceType}" for ${maintenance.price} on ${maintenance.date}`
        });
        
        res.status(200).json({ message: "Deleted successfully" });
    } catch (error) {
        console.error("Error deleting maintenance record:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

module.exports = router;
