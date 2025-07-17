import React, { useState, useEffect } from "react";
import "../styles/SupplierAdd.css";
import '../styles/EditUser.css';

const API_URL = "https://raxwo-manage-backend-production.up.railway.app/api/suppliers";

const SupplierUpdate = ({ isOpen, onClose, supplierId, refreshSuppliers, darkMode }) => {
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    businessName: "",
    supplierName: "",
    phoneNumber: "",
    address: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Function to get current date & time
  const getCurrentDateTime = () => {
    const now = new Date();
    const formattedDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const formattedTime = now.toLocaleTimeString("en-US", { hour12: false }); // HH:MM:SS
    return { date: formattedDate, time: formattedTime };
  };

  // Fetch supplier data and auto-fill date & time
  useEffect(() => {
    if (supplierId) {
      fetch(`${API_URL}/${supplierId}`)
        .then((response) => response.json())
        .then((data) =>
          setFormData({
            date: data.date || getCurrentDateTime().date,
            time: data.time || getCurrentDateTime().time,
            businessName: data.businessName || "",
            supplierName: data.supplierName || "",
            phoneNumber: data.phoneNumber || "",
            address: data.address || "",
          })
        )
        .catch((error) => {
          console.error("Error fetching supplier:", error);
          setError("Failed to fetch supplier data");
        });
    }
  }, [supplierId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const changedBy = localStorage.getItem('username') || localStorage.getItem('cashierName') || 'system';
      const response = await fetch(`${API_URL}/${supplierId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, changedBy }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update supplier");
      }
      setSuccess("Supplier updated successfully!");
      refreshSuppliers();
      setTimeout(() => onClose(), 1000);
    } catch (error) {
      setError(error.message);
      console.error("Error updating supplier:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${darkMode ? "dark" : "light"}`}>
      <div className={`user-edi-modal-container ${darkMode ? "dark" : "light"}`}>
        <h2 className={`ue-modal-title ${darkMode ? "dark" : ""}`}>Edit Supplier</h2>
        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}
        <form onSubmit={handleSubmit} className="edit-user-form">
          <div className={`ue-input-group ${darkMode ? "dark" : "light"}`}>
            <label>Date</label>
            <input type="text" name="date" value={formData.date} readOnly />
          </div>
          <div className={`ue-input-group ${darkMode ? "dark" : "light"}`}>
            <label>Time</label>
            <input type="text" name="time" value={formData.time} readOnly />
          </div>
          <div className={`ue-input-group ${darkMode ? "dark" : "light"}`}>
            <label>Supplier Name *</label>
            <input type="text" name="supplierName" value={formData.supplierName} onChange={handleChange} required />
          </div>
          <div className={`ue-input-group ${darkMode ? "dark" : "light"}`}>
            <label>Business Name</label>
            <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} />
          </div>
          <div className={`ue-input-group ${darkMode ? "dark" : "light"}`}>
            <label>Phone Number</label>
            <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} />
          </div>
          <div className={`ue-input-group ${darkMode ? "dark" : "light"}`}>
            <label>Address</label>
            <input type="text" name="address" value={formData.address} onChange={handleChange} />
          </div>
          <div className="button-group">
            <button type="submit" className="eu-save-btn">Save</button>
            <button type="button" className="eu-cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierUpdate;