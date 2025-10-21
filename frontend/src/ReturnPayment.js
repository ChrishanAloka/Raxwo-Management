import React, { useState, useEffect, useMemo } from "react";
import "./EditPayment.css";

const API_URL = "https://raxwo-management.onrender.com/api/payments";

const EditPayment = ({ payment, closeModal, darkMode }) => {
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    paymentMethod: "",
    discountApplied: "0",
    cashierName: "",
    cashierId: "",
    serviceCharge: "0",
  });

  const [itemAssignments, setItemAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [productStocks, setProductStocks] = useState({});

  // 🔁 Initialize form
  useEffect(() => {
    if (payment) {
      setFormData({
        invoiceNumber: payment.invoiceNumber || "",
        paymentMethod: payment.paymentMethod || "",
        discountApplied: (payment.discountApplied || 0).toString(),
        cashierName: payment.cashierName || "",
        cashierId: payment.cashierId || "",
        serviceCharge: (payment.serviceCharge || 0).toString(),
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

        // Fetch stock
        const loadStocks = async () => {
          const uniqueIds = [...new Set(initialAssignments.filter(i => i.productId).map(i => i.productId))];
          const stocks = {};
          for (const id of uniqueIds) {
            try {
              const res = await fetch(`https://raxwo-management.onrender.com/api/products/productitem/${id}`);
              const prod = res.ok ? await res.json() : null;
              stocks[id] = prod?.stock || 0;
            } catch {
              stocks[id] = 0;
            }
          }
          setProductStocks(stocks);
        };
        loadStocks();
      }
    }
  }, [payment]);

  // 🔁 Reset givenQty to 0 if stock becomes 0
  // useEffect(() => {
  //   setItemAssignments(prev => 
  //     prev.map(item => {
  //       const stock = productStocks[item.productId] || 0;
  //       // If stock is 0, but givenQty > 0, reset it
  //       if (stock === 0 && (item.givenQty || 0) > 0) {
  //         return { ...item, givenQty: 0 };
  //       }
  //       return item;
  //     })
  //   );
  // }, [productStocks]);

  // 🧮 Compute totals with givenQty considered
  const { totalAmount, rettotalAmount } = useMemo(() => {
    const serviceCharge = parseFloat(formData.serviceCharge) || 0;

    // Original total (unchanged by returns)
    let total = 0;
    itemAssignments.forEach(item => {
      total += (item.quantity || 0) * ((item.price || 0) - (item.discount || 0));
    });
    total = Math.max(0, parseFloat(total.toFixed(2)));

    // Return amount = (returned - replaced) * unit price
    let rettotal = 0;
    itemAssignments.forEach(item => {
      const netReturned = Math.max(0, (item.retquantity || 0) - (item.givenQty || 0));
      rettotal += netReturned * ((item.price || 0) - (item.discount || 0));
    });
    rettotal -= serviceCharge;
    rettotal = Math.max(0, rettotal); // Ensure non-negative

    return {
      totalAmount: total.toFixed(2),
      rettotalAmount: rettotal.toFixed(2),
    };
  }, [itemAssignments, formData.serviceCharge]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleItemChange = (itemId, field, value) => {
    setItemAssignments(prev =>
      prev.map(item => {
        if (item._id !== itemId) return item;

        if (field === 'retquantity') {
          const newRet = parseInt(value) || 0;
          // If return qty reduced below givenQty, cap givenQty
          const newGiven = newRet < item.givenQty ? newRet : item.givenQty;
          return { ...item, retquantity: newRet, givenQty: newGiven };
        }

        if (field === 'givenQty') {
          const newGiven = parseInt(value) || 0;
          // Cap givenQty to retquantity and stock
          const maxAllowed = Math.min(item.retquantity || 0, productStocks[item.productId] || 0);
          return { ...item, givenQty: Math.max(0, Math.min(newGiven, maxAllowed)) };
        }

        return { ...item, [field]: value };
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

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

    const invalidReturn = itemAssignments.find(item => (item.retquantity || 0) > item.quantity);
    if (invalidReturn) {
      setError(`Return quantity for "${invalidReturn.itemName}" cannot exceed ${invalidReturn.quantity}`);
      setLoading(false);
      return;
    }

    // ✅ Also validate givenQty ≤ retquantity (should be enforced by UI, but double-check)
    const invalidReplace = itemAssignments.find(item => (item.givenQty || 0) > (item.retquantity || 0));
    if (invalidReplace) {
      setError(`Replace quantity cannot exceed return quantity for "${invalidReplace.itemName}"`);
      setLoading(false);
      return;
    }

    try {
      const changedBy = localStorage.getItem('username') || 'system';
      const updatePayload = { changedBy, changeSource: 'Payment' };

      const topFields = ['paymentMethod', 'cashierName', 'cashierId', 'serviceCharge'];
      topFields.forEach(field => {
        if (payment[field] !== formData[field]) {
          updatePayload[field] = formData[field];
        }
      });

      const hasReturn = itemAssignments.some(item => (item.retquantity || 0) > 0);
      updatePayload.returnAlert = hasReturn ? "returned" : "";

      // Recalculate totals for payload
      let recalculatedTotal = 0;
      itemAssignments.forEach(item => {
        recalculatedTotal += (item.quantity || 0) * ((item.price || 0) - (item.discount || 0));
      });
      recalculatedTotal = Math.max(0, recalculatedTotal);

      let rettotalAmountCalc = 0;
      itemAssignments.forEach(item => {
        const netReturned = Math.max(0, (item.retquantity || 0) - (item.givenQty || 0));
        rettotalAmountCalc += netReturned * ((item.price || 0) - (item.discount || 0));
      });
      const serviceCharge = parseFloat(formData.serviceCharge) || 0;
      rettotalAmountCalc -= serviceCharge;
      rettotalAmountCalc = Math.max(0, rettotalAmountCalc);

      updatePayload.totalAmount = parseFloat(recalculatedTotal.toFixed(2));
      updatePayload.rettotalAmount = parseFloat(rettotalAmountCalc.toFixed(2));

      if (payment.serviceCharge !== serviceCharge) {
        updatePayload.serviceCharge = serviceCharge;
      }

      const itemUpdates = itemAssignments
        .map(item => {
          const orig = payment.items?.find(p => p._id?.toString() === item._id?.toString());
          const changes = {};
          if (orig?.assignedTo !== item.assignedTo) changes.assignedTo = item.assignedTo;
          if (orig?.retquantity !== item.retquantity) changes.retquantity = item.retquantity;
          if (orig?.givenQty !== item.givenQty) changes.givenQty = item.givenQty;
          return Object.keys(changes).length ? { _id: item._id, productId: item.productId, ...changes } : null;
        })
        .filter(Boolean);

      if (itemUpdates.length) updatePayload.items = itemUpdates;

      if (Object.keys(updatePayload).length === 2 && updatePayload.returnAlert === (payment.returnAlert || "")) {
        setError('No changes detected.');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required.');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/${payment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) throw new Error((await res.json()).message || "Update failed");

      setMessage("✅ Payment updated successfully!");
      setTimeout(closeModal, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasReturns = itemAssignments.some(item => (item.retquantity || 0) > 0);

  return (
    <div className="modal-overlay">
      <div className={`payment-edit-modal-container ${darkMode ? "dark" : ""}`}>
        <h2 className={`edit-payment-title ${darkMode ? "dark" : ""}`}>RETURN PAYMENT</h2>

        {loading && <p className="loading">Updating...</p>}
        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}

        <form className="edit-payment-form" onSubmit={handleSubmit}>
          {/* Top Fields */}
          <div className="form-row">
            <div className="left-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>INVOICE NUMBER</label>
              <input className={`edit-input ${darkMode ? "dark" : ""}`} value={formData.invoiceNumber} readOnly />
            </div>
            {/* <div className="right-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>PAYMENT METHOD</label>
              <input className={`edit-input ${darkMode ? "dark" : ""}`} value={formData.paymentMethod} readOnly />
            </div> */}
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
                    <th>Return Qty</th>
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
                          onFocus={(e) => e.target.select()}
                          onWheel={(e) => e.target.blur()}
                          onChange={(e) => handleItemChange(item._id, 'retquantity', e.target.value)}
                          className={`edit-input small-input ${darkMode ? "dark" : ""}`}
                        />
                      </td>
                      <td>{(item.price || 0).toFixed(2)}</td>
                      <td>{(item.discount || 0).toFixed(2)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {productStocks[item.productId] > 0 ? (
                            <>
                              <input
                                type="number"
                                onFocus={(e) => e.target.select()}
                                onWheel={(e) => e.target.blur()}
                                min="0"
                                max={Math.min(productStocks[item.productId], item.retquantity || 0)}
                                value={item.givenQty || 0}
                                disabled={item.retquantity <= 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  const maxAllowed = Math.min(productStocks[item.productId], item.retquantity || 0);
                                  handleItemChange(item._id, 'givenQty', Math.max(0, Math.min(val, maxAllowed)));
                                }}
                                className={`edit-input small-input ${darkMode ? "dark" : ""}`}
                                style={{ width: '70px', padding: '4px' }}
                              />
                              <span style={{ fontSize: '0.85rem', color: darkMode ? '#a0aec0' : '#666' }}>
                                / {Math.min(productStocks[item.productId] || 0)}
                              </span>
                            </>
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: '#e53e3e', fontStyle: 'italic' }}>
                              {productStocks[item.productId]} Out of stock
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className={`no-items ${darkMode ? "dark" : ""}`}>No items to assign.</p>
            )}
          </div>

          {/* Service Charge & Return Amount */}
          <div className="form-row">
            <div className="left-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>Service Charge (Rs.)</label>
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                name="serviceCharge"
                disabled={!hasReturns}
                value={formData.serviceCharge}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
            <div className="right-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>RETURNED AMOUNT (Rs.)</label>
              <input
                className={`edit-input ${darkMode ? "dark" : ""}`}
                value={rettotalAmount}
                readOnly
              />
            </div>
          </div>

          {/* Bottom Fields */}
          <div className="form-row">
            <div className="left-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>DISCOUNT (Rs.)</label>
              <input className={`edit-input ${darkMode ? "dark" : ""}`} value={formData.discountApplied} readOnly />
            </div>
            <div className="right-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>TOTAL AMOUNT (Rs.)</label>
              <input className={`edit-input ${darkMode ? "dark" : ""}`} value={totalAmount} readOnly />
            </div>
          </div>

          <div className="form-row">
            <div className="left-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>CASHIER NAME</label>
              <input className={`edit-input ${darkMode ? "dark" : ""}`} value={formData.cashierName} readOnly />
            </div>
            <div className="right-column">
              <label className={`edit-label ${darkMode ? "dark" : ""}`}>CASHIER ID</label>
              <input className={`edit-input ${darkMode ? "dark" : ""}`} value={formData.cashierId} readOnly />
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