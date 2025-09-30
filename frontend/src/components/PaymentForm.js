////////////supplier///////////

import React, { useState, useEffect } from 'react';
import '../styles/Supplier.css';
import Select from 'react-select';

const PaymentForm = ({ supplier, closeModal, fetchGrnReturnStocks, refreshSuppliers, darkMode }) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');     // ← New
  const [assignedTo, setAssignedTo] = useState('');  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [returnedProductsValue, setReturnedProductsValue] = useState(0);
  const [products, setProducts] = useState([]);
  const [description, setDescription] = useState(''); // For past payment description

  const [grnNumber, setGrnNumber] = useState('');
  const [grnReturnedValue, setGrnReturnedValue] = useState(0);
  const [grnTotal, setGrnTotal] = useState(0);
  const [grnDiscounts, setGrnDiscounts] = useState(0);
  const [grnItems, setGrnItems] = useState([]);
  const [returnedGrnItems, setReturnedGrnItems] = useState([]);
  const [grnOptionsLoading, setGrnOptionsLoading] = useState(false);

  // Special options
  const PAST_PAYMENT_OPTION = {
    value: '__PAST_PAYMENT__',
    label: '➕ Past Payment (Manual Entry)',
    type: 'past'
  };

  const REPAIR_SERVICE_OPTION = {
    value: '__REPAIR_SERVICE__',
    label: '🔧 Repair Service',
    type: 'repair'
  };

  // Inside PaymentForm component
  const paidGrnNumbers = React.useMemo(() => {
    const paid = new Set();
    supplier.paymentHistory.forEach(payment => {
      if (payment.grnNumber) {
        paid.add(String(payment.grnNumber));
      }
    });
    return paid;
  }, [supplier.paymentHistory]);

  // Prepare GRN options
  // const supplierGrnOptions = (supplier?.grnOptions || []).map(grn => {
  //   const value = String(grn.grnNumber || grn.value || '');
  //   const label = grn.label 
  //     ? String(grn.label)
  //     : `${value} | Rs. ${(grn.totalAmount || 0).toFixed(2)}`;
  //   return {
  //     value,
  //     label,
  //     totalAmount: grn.totalAmount || 0
  //   };
  // }).filter(opt => opt.value.trim() !== '');

  // ✅ Enhanced GRN options with individual payable amounts
  const [supplierGrnOptions, setSupplierGrnOptions] = useState([]);

  useEffect(() => {
  const calculateGrnOptions = async () => {
    if (!supplier?.grnOptions?.length) {
      setSupplierGrnOptions([]);
      setGrnOptionsLoading(false);
      return;
    }

    setGrnOptionsLoading(true);

    try {
      // Step 1: Prepare all GRN numbers
      const grnList = supplier.grnOptions;

      // Step 2: Fetch all return data in parallel
      const fetchPromises = grnList.map(grn => {
        const grnNumber = String(grn.grnNumber || grn.value || '');
        return fetchGrnReturnStocks(grnNumber)
          .then(result => ({ grn, data: result, error: null }))
          .catch(error => ({ grn, data: null, error }));
      });

      const results = await Promise.all(fetchPromises);

      // Step 3: Build options
      const options = results.map(({ grn, data, error }) => {
        const grnNumber = String(grn.grnNumber || grn.value || '');
        const isPaid = paidGrnNumbers.has(grnNumber);
        const status = isPaid ? '✅ Paid' : '⏳ Pending';

        // Format date
        const formattedDate = grn.grnDate
          ? new Date(grn.grnDate).toLocaleDateString('en-GB')
          : '';

        if (error || !data) {
          // Fallback if fetch failed
          const fallbackTotal = grn.totalAmount || 0;
          const label = `${grnNumber} | ${formattedDate} | Payable: Rs. ${fallbackTotal.toFixed(2)} | ${status} ${error ? '(⚠️)' : ''}`;
          return {
            value: grnNumber,
            label,
            totalAmount: fallbackTotal,
            payableAmount: fallbackTotal,
            returnedValue: 0,
            totalDiscounts: 0,
            isPaid: false,
            isDisabled: false,
          };
        }

        // Success path
        const { items, returnedValue } = data;

        // Calculate GRN total
        const total = items.reduce((sum, item) =>
          sum + (item.quantity || 0) * (item.buyingPrice || 0), 0
        );

        // Calculate discounts for this GRN
        const grnDiscs = (supplier.discounts || []).filter(d =>
          String(d.grnNumber) === grnNumber
        );
        const totalDiscs = grnDiscs.reduce((sum, d) => sum + (d.discountCharge || 0), 0);

        const payableAmount = Math.max(0, total - returnedValue - totalDiscs);

        const label = `${grnNumber} | ${formattedDate} | Rs. ${total.toFixed(2)} | Payable: Rs. ${payableAmount.toFixed(2)} | ${status}`;

        return {
          value: grnNumber,
          label,
          totalAmount: total,
          payableAmount,
          returnedValue,
          totalDiscounts: totalDiscs,
          isPaid: false,
          isDisabled: false,
        };
      });

      // Step 4: Sort by GRN date (newest first)
      options.sort((a, b) => {
        const dateA = grnList.find(g => String(g.grnNumber || g.value) === a.value)?.grnDate || '';
        const dateB = grnList.find(g => String(g.grnNumber || g.value) === b.value)?.grnDate || '';
        return new Date(dateB) - new Date(dateA);
      });

      setSupplierGrnOptions(options);
    } catch (err) {
      console.error('Unexpected error during GRN option calculation:', err);
      setSupplierGrnOptions([]);
    } finally {
      setGrnOptionsLoading(false);
    }
  };

  calculateGrnOptions();
}, [supplier?.grnOptions, paidGrnNumbers, supplier?.discounts, fetchGrnReturnStocks]);

  const allGrnOptions = [
    PAST_PAYMENT_OPTION,
    REPAIR_SERVICE_OPTION,
    ...supplierGrnOptions
  ];

  const selectedGrnOption = grnNumber
    ? allGrnOptions.find(opt => opt.value === grnNumber)
    : null;
  
  const isSpecialPayment = grnNumber === '__PAST_PAYMENT__' || grnNumber === '__REPAIR_SERVICE__';
  

  useEffect(() => {
    const fetchReturnedValue = async () => {
      try {
        const response = await fetch(`https://raxwo-management.onrender.com/api/suppliers/retitems/${encodeURIComponent(supplier.supplierName)}`);
        if (!response.ok) throw new Error("Failed to fetch products");
        const products = await response.json();
        setProducts(Array.isArray(products) ? products : []);

        // Calculate total returned value
        const totalReturned = products.reduce((sum, product) => {
          const returnstock = product.returnstock || 0;
          const buyingPrice = product.buyingPrice || 0;
          return sum + (returnstock * buyingPrice);
        }, 0);

        setReturnedProductsValue(totalReturned);
      } catch (err) {
        console.error("Error fetching returned products value:", err);
        setReturnedProductsValue(0);
        setProducts([]);
      }
    };

    if (supplier?.supplierName) {
      fetchReturnedValue();
    }
  }, [supplier?.supplierName]);

  // Calculate total cost and amount due
  const totalitemCost = supplier.items.reduce(
    (sum, item) => sum + (item.buyingPrice || 0) * (item.quantity || 0),
    0
  );
  const pastcharges = supplier.pastPayments.reduce(
    (sum, ppayments) => sum + parseFloat(ppayments.paymentCharge || 0),
    0
  );
  const discounts = supplier.discounts.reduce(
    (sum, ppayments) => sum + parseFloat(ppayments.discountCharge || 0),
    0
  );
  const paymentHistory = supplier.paymentHistory.reduce(
    (sum, ppayments) => sum + parseFloat(ppayments.currentPayment || 0),
    0
  );
  const repairServicecharges = supplier.repairService.reduce(
    (sum, ppayments) => sum + parseFloat(ppayments.paymentCharge || 0),
    0
  );

  const totalCost = totalitemCost + pastcharges + repairServicecharges;
  const totalPayments = paymentHistory || 0;
  const totalAmountDue = (totalCost || 0) - (totalPayments || 0) - (returnedProductsValue || 0) - (discounts || 0);
  const remainingDue = (totalAmountDue || 0) - (parseFloat(paymentAmount) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess("");

    const payment = parseFloat(paymentAmount);
    if (!payment || payment <= 0) {
      setError('Payment amount must be a positive number');
      return;
    }
    if (isNaN(payment)) {
      setError('Invalid amount');
      return;
    }
    if (!isSpecialPayment && payment > totalAmountDue) {
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
        body: JSON.stringify({ 
          paymentAmount: payment, 
          paymentMethod, 
          assignedTo, 
          returnedProductsValue,
          grnNumber: grnNumber,
          description: isSpecialPayment ? description : undefined // Optional field
        }),
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
    <div className="product-summary-modal-overlay-supplier-payment" onClick={closeModal}>
      <div className={`product-summary-modal-content-supplier-payment ${darkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <h3 className="payment-modal-title">Record Payment for {supplier.supplierName}</h3>
          <button className="payment-modal-close-icon" onClick={closeModal}>
            ✕
          </button>
        </div>
        {success && <p className="success-message">{success}</p>}
        <form className="payment-form" onSubmit={handleSubmit}>
          <div>
            <label className="payment-label">Total Cost | (Returned Products Cost) | (Discounts)</label>
            <input
              className="payment-display"
              type="text"
              value={`Rs. ${totalCost.toFixed(2)} (Rs. ${returnedProductsValue.toFixed(2)}) (Rs. ${discounts.toFixed(2)})`}
              readOnly
            />
            <div className="grn-summary-box" style={{
              marginTop: '2px',
              padding: '10px',
              backgroundColor: darkMode ? '#2d3748' : '#f8f9fa',
              border: `1px solid ${darkMode ? '#4a5568' : '#e9ecef'}`,
              borderRadius: '6px',
              fontSize: '0.95rem'
            }}>
              <div><strong>Items Cost:</strong> {totalitemCost.toFixed(2)}</div>
              <div><strong>Repair Services Cost:</strong> Rs. {pastcharges.toFixed(2)}</div>
              <div><strong>Past Payments:</strong> Rs. {repairServicecharges.toFixed(2)}</div>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <label className="payment-label">Total Amount Due</label>
            <input
              className="payment-display"
              type="text"
              value={`Rs. ${totalAmountDue.toFixed(2)}`}
              readOnly
              style={{
                backgroundColor: darkMode ? '#2d3748' : '#e3f2fd',
                color: darkMode ? '#63b3ed' : '#1976d2',
                fontWeight: 'bold',
                cursor: 'help'
              }}
              title="Click to see breakdown"
              onClick={() => alert(
                products
                  .filter(p => (p.returnstock || 0) > 0)
                  .map(p => `${p.itemName}: ${p.returnstock} × Rs. ${p.buyingPrice} = Rs. ${(p.returnstock * p.buyingPrice).toFixed(2)}`)
                  .join('\n') || 'No returned products'
              )}
            />
          </div>
          {/* Searchable GRN Selector */}
          {/* {supplierGrnOptions.length > 0 && ( */}
            <div>
              <label className="payment-label">Select GRN</label>
              <Select
                value={selectedGrnOption}
                onChange={async (selectedOption) => {
                  const selectedValue = selectedOption ? String(selectedOption.value) : '';
                  setGrnNumber(selectedValue);
                  setDescription(''); // Reset description when changing
                  setGrnTotal(0);
                  setGrnDiscounts(0);
                  setGrnItems([]);
                  setReturnedGrnItems([]);

                  if (selectedValue === '__PAST_PAYMENT__' || selectedValue === '__REPAIR_SERVICE__') {
                    // Unlock payment field — user can type anything
                    setPaymentAmount('');
                  }
                  else if (selectedValue) {
                    const grnOption = supplierGrnOptions.find(g => g.value === selectedValue);
                    if (grnOption) {
                      setGrnTotal(grnOption.totalAmount);
                      setGrnReturnedValue(grnOption.returnedValue || 0);
                      setGrnDiscounts(grnOption.totalDiscounts || 0);
                      setPaymentAmount(grnOption.payableAmount >= 0 ? grnOption.payableAmount.toString() : '0');
                      
                      // Fetch items for display
                      fetchGrnReturnStocks(selectedValue).then(({ items, returnStocks }) => {
                        setGrnItems(items);
                        setReturnedGrnItems(returnStocks);
                      }).catch(err => console.error('Error fetching GRN items:', err));
                    }
                  } else {
                    setPaymentAmount('');
                  }
                }}
                options={allGrnOptions}
                placeholder={grnOptionsLoading ? "Loading GRNs..." : "Select GRN or Past Payment..."}
                isClearable
                isSearchable
                isLoading={grnOptionsLoading}
                className={`react-select-container ${darkMode ? 'dark' : ''}`}
                classNamePrefix="react-select"
                styles={{
                  control: (base, state) => ({
                    ...base,
                    backgroundColor: darkMode ? '#2d3748' : 'white',
                    borderColor: state.isFocused ? (darkMode ? '#6c63ff' : '#007bff') : '#ccc',
                    minHeight: '38px',
                    fontSize: '14px',
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: darkMode ? '#2d3748' : 'white',
                    zIndex: 1000,
                  }),
                  option: (base, { isFocused, isSelected }) => ({
                    ...base,
                    backgroundColor: isSelected
                      ? (darkMode ? '#6c63ff' : '#007bff')
                      : isFocused
                      ? (darkMode ? '#444' : '#e9ecef')
                      : 'transparent',
                    color: isSelected ? 'white' : darkMode ? 'white' : 'black',
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: darkMode ? 'white' : 'black',
                  }),
                }}
              />
            </div>
          {/* )} */}
          {/* GRN Summary (Optional but helpful) */}
          {grnNumber && !isSpecialPayment && (
            <div className="grn-summary-box" style={{
              marginTop: '2px',
              padding: '10px',
              backgroundColor: darkMode ? '#2d3748' : '#f8f9fa',
              border: `1px solid ${darkMode ? '#4a5568' : '#e9ecef'}`,
              borderRadius: '6px',
              fontSize: '0.95rem'
            }}>
              <div><strong>GRN:</strong> {grnNumber}</div>
              <div><strong>GRN Total:</strong> Rs. {grnTotal.toFixed(2)}</div>
              <div><strong>Returned Value:</strong> Rs. {grnReturnedValue.toFixed(2)}</div>
              <div><strong>Discounts:</strong> Rs. {grnDiscounts.toFixed(2)}</div>
              <div><strong>Payable Amount:</strong> <span style={{ color: '#38a169', fontWeight: 'bold' }}>Rs. {(grnTotal - grnReturnedValue - grnDiscounts).toFixed(2)}</span></div>
            </div>
          )}
          {/* GRN Items List */}
          {grnItems.length > 0 && (
            <div style={{ marginTop: '10px', maxHeight: '150px', overflowY: 'auto' }}>
              <strong>Items in GRN:</strong>
              <ul style={{ paddingLeft: '20px', marginTop: '6px', marginBottom: '0' }}>
                {grnItems.map((item, i) => (
                  <li key={i} style={{ fontSize: '0.9rem' }}>
                    {item.itemName} × {item.quantity} {returnedGrnItems[item.itemCode] > 0 ? ` ( Returned ${returnedGrnItems[item.itemCode]} )` : ""}  @ Rs. {item.buyingPrice.toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Description for Past Payment */}
          {isSpecialPayment && (
            <div style={{ marginTop: '12px' }}>
              <label className="payment-label">Description (Optional)</label>
              <input
                className="payment-input"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  grnNumber === '__REPAIR_SERVICE__' 
                    ? 'e.g., Screen replacement, battery fix' 
                    : 'e.g., Advance payment, old debt'
                }
              />
            </div>
          )}
          <div>
            <label className="payment-label">Current Payment Amount</label>
            <input
              className="payment-input"
              type="text"
              value={paymentAmount}
              onChange={(e) => {
                // Only allow manual edit if NO GRN is selected
                if (isSpecialPayment) {
                  setPaymentAmount(e.target.value);
                }
              }}
              placeholder="Enter payment amount"
              readOnly={grnNumber && !isSpecialPayment} // 🔒 Locked only for real GRNs
              style={{
                backgroundColor: (grnNumber && !isSpecialPayment) 
                  ? (darkMode ? '#2d3748' : '#f0f8ff') 
                  : '',
                cursor: (grnNumber && !isSpecialPayment) ? 'not-allowed' : 'text'
              }}
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