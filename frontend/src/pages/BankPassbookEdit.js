// components/BankPassbookEdit.jsx

import React, { useState, useEffect } from "react";
import "../styles/BankPassbookEdit.css";

const API_URL = "https://raxwo-management.onrender.com/api/bank-passbook";

const BankPassbookEdit = ({ transaction, onClose, onUpdate, darkMode }) => {
  const [edited, setEdited] = useState({ ...transaction });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!edited.date) {
      setEdited((prev) => ({ ...prev, date: new Date().toISOString().split("T")[0] }));
    }
    if (!edited.time) {
      setEdited((prev) => ({ ...prev, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
    }
  }, [edited]);

  const handleSave = async (e) => {
    e.preventDefault();

    if (!edited.description.trim()) {
      setError("Description is required");
      return;
    }
    if (isNaN(edited.amount) || Number(edited.amount) <= 0) {
      setError("Amount must be a positive number");
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required. Please log in.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${edited._id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
         },
        body: JSON.stringify(edited),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update transaction");
      }

      onUpdate();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bp-edit-overlay" onClick={onClose}>
      <div className={`bp-edit-container ${darkMode ? "dark" : ""}`} onClick={(e) => e.stopPropagation()}>
        <h3 className={`bp-edit-title ${darkMode ? "dark" : ""}`}>✏️ Edit Transaction</h3>
        
        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSave}>
          <label className={`bp-edit-label ${darkMode ? "dark" : ""}`}>Date</label>
          <input
            type="date"
            className={`bp-edit-input ${darkMode ? "dark" : ""}`}
            value={edited.date}
            onChange={(e) => setEdited({ ...edited, date: e.target.value })}
            required
          />

          <label className={`bp-edit-label ${darkMode ? "dark" : ""}`}>Time</label>
          <input
            type="time"
            className={`bp-edit-input ${darkMode ? "dark" : ""}`}
            value={edited.time}
            onChange={(e) => setEdited({ ...edited, time: e.target.value })}
            required
          />

          <label className={`bp-edit-label ${darkMode ? "dark" : ""}`}>Description</label>
          <input
            type="text"
            className={`bp-edit-input ${darkMode ? "dark" : ""}`}
            value={edited.description}
            onChange={(e) => setEdited({ ...edited, description: e.target.value })}
            required
          />

          <label className={`bp-edit-label ${darkMode ? "dark" : ""}`}>Type</label>
          <select
            className={`bp-edit-input ${darkMode ? "dark" : ""}`}
            value={edited.type}
            onChange={(e) => setEdited({ ...edited, type: e.target.value })}
          >
            <option value="Credit">Credit (Income)</option>
            <option value="Debit">Debit (Expense)</option>
          </select>

          <label className={`bp-edit-label ${darkMode ? "dark" : ""}`}>Amount (Rs.)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            className={`bp-edit-input ${darkMode ? "dark" : ""}`}
            value={edited.amount}
            onWheel={(e) => e.target.blur()}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setEdited({ ...edited, amount: parseFloat(e.target.value) || 0 })}
            required
          />

          <div className="button-group">
            <button type="submit" className="bp-edit-update-btn">Update</button>
            <button type="button" className="bp-edit-cancel-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BankPassbookEdit;