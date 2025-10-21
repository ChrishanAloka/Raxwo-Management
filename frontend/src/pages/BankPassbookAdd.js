// components/BankPassbookAdd.jsx

import React, { useState } from "react";
import "../styles/BankPassbookAdd.css";

const API_URL = "https://raxwo-management.onrender.com/api/bank-passbook";

const getCurrentDate = () => new Date().toISOString().split("T")[0];
const getCurrentTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const BankPassbookAdd = ({ onClose, onUpdate, darkMode }) => {
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Credit");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getCurrentDate());
  const [time, setTime] = useState(getCurrentTime());
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (isNaN(amount) || Number(amount) <= 0) {
      setError("Amount must be a positive number");
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required. Please log in.');
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ description, type, amount, date, time }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add transaction");
      }

      onUpdate(); // Refresh list
      onClose(); // Close modal
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={`bp-add-overlay ${darkMode ? "dark" : ""}`} onClick={onClose}>
      <div className={`bp-add-container ${darkMode ? "dark" : ""}`} onClick={(e) => e.stopPropagation()}>
        <h3 className={`bp-add-title ${darkMode ? "dark" : ""}`}>➕ Add Bank Transaction</h3>
        
        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label className={`bp-add-label ${darkMode ? "dark" : ""}`}>Date</label>
          <input
            type="date"
            className={`bp-add-input ${darkMode ? "dark" : ""}`}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <label className={`bp-add-label ${darkMode ? "dark" : ""}`}>Time</label>
          <input
            type="time"
            className={`bp-add-input ${darkMode ? "dark" : ""}`}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />

          <label className={`bp-add-label ${darkMode ? "dark" : ""}`}>Description</label>
          <input
            type="text"
            className={`bp-add-input ${darkMode ? "dark" : ""}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Salary, Grocery, Rent"
            required
          />

          <label className={`bp-add-label ${darkMode ? "dark" : ""}`}>Type</label>
          <select
            className={`bp-add-input ${darkMode ? "dark" : ""}`}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="Credit">Credit (Income)</option>
            <option value="Debit">Debit (Expense)</option>
          </select>

          <label className={`bp-add-label ${darkMode ? "dark" : ""}`}>Amount (Rs.)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            className={`bp-add-input ${darkMode ? "dark" : ""}`}
            value={amount}
            onWheel={(e) => e.target.blur()}
            onChange={(e) => setAmount(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="Enter amount"
            required
          />

          <div className="button-group">
            <button type="submit" className="bp-add-submit-btn">Add Transaction</button>
            <button type="button" className="bp-add-cancel-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BankPassbookAdd;