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
  });

  // State for items with editable assignedTo
  const [itemAssignments, setItemAssignments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Initialize form and item assignments
  useEffect(() => {
    if (payment) {
      setFormData({
        invoiceNumber: payment.invoiceNumber || "",
        paymentMethod: payment.paymentMethod || "",
        discountApplied: payment.discountApplied?.toString() || "0",
        totalAmount: payment.totalAmount?.toString() || "",
        cashierName: payment.cashierName || "",
        cashierId: payment.cashierId || "",
      });

      // Initialize item assignments
      if (Array.isArray(payment.items)) {
        setItemAssignments(
          payment.items.map((item) => ({
            _id: item._id || item.itemId, // unique key
            assignedTo: item.assignedTo || "", // editable
            itemName: item.itemName,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount,
          }))
        );
      }
    }
  }, [payment]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleItemChange = (itemId, value) => {
    setItemAssignments((prev) =>
      prev.map((item) =>
        item._id === itemId ? { ...item, assignedTo: value } : item
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    // Validate required fields
    if (!formData.paymentMethod.trim()) {
      setError("Payment Method is required");
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

      // Prepare payload
      const updatePayload = { changedBy, changeSource: 'Payment' };

      // Only include top-level fields if they changed (but they're read-only, so likely not)
      const topFields = ['paymentMethod', 'cashierName', 'cashierId'];
      topFields.forEach(field => {
        if (payment[field] !== formData[field]) {
          updatePayload[field] = formData[field];
        }
      });

      // Extract assignedTo changes from items
      const itemUpdates = itemAssignments
        .filter(item => item.assignedTo !== (payment.items?.find(p => p._id === item._id)?.assignedTo || ""))
        .map(item => ({
          _id: item._id,
          assignedTo: item.assignedTo,
        }));

      if (itemUpdates.length > 0) {
        updatePayload.items = itemUpdates; // Send only updated items
      }

      // If no changes at all
      if (Object.keys(updatePayload).length === 2) {
        setError('No changes detected.');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in.');
        setLoading(false);
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

      setMessage("✅ Payment & assignments updated successfully!");
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

        {loading && <p className="loading">Updating...</p>}
        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}

        <form className="edit-payment-form" onSubmit={handleSubmit}>
          {/* Top Fields (Read-Only) */}
          <div className="form-row">
            <div className="left-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>INVOICE NUMBER</label>
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                type="text"
                value={formData.invoiceNumber}
                readOnly
              />
            </div>
            <div className="right-column">
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
                <option value="Bank-Check">Bank Check</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
          </div>

          {/* Items Table */}
          <div className="items-section">
            <h3 className={`section-title ${darkMode ? "dark" : ""}`}>Items</h3>
            {itemAssignments.length > 0 ? (
              <table className={`items-table ${darkMode ? "dark" : ""}`}>
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Qty</th>
                    <th>Price (Rs.)</th>
                    <th>Discount (Rs.)</th>
                    <th>Assign To</th>
                  </tr>
                </thead>
                <tbody>
                  {itemAssignments.map((item) => (
                    <tr key={item._id}>
                      <td>{item.itemName || 'N/A'}</td>
                      <td>{item.quantity || 0}</td>
                      <td>{item.price?.toFixed(2) || '0.00'}</td>
                      <td>{item.discount?.toFixed(2) || '0.00'}</td>
                      <td>
                        <select
                          value={item.assignedTo}
                          onChange={(e) => handleItemChange(item._id, e.target.value)}
                          className={`assign-select ${darkMode ? "dark" : ""}`}
                        >
                          <option value="" disabled>Select</option>
                          <option value="Prabath">Prabath</option>
                          <option value="Nadeesh">Nadeesh</option>
                          <option value="Accessories">Accessories</option>
                          <option value="Genex-EX">Genex EX</option>
                          <option value="I-Device">I Device</option>
                          <option value="Refund">Refund</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className={`no-items ${darkMode ? "dark" : ""}`}>
                No items to assign.
              </p>
            )}
          </div>

          {/* Bottom Fields (Read-Only) */}
          <div className="form-row">
            <div className="left-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>DISCOUNT (Rs.)</label>
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                type="number"
                value={formData.discountApplied}
                onWheel={(e) => e.target.blur()}
                readOnly
                step="0.01"
              />
            </div>
            <div className="right-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>TOTAL AMOUNT (Rs.)</label>
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                type="number"
                value={formData.totalAmount}
                onWheel={(e) => e.target.blur()}
                readOnly
                step="0.01"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="left-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>CASHIER NAME</label>
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                type="text"
                value={formData.cashierName}
                readOnly
              />
            </div>
            <div className="right-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>CASHIER ID</label>
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                type="text"
                value={formData.cashierId}
                readOnly
              />
            </div>
          </div>

          {/* Buttons */}
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