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
    serviceCharge: "",
    rettotalAmount: "",
  });

  // State for items with editable assignedTo AND retquantity
  const [itemAssignments, setItemAssignments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [productStocks, setProductStocks] = useState({});

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
        serviceCharge: payment.serviceCharge?.toString() || "0",
        rettotalAmount: payment.rettotalAmount?.toString() || "0",
      });

      if (Array.isArray(payment.items)) {
        const initialAssignments = payment.items.map((item) => ({
          productId: item.productId,
          _id: item._id || item.itemId,
          assignedTo: item.assignedTo || "",
          retquantity: item.retquantity || 0,
          givenQty: item.givenQty || 0,
          itemName: item.itemName,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
        }));

        setItemAssignments(initialAssignments);

        // ✅ Fetch live stock for each item
        const loadStocks = async () => {
          const stocks = {};
          for (const item of initialAssignments) {
            if (item.productId) {
              console.log("Product id",item);
              stocks[item.productId] = await fetchProductStock(item.productId);
            }
          }
          setProductStocks(stocks);
        };

        loadStocks();
      }

    }
  }, [payment]);

  const fetchProductStock = async (itemCode) => {
    try {
      // console.log("product ",itemCode._id);
      const response = await fetch(`https://raxwo-management.onrender.com/api/products/productitem/${(itemCode._id)}`);
      if (!response.ok) {
        console.warn(`Product ${itemCode} not found`);
        return 0;
      }
      const product = await response.json();
     
      return product.stock || 0;
    } catch (err) {
      console.error(`Error fetching stock for ${itemCode}:`, err);
      return 0;
    }
  };
  

  useEffect(() => {
    const serviceCharge = parseFloat(formData.serviceCharge) || 0;

    // ✅ Calculate RETTOTAL (returned items only)
    let rettotal = 0;
    itemAssignments.forEach(item => {
      const returnedQty = item.retquantity || 0;
      rettotal += returnedQty * ((item.price || 0) - (item.discount || 0));
    });

    rettotal -= serviceCharge;

    // ✅ Calculate TOTAL (remaining + given + service charge)
    let total = 0;
    itemAssignments.forEach(item => {
      const effectiveQty = (item.quantity || 0) - (item.retquantity || 0) + (item.givenQty || 0);
      total += (item.quantity || 0) * ((item.price || 0) - (item.discount || 0));
    });
    // total += serviceCharge;
    total = Math.max(0, parseFloat(total.toFixed(2)));

    setFormData(prev => ({
      ...prev,
      totalAmount: total.toFixed(2),
      rettotalAmount: rettotal.toFixed(2) // ✅ ADD THIS
    }));
  }, [itemAssignments, formData.serviceCharge]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleItemChange = (itemId, field, value) => {
    setItemAssignments((prev) =>
      prev.map((item) =>
      {
        if (field === 'retquantity') {
          const newRetQty = parseInt(value) || 0;
          // ✅ If new return qty is 0, force givenQty to 0
          if (newRetQty === 0) {
            return { ...item, retquantity: newRetQty, givenQty: 0 };
          }
          return { ...item, retquantity: newRetQty };
        }

        // For other fields (e.g., assignedTo)
        return { ...item, [field]: value };
      }
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
    // Validate retquantity does not exceed original quantity
    const invalidReturnItem = itemAssignments.find(
      item => (item.retquantity || 0) > item.quantity
    );
    if (invalidReturnItem) {
      setError(`Return quantity for "${invalidReturnItem.itemName}" cannot exceed ${invalidReturnItem.quantity}`);
      setLoading(false);
      return;
    }

    try {
      const changedBy = localStorage.getItem('username') || localStorage.getItem('cashierName') || 'system';

      // Prepare payload
      const updatePayload = { changedBy, changeSource: 'Payment' };

      // Top-level fields (if changed)
      const topFields = ['paymentMethod', 'cashierName', 'cashierId', 'serviceCharge', 'totalAmount'];
      topFields.forEach(field => {
        if (payment[field] !== formData[field]) {
          updatePayload[field] = formData[field];
        }
      });

      // Check if any item has retquantity > 0 → set returnAlert
      const hasReturn = itemAssignments.some(item => (item.retquantity || 0) > 0);
      updatePayload.returnAlert = hasReturn ? "returned" : "";

      // Calculate new total based on returned quantities and service charge
      const serviceCharge = parseFloat(formData.serviceCharge) || 0;
      let recalculatedTotal = 0;

      itemAssignments.forEach(item => {
        const effectiveQty = (item.quantity || 0) - (item.retquantity || 0) + (item.givenQty || 0); // remaining after return
        const itemTotal = (item.quantity || 0) * ((item.price || 0) - (item.discount || 0));
        recalculatedTotal += itemTotal;
      });

      // recalculatedTotal += serviceCharge; // Deduct service charge
      recalculatedTotal = Math.max(0, recalculatedTotal); // Ensure not negative

      // ✅ Calculate rettotalAmount separately
      let rettotalAmount = 0;
      itemAssignments.forEach(item => {
        const returnedQty = item.retquantity || 0;
        rettotalAmount += returnedQty * ((item.price || 0) - (item.discount || 0));
      });

      rettotalAmount -= serviceCharge;

      updatePayload.rettotalAmount = parseFloat(rettotalAmount.toFixed(2));

      // Update totalAmount in payload
      updatePayload.totalAmount = parseFloat(recalculatedTotal.toFixed(2));

      // Also send serviceCharge if changed
      if (payment.serviceCharge !== serviceCharge) {
        updatePayload.serviceCharge = serviceCharge;
      }

      // Extract item updates: assignedTo AND retquantity
      const itemUpdates = itemAssignments
        .map(item => {

          const originalItem = payment.items?.find(p => p._id?.toString() === item._id?.toString());
          const changes = {};

          if (originalItem?.assignedTo !== item.assignedTo) {
            changes.assignedTo = item.assignedTo;
          }
          if (originalItem?.retquantity !== item.retquantity) {
            changes.retquantity = item.retquantity;
          }
          if (originalItem?.givenQty !== item.givenQty) { // ✅ ADD THIS
            changes.givenQty = item.givenQty;
          }

          if (Object.keys(changes).length > 0) {
            return { _id: item._id, productId: item.productId,  ...changes };
          }
          return null;
        })
        .filter(Boolean); // Remove nulls

      if (itemUpdates.length > 0) {
        updatePayload.items = itemUpdates;
      }

      // If no changes at all (including returnAlert)
      if (
        Object.keys(updatePayload).length === 2 && // only changedBy & changeSource
        updatePayload.returnAlert === (payment.returnAlert || "") // and returnAlert unchanged
      ) {
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

  // Calculate if any item has return quantity > 0
  const hasReturns = itemAssignments.some(item => (item.retquantity || 0) > 0);

  return (
    <div className="modal-overlay">
      <div className={`payment-edit-modal-container ${darkMode ? "dark" : ""}`}>
        <h2 className={`edit-payment-title ${darkMode ? "dark" : ""}`}> RETURN PAYMENT</h2>

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
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                type="text"
                value={formData.paymentMethod}
                readOnly
              />
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
                    <th>Return Qty</th> {/* NEW */}
                    <th>Price (Rs.)</th>
                    <th>Discount (Rs.)</th>
                    <th>Replace Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {itemAssignments.map((item) => (
                    <tr key={item._id}>
                      <td>{item.itemName || 'N/A'}</td>
                      <td>{item.quantity || 0}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={item.retquantity}
                          onWheel={(e) => e.target.blur()}
                          onChange={(e) =>
                            handleItemChange(item._id, 'retquantity', parseInt(e.target.value) || 0)
                          }
                          className={`edit-input small-input ${darkMode ? "dark" : ""}`}
                        />
                      </td>
                      <td>{item.price?.toFixed(2) || '0.00'}</td>
                      <td>{item.discount?.toFixed(2) || '0.00'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            onWheel={(e) => e.target.blur()}
                            min="0"
                            max={productStocks[item.productId] || 0} // ✅ Enforce max
                            value={item.givenQty || 0}
                            disabled={item.retquantity <= 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              const maxAllowed = productStocks[item.productId] || 0;
                              const clamped = Math.max(0, Math.min(val, maxAllowed));
                              handleItemChange(item._id, 'givenQty', clamped);
                            }}
                            className={`edit-input small-input ${darkMode ? "dark" : ""}`}
                            style={{ width: '70px', padding: '4px' }}
                          />
                          <span style={{ fontSize: '0.85rem', color: darkMode ? '#a0aec0' : '#666' }}>
                            / {productStocks[item.productId] || 0}
                          </span>
                        </div>
                      </td>
                      {/* <td>
                        <select
                          value={item.assignedTo}
                          onChange={(e) => handleItemChange(item._id, 'assignedTo', e.target.value)}
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
                      </td> */}
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

          {/* Service Charge */}
          <div className="form-row">
            <div className="left-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>Service Charge (Rs.)</label>
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                type="text"
                name="serviceCharge"
                disabled={!hasReturns}
                value={formData.serviceCharge}
                onChange={handleChange}
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div className="right-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>RETURNED AMOUNT (Rs.)</label>
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                type="number"
                value={formData.rettotalAmount || "0"}
                onWheel={(e) => e.target.blur()}
                readOnly
                step="0.01"
              />
            </div>
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