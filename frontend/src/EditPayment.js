import React, { useState, useEffect } from "react";
import "./EditPayment.css";

const API_URL = "https://raxwo-management.onrender.com/api/payments";

const EditPayment = ({ payment, closeModal, darkMode }) => {
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    paymentMethod: "",
    discountApplied: "",
    totalAmount: "",
    cashierName: "",
    cashierId: "",
    assignedTo: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (payment) {
      setFormData({
        invoiceNumber: payment.invoiceNumber || "",
        paymentMethod: payment.paymentMethod || "",
        assignedTo: payment.assignedTo || "",
        discountApplied: payment.discountApplied?.toString() || "0",
        totalAmount: payment.totalAmount?.toString() || "",
        cashierName: payment.cashierName || "",
        cashierId: payment.cashierId || "",
      });
    }
  }, [payment]);

  // Remove supplier fetch useEffect

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    // Validation
    if (!formData.invoiceNumber.trim()) {
      setError("Invoice Number is required");
      setLoading(false);
      return;
    }
    if (!formData.assignedTo.trim()) {
      setError("Assign is required");
      setLoading(false);
      return;
    }
    
    if (!formData.paymentMethod.trim()) {
      setError("Payment Method is required");
      setLoading(false);
      return;
    }
    if (isNaN(Number(formData.discountApplied)) || Number(formData.discountApplied) < 0) {
      setError("Discount must be a non-negative number");
      setLoading(false);
      return;
    }
    if (isNaN(Number(formData.totalAmount)) || Number(formData.totalAmount) <= 0) {
      setError("Total Amount must be a positive number");
      setLoading(false);
      return;
    }
    if (!formData.cashierName.trim()) {
      setError("Cashier Name is required");
      setLoading(false);
      return;
    }
    if (!formData.cashierId.trim()) {
      setError("Cashier ID is required");
      setLoading(false);
      return;
    }

    try {
      const changedBy = localStorage.getItem('username') || localStorage.getItem('cashierName') || 'system';
      
      // Prepare only changed fields
      const updatePayload = { changedBy, changeSource: 'Payment' };
      const fields = ['invoiceNumber', 'paymentMethod', 'discountApplied', 'totalAmount', 'cashierName', 'cashierId', 'assignedTo'];

      fields.forEach(field => {
        let newValue = formData[field];
        if (field === 'discountApplied' || field === 'totalAmount') {
          newValue = Number(newValue);
        }
        if (payment[field] !== newValue) {
          updatePayload[field] = newValue;
        }
      });

      if (Object.keys(updatePayload).length === 2) { // Only changedBy and changeSource, no actual changes
        setError('No changes detected.');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required. Please log in.');
      return;
    }

      const response = await fetch(`${API_URL}/${payment._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update payment");
      }

      setMessage("✅ Payment updated successfully!");
      setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className={`payment-edit-modal-container ${darkMode ? "dark" : ""}`}>
        <h2 className={`edit-payment-title ${darkMode ? "dark" : ""}`}>✏️ EDIT PAYMENT</h2>

        {loading && <p className="loading">Updating payment...</p>}
        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}

        <form className="edit-payment-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="left-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>INVOICE NUMBER</label>
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                type="text"
                name="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={handleChange}
                required
                readOnly
              />

              <label className={`edit-label ${darkMode ? "dark" : ""}`}>PAYMENT METHOD</label>
              <select
                className={`edit-input ${darkMode ? "dark" : ""}`}
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                required
              >
                <option value="">Select Method</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Bank-Transfer">Bank Transfer</option>
                {/* <option value="Refund">Refund</option> */}
              </select>

              <label className={`edit-label ${darkMode ? "dark" : ""}`}>Assigned To:</label>
              <select
                className={`edit-input ${darkMode ? "dark" : ""}`}
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Select Person/Team</option>
                <option value="Prabath">Prabath</option>
                <option value="Nadeesh">Nadeesh</option>
                <option value="Accessories">Accessories</option>
                <option value="Genex-EX">Genex EX</option>
                <option value="I-Device">I Device</option>
                {/* <option value="Refund">Refund</option> */}
              </select>
              
            </div>

            <div className="right-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>DISCOUNT (Rs.)</label>
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                type="number"
                name="discountApplied"
                value={formData.discountApplied}
                onChange={handleChange}
                min="0"
                step="0.01"
                readOnly
              />

              <label className={`edit-label ${darkMode ? "dark" : ""}`}>TOTAL AMOUNT (Rs.)</label>
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                type="number"
                name="totalAmount"
                value={formData.totalAmount}
                onChange={handleChange}
                required
                readOnly
                min="0.01"
                step="0.01"
              />

              <label className={`edit-label ${darkMode ? "dark" : ""}`}>CASHIER NAME</label>
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                type="text"
                name="cashierName"
                value={formData.cashierName}
                onChange={handleChange}
                required
                readOnly
              />

              {/* <label className={`edit-label ${darkMode ? "dark" : ""}`}>CASHIER ID</label>
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                type="text"
                name="cashierId"
                value={formData.cashierId}
                onChange={handleChange}
                required
              /> */}
            </div>
          </div>

          <div className="button-group">
            <button type="submit" className="edit-submit-btn">Save</button>
            <button type="button" className="edit-cancel-btn" onClick={closeModal}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPayment;