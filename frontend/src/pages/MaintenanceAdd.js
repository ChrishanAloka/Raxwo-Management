import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import '../styles/MaintenanceAdd.css';

const API_URL = "https://raxwo-management.onrender.com/api/maintenance";

const getCurrentDate = () => new Date().toISOString().split("T")[0];
const getCurrentTime = () => new Date().toLocaleTimeString();

const MaintenanceAdd = ({ onClose, onUpdate, darkMode }) => {
  const [serviceType, setServiceType] = useState("");
  const [price, setPrice] = useState("");
  const [remarks, setRemarks] = useState("");
  const [date, setDate] = useState(getCurrentDate());
  const [time, setTime] = useState(getCurrentTime());
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceType, price, remarks, date, time, paymentMethod, assignedTo, }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Error adding Bills and Other Expences record");

      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error adding Bills and Other Expences record:", error);
      setError(error.message);
    }
  };

  return (
    <div className={`m-a-modal-overlay ${darkMode ? "dark" : ""}`} onClick={onClose}>
      <div className={`m-a-modal-container ${darkMode ? "dark" : ""}`} onClick={(e) => e.stopPropagation()}>
        <h3 className={`m-a-modal-title ${darkMode ? "dark" : ""}`} onClick={(e) => e.stopPropagation()}>Add Bills and Other Expences Record</h3>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit}>
          <label className={`madd-label ${darkMode ? "dark" : ""}`}>Date</label>
          <input
            className={`madd-input ${darkMode ? "dark" : ""}`}
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <label className={`madd-label ${darkMode ? "dark" : ""}`}>Time</label>
          <input
            className={`madd-input ${darkMode ? "dark" : ""}`}
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
          />
          <label className={`madd-label ${darkMode ? "dark" : ""}`}>Service Type</label>
          <input
            className={`madd-input ${darkMode ? "dark" : ""}`}
            type="text"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            required
          />
          <label className={`madd-label ${darkMode ? "dark" : ""}`}>Price</label>
          <input
            className={`madd-input ${darkMode ? "dark" : ""}`}
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          {/* Payment Method */}
          <label className={`madd-label ${darkMode ? "dark" : ""}`}>Payment Method</label>
          <select
            className={`madd-input ${darkMode ? "dark" : ""}`}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            required
          >
            <option value="" disabled>Select Payment Method</option>
            <option className="drop" value="Cash">Cash</option>
            <option className="drop" value="Card">Card</option>
            <option className="drop" value="Bank-Transfer">Bank Transfer</option>
            <option className="drop" value="Bank-Check">Bank Check</option>
            <option className="drop" value="Credit">Credit</option>
          </select>

          {/* Assign To */}
          {/* <label className={`madd-label ${darkMode ? "dark" : ""}`}>Assign To</label>
          <select
            className={`madd-input ${darkMode ? "dark" : ""}`}
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            required
          >
            <option value="" disabled>Select Assignee</option>
            <option value="Prabath">Prabath</option>
            <option value="Nadeesh">Nadeesh</option>
            <option value="Accessories">Accessories</option>
            <option value="Genex-EX">Genex EX</option>
            <option value="I-Device">I Device</option>
          </select> */}
          <label className={`madd-label ${darkMode ? "dark" : ""}`}>Remarks</label>
          <input
            className={`madd-input ${darkMode ? "dark" : ""}`}
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
          <div className="button-group">
            <button type="submit" className="me-submit-btn">Submit</button>
            <button type="button" className="me-cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceAdd;