// SummaryForm.jsx

import React, { useState, useMemo, useEffect } from 'react';
import '../styles/Supplier.css';

const SummaryForm = ({ suppliers, closeModal, darkMode, fetchGrnReturnStocks }) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  const selectedSupplier = suppliers.find((supplier) => supplier._id === selectedSupplierId);

  // Calculate paid GRNs
  const paidGrnNumbers = useMemo(() => {
    if (!selectedSupplier) return new Set();
    const paid = new Set();
    selectedSupplier.paymentHistory.forEach(payment => {
      if (payment.grnNumber && !['__PAST_PAYMENT__', '__REPAIR_SERVICE__'].includes(payment.grnNumber)) {
        paid.add(String(payment.grnNumber));
      }
    });
    return paid;
  }, [selectedSupplier]);

  const [grnDetails, setGrnDetails] = useState({});
  const [loadingGrns, setLoadingGrns] = useState(false);

  // Fetch GRN details when supplier changes
  useEffect(() => {
    const loadGrnDetails = async () => {
      // ✅ Check if supplier exists and has items
      if (!selectedSupplier || !Array.isArray(selectedSupplier.items) || selectedSupplier.items.length === 0) {
        setGrnDetails({});
        setLoadingGrns(false);
        return;
      }
      
      setLoadingGrns(true);
      const grnList = getGrnOptionsFromSupplier(selectedSupplier);
      console.log('GRN List for Summary:', grnList); // Should now show data!

      if (grnList.length === 0) {
        setGrnDetails({});
        setLoadingGrns(false);
        return;
      }

      const details = {};
      const promises = grnList.map(async (grn) => {
        const grnNum = String(grn.grnNumber || '');
        try {
          // ✅ Pass both args — matches SupplierList's fetchGrnReturnStocks signature
          const result = await fetchGrnReturnStocks(selectedSupplier._id, grnNum);
          const items = result.items || [];
          const returnedValue = result.returnedValue || 0;
          const total = items.reduce((sum, item) => sum + (item.quantity * item.buyingPrice), 0);
          const grnDiscounts = (selectedSupplier.discounts || [])
            .filter(d => String(d.grnNumber) === grnNum)
            .reduce((sum, d) => sum + (d.discountCharge || 0), 0);
          const payable = Math.max(0, total - returnedValue - grnDiscounts);
          const isPaid = paidGrnNumbers.has(grnNum);
          details[grnNum] = {
            grnNumber: grnNum,
            grnDate: grn.grnDate,
            items,
            returnedValue,
            total,
            discounts: grnDiscounts,
            payable,
            isPaid,
          };
        } catch (err) {
          console.warn(`Failed to load GRN ${grnNum}`, err);
          const total = grn.totalAmount || 0;
          details[grnNum] = {
            grnNumber: grnNum,
            grnDate: grn.grnDate,
            items: [],
            returnedValue: 0,
            total,
            discounts: 0,
            payable: total,
            isPaid: paidGrnNumbers.has(grnNum),
          };
        }
      });

      await Promise.all(promises);
      setGrnDetails(details);
      setLoadingGrns(false);
      // console.log('Final grnDetails:', details);
    };

    if (selectedSupplier) {
      loadGrnDetails();
    } else {
      setGrnDetails({});
      setLoadingGrns(false);
    }

  }, [selectedSupplier, paidGrnNumbers, fetchGrnReturnStocks]);

  // ====== NEW: Calculate paid amounts per category ======
  const paidForItems = selectedSupplier?.paymentHistory
    .filter(p => 
      p.grnNumber && 
      p.grnNumber !== '__PAST_PAYMENT__' && 
      p.grnNumber !== '__REPAIR_SERVICE__'
    )
    .reduce((sum, p) => sum + parseFloat(p.currentPayment || 0), 0) || 0;

  const paidForRepairServices = selectedSupplier?.paymentHistory
    .filter(p => p.grnNumber === '__REPAIR_SERVICE__')
    .reduce((sum, p) => sum + parseFloat(p.currentPayment || 0), 0) || 0;

  const paidForPastPayments = selectedSupplier?.paymentHistory
    .filter(p => p.grnNumber === '__PAST_PAYMENT__')
    .reduce((sum, p) => sum + parseFloat(p.currentPayment || 0), 0) || 0;

  // Inside SummaryForm component
  const getGrnOptionsFromSupplier = (supplier) => {
    if (!supplier || !Array.isArray(supplier.items)) return [];

    const grnGroups = {};

    supplier.items.forEach(item => {
      if (!item.grnNumber) return;

      if (!grnGroups[item.grnNumber]) {
        grnGroups[item.grnNumber] = {
          grnNumber: item.grnNumber,
          grnDate: item.createdAt,
          totalAmount: 0,
          items: []
        };
      }

      grnGroups[item.grnNumber].totalAmount += (item.buyingPrice || 0) * (item.quantity || 0);
      grnGroups[item.grnNumber].items.push(item);
    });

    return Object.values(grnGroups).map(grn => ({
      grnNumber: grn.grnNumber,
      grnDate: grn.grnDate,
      totalAmount: grn.totalAmount,
      // We don't need payable here — it's calculated later via fetchGrnReturnStocks
    }));
  };

  // --- Aggregate totals (same as before) ---
  let totalQuantity = 0;
  let totalitemPrice = 0;
  let discounts = 0;
  let pastcharges = 0;
  let repairServicecharges = 0;
  let totalPayments = 0;
  let totalCost = 0;
  let amountDue = 0;

  if (selectedSupplier) {
    totalQuantity = selectedSupplier.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    totalitemPrice = selectedSupplier.items.reduce(
      (sum, item) => sum + (item.buyingPrice || 0) * (item.quantity || 0),
      0
    );
    discounts = selectedSupplier.discounts.reduce((sum, d) => sum + (d.discountCharge || 0), 0);
    pastcharges = selectedSupplier.pastPayments.reduce((sum, p) => sum + (p.paymentCharge || 0), 0);
    repairServicecharges = selectedSupplier.repairService.reduce((sum, p) => sum + (p.paymentCharge || 0), 0);
    totalPayments = selectedSupplier.paymentHistory.reduce((sum, p) => sum + parseFloat(p.currentPayment || 0), 0);
    totalCost = totalitemPrice + pastcharges + repairServicecharges;
    amountDue = totalCost - totalPayments - discounts;
  }

  const unpaidGrns = Object.values(grnDetails).filter(g => !g.isPaid);
  const paidGrns = Object.values(grnDetails).filter(g => g.isPaid);

  const remainingForItems = Math.max(0, totalitemPrice - paidForItems);
  const remainingForRepairs = Math.max(0, repairServicecharges - paidForRepairServices);
  const remainingForPast = Math.max(0, pastcharges - paidForPastPayments);

  return (
    <div className="summary-modal-overlay" onClick={closeModal}>
      <div className={`summary-modal-content ${darkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="summary-modal-header">
          <h3 className="summary-modal-title">Supplier Summary</h3>
          <button className="summary-modal-close-icon" onClick={closeModal}>
            ✕
          </button>
        </div>

        <form className="summary-form">
          <div>
            <label className="summary-label">Select Supplier</label>
            <select
              className="summary-select"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
            >
              <option value="">-- Select a Supplier --</option>
              {suppliers.map((supplier) => (
                <option key={supplier._id} value={supplier._id}>
                  {supplier.supplierName}
                </option>
              ))}
            </select>
          </div>

          {selectedSupplier && (
            <>
              {/* High-level summary */}
              <table className="summary-table">
                <thead>
                  <tr><th>Metric</th><th>Value</th></tr>
                </thead>
                <tbody>
                  <tr><td>Supplier Name</td><td>{selectedSupplier.supplierName || 'N/A'}</td></tr>
                  <tr><td>Total Quantity Purchased</td><td>{totalQuantity}</td></tr>
                  <tr><td>Total Item Cost</td><td>Rs. {totalitemPrice.toFixed(2)}</td></tr>
                  <tr><td style={{ paddingLeft: '20px' }}><strong>→ Paid for Items</strong></td><td><strong>Rs. {paidForItems.toFixed(2)}</strong></td></tr>
                  <tr><td style={{ paddingLeft: '20px', color: '#e53e3e' }}><strong>→ Remaining for Items</strong></td><td style={{ color: '#e53e3e' }}><strong>Rs. {remainingForItems.toFixed(2)}</strong></td></tr>

                  <tr><td>Total Repair Cost</td><td>Rs. {repairServicecharges.toFixed(2)}</td></tr>
                  <tr><td style={{ paddingLeft: '20px' }}><strong>→ Paid for Repairs</strong></td><td><strong>Rs. {paidForRepairServices.toFixed(2)}</strong></td></tr>
                  <tr><td style={{ paddingLeft: '20px', color: '#e53e3e' }}><strong>→ Remaining for Items</strong></td><td style={{ color: '#e53e3e' }}><strong>Rs. {remainingForRepairs.toFixed(2)}</strong></td></tr>

                  <tr><td>Total Previous Charges</td><td>Rs. {pastcharges.toFixed(2)}</td></tr>
                  <tr><td style={{ paddingLeft: '20px' }}><strong>→ Paid for Past Payments</strong></td><td><strong>Rs. {paidForPastPayments.toFixed(2)}</strong></td></tr>
                  <tr><td style={{ paddingLeft: '20px', color: '#e53e3e' }}><strong>→ Remaining for Items</strong></td><td style={{ color: '#e53e3e' }}><strong>Rs. {remainingForPast.toFixed(2)}</strong></td></tr>

                  <tr><td>Total Cost</td><td>Rs. {totalCost.toFixed(2)}</td></tr>
                  <tr><td>Total Payments Made</td><td>Rs. {totalPayments.toFixed(2)}</td></tr>
                  <tr><td>Total Discounts</td><td>Rs. {discounts.toFixed(2)}</td></tr>
                  <tr><td>Amount Due</td><td>Rs. {amountDue.toFixed(2)}</td></tr>
                </tbody>
                </table>

              {/* === GRN Summary Section === */}
              {loadingGrns ? (
                <div style={{ marginTop: '24px', textAlign: 'center', color: darkMode ? '#a0aec0' : '#718096' }}>
                  <p>Loading GRN details…</p>
                  <div style={{ 
                    width: '24px', 
                    height: '24px', 
                    border: '3px solid #e2e8f0', 
                    borderTopColor: darkMode ? '#63b3ed' : '#3182ce', 
                    borderRadius: '50%', 
                    margin: '8px auto',
                    animation: 'spin 1s linear infinite' 
                  }} />
                </div>
              ) :  Object.values(grnDetails).length > 0 ? (
                <div style={{ marginTop: '24px' }}>
                  <h4>🧾 GRN Summary</h4>

                  {/* Unpaid GRNs */}
                  {unpaidGrns.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <h5 style={{ color: darkMode ? '#f56565' : '#e53e3e', marginBottom: '8px' }}>
                        ⚠️ Unpaid GRNs ({unpaidGrns.length})
                      </h5>
                      {unpaidGrns.map((grn) => (
                        <div
                          key={grn.grnNumber}
                          style={{
                            border: `1px solid ${darkMode ? '#4a5568' : '#e2e8f0'}`,
                            borderRadius: '6px',
                            padding: '12px',
                            marginBottom: '12px',
                            backgroundColor: darkMode ? '#2d3748' : '#f8fafc',
                          }}
                        >
                          <div><strong>GRN:</strong> {grn.grnNumber}</div>
                          <div><strong>Date:</strong> {grn.grnDate ? new Date(grn.grnDate).toLocaleDateString('en-GB') : 'N/A'}</div>
                          <div><strong>Total:</strong> Rs. {grn.total.toFixed(2)}</div>
                          <div><strong>Returned Value:</strong> Rs. {grn.returnedValue.toFixed(2)}</div>
                          <div><strong>Discounts:</strong> Rs. {grn.discounts.toFixed(2)}</div>
                          <div>
                            <strong>Payable:</strong>{' '}
                            <span style={{ color: '#e53e3e', fontWeight: 'bold' }}>
                              Rs. {grn.payable.toFixed(2)}
                            </span>
                          </div>
                          {grn.items.length > 0 && (
                            <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>
                              <strong>Items:</strong>
                              <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
                                {grn.items.map((item, i) => (
                                  <li key={i}>
                                    {item.itemName} × {item.quantity} @ Rs. {item.buyingPrice.toFixed(2)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Paid GRNs */}
                  {paidGrns.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <h5 style={{ color: darkMode ? '#68d391' : '#38a169', marginBottom: '8px' }}>
                        ✅ Paid GRNs ({paidGrns.length})
                      </h5>
                      {paidGrns.map((grn) => (
                        <div
                          key={grn.grnNumber}
                          style={{
                            border: `1px solid ${darkMode ? '#4a5568' : '#e2e8f0'}`,
                            borderRadius: '6px',
                            padding: '12px',
                            marginBottom: '12px',
                            backgroundColor: darkMode ? '#2d3748' : '#f8fafc',
                          }}
                        >
                          <div><strong>GRN:</strong> {grn.grnNumber}</div>
                          <div><strong>Date:</strong> {grn.grnDate ? new Date(grn.grnDate).toLocaleDateString('en-GB') : 'N/A'}</div>
                          <div><strong>Total:</strong> Rs. {grn.total.toFixed(2)}</div>
                          <div><strong>Returned Value:</strong> Rs. {grn.returnedValue.toFixed(2)}</div>
                          <div><strong>Discounts:</strong> Rs. {grn.discounts.toFixed(2)}</div>
                          <div>
                            <strong>Payable:</strong> Rs. {grn.payable.toFixed(2)}
                          </div>
                          {grn.items.length > 0 && (
                            <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>
                              <strong>Items:</strong>
                              <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
                                {grn.items.map((item, i) => (
                                  <li key={i}>
                                    {item.itemName} × {item.quantity} @ Rs. {item.buyingPrice.toFixed(2)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : selectedSupplier ? (
                <div style={{ marginTop: '24px', color: darkMode ? '#a0aec0' : '#718096' }}>
                  <p>No GRNs found for this supplier.</p>
                </div>
              ) : null}
            

              {/* Special Charges */}
              {(selectedSupplier.pastPayments.length > 0 || selectedSupplier.repairService.length > 0) && (
                <div style={{ marginTop: '24px' }}>
                  <h4>Special Charges</h4>
                  {selectedSupplier.pastPayments.map((pp, i) => (
                    <div key={`pp-${i}`} style={{ marginBottom: '6px' }}>
                      <strong>Past Payment:</strong> Rs. {pp.paymentCharge} — {pp.description || 'N/A'}
                    </div>
                  ))}
                  {selectedSupplier.repairService.map((rs, i) => (
                    <div key={`rs-${i}`} style={{ marginBottom: '6px' }}>
                      <strong>Repair Service:</strong> Rs. {rs.paymentCharge} — {rs.description || 'N/A'}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default SummaryForm;