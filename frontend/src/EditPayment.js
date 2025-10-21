import React, { useState, useEffect } from "react";
import "./EditPayment.css";

const API_URL = "https://raxwo-management.onrender.com/api/payments";

const EditPayment = ({ payment, closeModal, darkMode }) => {
  // Top-level editable fields
  const [formData, setFormData] = useState({
    customerName: "",
    contactNumber: "",
    address: "",
    description: "",
    assignedTo: "", // overall assignment (optional)
  });

  // Split payment methods
  const [paymentMethods, setPaymentMethods] = useState([{ method: '', amount: '' }]);
  const [duplicateError, setDuplicateError] = useState('');

  // Item-level editable assignments + other fields
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Initialize from payment
  useEffect(() => {
    if (payment) {
      setFormData({
        customerName: payment.customerName || '',
        contactNumber: payment.contactNumber || '',
        address: payment.address || '',
        description: payment.description || '',
        assignedTo: payment.assignedTo || '',
      });

      // Handle split vs legacy payment methods
      if (Array.isArray(payment.paymentMethods) && payment.paymentMethods.length > 0) {
        setPaymentMethods(
          payment.paymentMethods.map(pm => ({
            method: pm.method || '',
            amount: pm.amount?.toString() || ''
          }))
        );
      } else {
        setPaymentMethods([{
          method: payment.paymentMethod || '',
          amount: (payment.totalPaid || payment.totalAmount || 0).toString()
        }]);
      }

      // Initialize editable items (with quantity, price, discount, assignedTo)
      if (Array.isArray(payment.items)) {
        setItems(
          payment.items.map(item => ({
            _id: item._id || item.itemId,
            itemName: item.itemName,
            quantity: item.quantity || 1,
            price: item.price || item.sellingPrice || 0,
            discount: item.discount || 0,
            assignedTo: item.assignedTo || '',
            productId: item.productId || item._id,
          }))
        );
      }
    }
  }, [payment]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };

  // === Payment Methods Helpers ===
  const updatePaymentMethod = (index, field, value) => {
    const newMethods = [...paymentMethods];
    newMethods[index][field] = value;
    setPaymentMethods(newMethods);
    setDuplicateError('');

    if (field === 'method') {
      const methods = newMethods.map(m => m.method).filter(Boolean);
      if (new Set(methods).size !== methods.length) {
        setDuplicateError('❌ Duplicate payment methods not allowed.');
      }
    }
  };

  const addPaymentMethod = () => {
    setPaymentMethods([...paymentMethods, { method: '', amount: '' }]);
  };

  const removePaymentMethod = (index) => {
    if (paymentMethods.length > 1) {
      setPaymentMethods(paymentMethods.filter((_, i) => i !== index));
      setDuplicateError('');
    }
  };

  // === Submit Handler ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    // Validate payment methods
    const validMethods = paymentMethods.filter(pm => pm.method && pm.amount !== '');
    if (validMethods.length === 0) {
      setError("At least one valid payment method is required.");
      return;
    }

    const totalPaid = validMethods.reduce((sum, pm) => sum + parseFloat(pm.amount), 0);
    const totalAmountNum = parseFloat(payment.totalAmount);
    if (totalPaid < totalAmountNum) {
      setError("Total paid cannot be less than total amount due.");
      return;
    }

    if (duplicateError) {
      setError("Fix duplicate payment methods.");
      return;
    }

    // Prepare payload
    const payload = {
      changedBy: localStorage.getItem('username') || 'system',
      changeSource: 'Payment',
    };

    // Top-level changes
    const topLevelFields = ['customerName', 'contactNumber', 'address', 'description', 'assignedTo'];
    topLevelFields.forEach(field => {
      if (formData[field] !== (payment[field] || '')) {
        payload[field] = formData[field];
      }
    });

    // Payment methods
    payload.paymentMethods = validMethods.map(pm => ({
      method: pm.method,
      amount: parseFloat(pm.amount)
    }));
    payload.totalPaid = totalPaid;
    payload.changeGiven = totalPaid - totalAmountNum;

    // Item changes (only send changed fields)
    const itemUpdates = items
      .map((item, idx) => {
        const orig = payment.items[idx];
        const changes = {};

        if (item.quantity !== (orig.quantity || 1)) changes.quantity = item.quantity;
        if (item.price !== (orig.price || orig.sellingPrice || 0)) changes.price = item.price;
        if (item.discount !== (orig.discount || 0)) changes.discount = item.discount;
        if (item.assignedTo !== (orig.assignedTo || '')) changes.assignedTo = item.assignedTo;

        return Object.keys(changes).length > 0 ? { _id: item._id, ...changes, productId: item.productId } : null;
      })
      .filter(Boolean);

    if (itemUpdates.length > 0) {
      payload.items = itemUpdates;
    }

    if (Object.keys(payload).length <= 2) {
      setError("No changes detected.");
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError("Authentication required.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/${payment._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Update failed");

      setMessage("✅ Payment updated successfully!");
      setTimeout(() => closeModal(), 1500);
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
          {/* Customer Info */}
          <div className="form-row">
            <div className="left-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>Customer Name</label>
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                name="customerName"
                value={formData.customerName}
                onChange={handleFormChange}
              />
            </div>
            <div className="right-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>Contact Number</label>
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div className="form-row">
            {/* <div className="left-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>Address</label>
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                name="address"
                value={formData.address}
                onChange={handleFormChange}
              />
            </div> */}
            <div className="right-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>Description</label>
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                name="description"
                value={formData.description}
                onChange={handleFormChange}
              />
            </div>
          </div>

          {/* Overall Assigned To (optional) */}
          {/* <div className="form-row">
            <div className="full-width">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>Overall Assign To</label>
              <select
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleFormChange}
                className={`edit-input ${darkMode ? "dark" : ""}`}
              >
                <option value="">None</option>
                <option value="Prabath">Prabath</option>
                <option value="Nadeesh">Nadeesh</option>
                <option value="Accessories">Accessories</option>
                <option value="Genex-EX">Genex EX</option>
                <option value="I-Device">I Device</option>
                <option value="Refund">Refund</option>
              </select>
            </div>
          </div> */}

          {/* Payment Methods (Split) */}
          <div className="form-row">
            <div className="full-width">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>PAYMENT METHODS</label>
              {paymentMethods.map((pm, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <select
                    value={pm.method}
                    onChange={(e) => updatePaymentMethod(index, 'method', e.target.value)}
                    className={`edit-input ${darkMode ? "dark" : ""}`}
                    style={{ flex: 1 }}
                  >
                    <option value="">Select</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank-Transfer">Bank Transfer</option>
                    <option value="Bank-Check">Bank Check</option>
                    <option value="Credit">Credit</option>
                    {/* <option value="PayHere">PayHere</option>
                    <option value="Genie">Genie</option>
                    <option value="mCash">mCash</option>
                    <option value="Other">Other</option> */}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={pm.amount}
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.target.blur()}
                    onChange={(e) => updatePaymentMethod(index, 'amount', e.target.value)}
                    className={`edit-input ${darkMode ? "dark" : ""}`}
                    style={{ width: '120px' }}
                  />
                  {paymentMethods.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePaymentMethod(index)}
                      style={{ background: 'red', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addPaymentMethod}
                style={{ marginTop: '8px', fontSize: '14px' }}
              >
                + Add Another Method
              </button>
              {duplicateError && (
                <p style={{ color: 'red', fontSize: '13px', marginTop: '6px' }}>{duplicateError}</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="items-section">
            <h3 className={`section-title ${darkMode ? "dark" : ""}`}>Items</h3>
            {items.length > 0 ? (
              <table className={`items-table ${darkMode ? "dark" : ""}`}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Disc.</th>
                    <th>Assign To</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item._id}>
                      <td>{item.itemName}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          className={`edit-input ${darkMode ? "dark" : ""}`}
                          style={{ width: '60px' }}
                          readOnly
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.price}
                          className={`edit-input ${darkMode ? "dark" : ""}`}
                          style={{ width: '80px' }}
                          readOnly
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          onWheel={(e) => e.target.blur()}
                          value={item.discount}
                          className={`edit-input ${darkMode ? "dark" : ""}`}
                          style={{ width: '80px' }}
                          readOnly
                        />
                      </td>
                      <td>
                        <select
                          value={item.assignedTo}
                          onChange={(e) => handleItemChange(idx, 'assignedTo', e.target.value)}
                          className={`assign-select ${darkMode ? "dark" : ""}`}
                        >
                          <option value="">Select</option>
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
              <p>No items</p>
            )}
          </div>

          {/* Save / Cancel */}
          <div className="button-group">
            <button type="submit" className="edit-submit-btn" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
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