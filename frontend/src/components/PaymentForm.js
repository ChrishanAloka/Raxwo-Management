////////////supplier///////////

import React, { useState } from 'react';
import '../styles/Supplier.css';

const PaymentForm = ({ supplier, closeModal, refreshSuppliers, darkMode }) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');     // ← New
  const [assignedTo, setAssignedTo] = useState('');  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");

  // Calculate total cost and amount due
  const totalitemCost = supplier.items.reduce(
    (sum, item) => sum + (item.buyingPrice || 0) * (item.quantity || 0),
    0
  );
  const pastcharges = supplier.pastPayments.reduce(
    (sum, ppayments) => sum + (ppayments.paymentCharge || 0),
    0
  );
  const discounts = supplier.discounts.reduce(
    (sum, ppayments) => sum + (ppayments.discountCharge || 0),
    0
  );
  const repairServicecharges = supplier.repairService.reduce(
    (sum, ppayments) => sum + (ppayments.paymentCharge || 0),
    0
  );

  const totalCost = totalitemCost + pastcharges + repairServicecharges - discounts;
  const totalPayments = supplier.totalPayments || 0;
  const totalAmountDue = totalCost - totalPayments;
  const remainingDue = totalAmountDue - (parseFloat(paymentAmount) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess("");

    const payment = parseFloat(paymentAmount);
    if (!payment || payment <= 0) {
      setError('Payment amount must be a positive number');
      return;
    }
    if (payment > totalAmountDue) {
      setError('Payment amount cannot exceed amount due');
      return;
    }
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    try {
      const response = await fetch(`https://raxwo-management.onrender.com/api/suppliers/${supplier._id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentAmount: payment, paymentMethod, assignedTo }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to record payment');
      }

      setSuccess(`Payment of Rs. ${payment.toFixed(2)} recorded successfully!`);
      await refreshSuppliers();
      setTimeout(() => closeModal(), 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="payment-modal-overlay" onClick={closeModal}>
      <div className={`payment-modal-content ${darkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <h3 className="payment-modal-title">Record Payment for {supplier.supplierName}</h3>
          <button className="payment-modal-close-icon" onClick={closeModal}>
            ✕
          </button>
        </div>
        {success && <p className="success-message">{success}</p>}
        <form className="payment-form" onSubmit={handleSubmit}>
          <div>
            <label className="payment-label">Total Amount Due</label>
            <input
              className="payment-display"
              type="text"
              value={`Rs. ${totalAmountDue.toFixed(2)}`}
              readOnly
            />
          </div>
          <div>
            <label className="payment-label">Current Payment Amount</label>
            <input
              className="payment-input"
              type="number"
              step="0.01"
              min="0"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Enter payment amount"
            />
          </div>
          {/* Payment Method */}
          <div>
            <label className="payment-label">Payment Method</label>
            <select
              className="payment-input"
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
          </div>

          {/* Assign To */}
          {/* <div>
            <label className="payment-label">Assign To</label>
            <select
              className="payment-input"
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
            </select>
          </div> */}
          <div>
            <label className="payment-label">Remaining Amount Due</label>
            <input
              className="payment-display"
              type="text"
              value={`Rs. ${remainingDue >= 0 ? remainingDue.toFixed(2) : '0.00'}`}
              readOnly
            />
          </div>
          {error && <p className="payment-error">{error}</p>}
          <button type="submit" className="payment-submit-btn">
            Submit Payment
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentForm;