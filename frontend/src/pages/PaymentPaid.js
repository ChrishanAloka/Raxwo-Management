import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/PaymentPaid.css";
import { jsPDF } from 'jspdf';
import paymenticon from "../icon/pos-terminal3.png";

const PaymentPaid = ({ totalAmount, items, onClose, darkMode, cashierId, cashierName, isWholesale, customerDetails, customerName, contactNumber, address, description, assignedTo, paymentDate }) => {
  const navigate = useNavigate();
  // const [paymentMethod, setPaymentMethod] = useState("");
  // const [paidAmount, setPaidAmount] = useState("");
  // const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  const [paymentEntries, setPaymentEntries] = useState([{ method: '', amount: '' }]);
  const [totalPaid, setTotalPaid] = useState(0);

  const [duplicateError, setDuplicateError] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // useEffect(() => {
  //   setPaidAmount("");
  //   setBalance(0);
  //   console.log('PaymentPaid props:', { customerName, contactNumber, address, description, assignedTo }); // Debug log
  // }, [totalAmount, customerName, contactNumber, address, description, assignedTo]);

  // useEffect(() => {
  //   const handleKeyDown = (e) => {
  //     if (["Enter", "Backspace", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "."].includes(e.key)) {
  //       e.preventDefault();
  //     }

  //     if (/^[0-9]$/.test(e.key) || e.key === ".") {
  //       handlePaidAmountChange(e.key);
  //     } else if (e.key === "Backspace") {
  //       handleDelete();
  //     } else if (e.key === "Enter") {
  //       if (paymentMethod && parseFloat(paidAmount || 0) >= totalAmount && !loading) {
  //         handleConfirmPayment();
  //       }
  //     }
  //   };

  //   window.addEventListener("keydown", handleKeyDown);
  //   return () => window.removeEventListener("keydown", handleKeyDown);
  // }, [paidAmount, paymentMethod, loading, totalAmount]);

  // const handlePaidAmountChange = (value) => {
  //   const input = paidAmount + value;
  //   if (/^\d*\.?\d*$/.test(input)) {
  //     setPaidAmount(input);
  //     const newBalance = parseFloat(input || 0) - totalAmount;
  //     setBalance(newBalance);
  //   }
  // };

  // const handleDelete = () => {
  //   const newPaidAmount = paidAmount.slice(0, -1);
  //   setPaidAmount(newPaidAmount);
  //   const newBalance = parseFloat(newPaidAmount || 0) - totalAmount;
  //   setBalance(newBalance);
  // };

  const handleDialpadInput = (value) => {
    if (paymentEntries.length === 0) return;
    const lastIndex = paymentEntries.length - 1;
    const lastEntry = paymentEntries[lastIndex];
    let newAmount = lastEntry.amount + value;
    if (/^\d*\.?\d*$/.test(newAmount)) {
      updatePaymentMethod(lastIndex, 'amount', newAmount);
    }
  };

  const handleDialpadDelete = () => {
    if (paymentEntries.length === 0) return;
    const lastIndex = paymentEntries.length - 1;
    const lastEntry = paymentEntries[lastIndex];
    const newAmount = lastEntry.amount.slice(0, -1);
    updatePaymentMethod(lastIndex, 'amount', newAmount);
  };

  const recalculateTotalPaid = (entries) => {
    const total = entries.reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0);
    setTotalPaid(total);
    return total;
  };

  const addPaymentMethod = () => {
    // Prevent adding if Credit is selected
    if (paymentEntries.some(entry => entry.method === 'Credit')) {
      return; // silently ignore or show message
    }
    
    setPaymentEntries([...paymentEntries, { method: '', amount: '' }]);
  };

  const removePaymentMethod = (index) => {
    if (paymentEntries.length <= 1) return;
    const newEntries = paymentEntries.filter((_, i) => i !== index);
    setPaymentEntries(newEntries);
    recalculateTotalPaid(newEntries);
    setDuplicateError('');
    setPaymentError('');
  };

  const updatePaymentMethod = (index, field, value) => {
    // If setting a method to "Credit"
    if (field === 'method' && value === 'Credit') {
      // Reset to only one Credit entry
      setPaymentEntries([{ method: 'Credit', amount: '' }]);
      setTotalPaid(totalAmount); // credit covers full amount
      setDuplicateError('');
      setPaymentError('');
      return;
    }

    // If currently in Credit-only mode and changing away from Credit
    if (paymentEntries.length === 1 && paymentEntries[0].method === 'Credit' && field === 'method' && value !== 'Credit') {
      // Allow switching to another method, keep one entry
      const newEntries = [{ method: value, amount: '' }];
      setPaymentEntries(newEntries);
      recalculateTotalPaid(newEntries);
      setDuplicateError('');
      setPaymentError('');
      return;
    }
    
    const newEntries = [...paymentEntries];
    newEntries[index][field] = value;
    setPaymentEntries(newEntries);
    recalculateTotalPaid(newEntries);
    setDuplicateError('');
    setPaymentError('');
    // Only validate if field is 'method'
    if (field === 'method') {
      const selectedMethods = newEntries
        .map(entry => entry.method)
        .filter(method => method !== ''); // ignore empty

      const hasDuplicates = new Set(selectedMethods).size !== selectedMethods.length;

      if (hasDuplicates) {
        setDuplicateError('❌ Cannot use the same payment method more than once.');
      } else {
        setDuplicateError('');
      }
    }
  };

  // Helper to generate receipt HTML
  const generateReceiptHTML = (paymentData, context) => {
    const shopName = localStorage.getItem('shopName') || 'GENIUS';
    const shopAddress = localStorage.getItem('shopAddress') || '#422 Thimbirigasyaya Road, Colombo 05';
    const shopPhone = localStorage.getItem('shopPhone') || '0770235330';
    const shopEmail = localStorage.getItem('shopEmail') || 'igentuslk@gmail.com';

    const { customerName, contactNumber, items, totalAmount, paymentMethod, invoiceNumber } = context;
    const invoiceNo = invoiceNumber.split('-')[1];

    const subtotal = items.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
    const totalDiscount = items.reduce((sum, item) => sum + (item.discount || 0), 0);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Payment Receipt - ${invoiceNumber}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        <style>
          @page { size: 80mm 140mm; margin: 5mm; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 10px;
            margin: 0;
            padding: 5mm;
            background: white;
            color: #000;
            width: 70mm;
            position: relative;
          }
          .header { text-align: center; margin-bottom: 5px; }
          .shop-name { font-size: 14px; font-weight: bold; }
          .tagline { font-size: 9px; }
          .contact { font-size: 9px; }
          .divider { border-top: 1px dashed #000; margin: 5px 0; }
          .invoice { font-weight: bold; text-align: center; margin: 5px 0; }
          .details { margin: 5px 0; line-height: 1.4; }
          .items { margin: 5px 0; }
          .item-row { display: flex; justify-content: space-between; }
          .item-name { width: 40%; }
          .item-qty { width: 10%; }
          .item-amt { width: 30%; text-align: right; }
          .total { margin-top: 5px; font-weight: bold; text-align: right; }
          .footer { text-align: center; margin-top: 10px; font-size: 8px; }
          .action-buttons {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin: 10px 0;
          }
          .print-btn, .download-btn {
            padding: 8px 12px;
            font-size: 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .print-btn { background-color: #007bff; color: white; }
          .download-btn { background-color: #28a745; color: white; }
          @media print { 
            .action-buttons { display: none !important; } 
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${shopName}</div>
          <div class="tagline">YOUR TRUSTED REPAIR PARTNER</div>
          <div class="contact">${shopAddress}<br>Phone: ${shopPhone} / ${shopEmail}</div>
        </div>
        <div class="divider"></div>
        <div class="invoice">INVOICE NO ${invoiceNo} - ${paymentMethod}</div>
        <div class="divider"></div>
        <div class="details">
          <div><strong>NAME:</strong> ${customerName}</div>
          <div><strong>CONTACT:</strong> ${contactNumber}</div>
        </div>
        <div class="divider"></div>
        <div class="items">
          <div class="item-row" style="font-weight: bold;">
            <span class="item-qty">QTY</span>
            <span class="item-name">DESCRIPTION</span>
            <span class="item-amt">AMOUNT</span>
          </div>
          <div class="divider"></div>
          ${items.map(item => `
            <div class="item-row">
              <span class="item-qty">${item.quantity}</span>
              <span class="item-name">${item.itemName.length > 12 ? item.itemName : item.itemName}</span>
              <span class="item-amt">Rs. ${(item.sellingPrice * item.quantity).toFixed(2)}</span>
            </div>
            ${item.discount > 0 ? `
              <div class="item-row">
                <span></span>
                <span class="item-name">Discount</span>
                <span class="item-amt">Rs. ${item.discount.toFixed(2)}</span>
              </div>
            ` : ''}
          `).join('')}
        </div>
        <div class="divider"></div>
        <div class="total">TOTAL: Rs. ${totalAmount.toFixed(2)}</div>
        <div class="divider"></div>
        <div class="footer">
          Thank you for your business!<br>
          Software by Exyplan Software<br>
          Contact: 074 357 3323
        </div>
        <div class="action-buttons">
          <button class="print-btn" onclick="window.print()">Print</button>
          <button class="download-btn" onclick="downloadPDF()">Download PDF</button>
        </div>
        <script>
          function downloadPDF() {
            const { jsPDF } = window.jspdf;

            // Configure html2canvas
              html2canvas(document.body, {
                scale: 3,                    // High quality
                useCORS: true,               // Load cross-origin images
                logging: false,
                backgroundColor: '#ffffff',
                scrollY: -window.scrollY,    // Capture full body without scroll issues
                width: document.body.scrollWidth,  // Force full width
                height: document.body.scrollHeight,
                windowWidth: document.body.scrollWidth,
                windowHeight: document.body.scrollHeight
              }).then(function(canvas) {
                const imgData = canvas.toDataURL('image/png', 1.0);

                // Get actual rendered content dimensions in mm
                const dpi = 96; // Assumed screen DPI (common default)
                const mmToInch = 25.4;
                const pxToMm = mmToInch / dpi;

                const widthInPx = canvas.width;
                const heightInPx = canvas.height;

                const widthInMm = (widthInPx * pxToMm);
                const heightInMm = (heightInPx * pxToMm);

                // Create PDF with exact size of content
                const pdf = new jsPDF({
                  orientation: 'portrait',
                  unit: 'mm',
                  format: [widthInMm, heightInMm]  // Dynamic size to fit content
                });

                // Add image at full width and correct height
                pdf.addImage(imgData, 'PNG', 0, 0, widthInMm, heightInMm);
                pdf.save('Receipt_${invoiceNumber}.pdf');
              });
          }
        </script>
      </body>
      </html>
    `;
  };

  const generateCustomBill = () => {
    const shopName = localStorage.getItem('shopName') || 'GENIUS';
    const shopAddress = localStorage.getItem('shopAddress') || '#422 Thimbirigasyaya Road, Colombo 05';
    const shopPhone = localStorage.getItem('shopPhone') || '0770235330';
    const shopEmail = localStorage.getItem('shopEmail') || 'igentuslk@gmail.com';

    const shopLogo = localStorage.getItem('shopLogo') || '';
    const currentDate = new Date().toLocaleString();

    // const customerName = customerName || "N/A";
    // const contactNumber = contactNumber || "N/A";
    // const address = paymentData.address || "N/A";
    // const description = description || "N/A";
    // const paymentMethod = paymentData.paymentMethod || "Not Selected";
    // const items = paymentData.items || [];
    // const totalAmount = paymentData.totalAmount || 0;
    // const paidAmount = paymentData.totalAmount || 0;
    const balance = totalPaid - totalAmount;
    
    const subtotal = items.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
    const totalDiscount = items.reduce((sum, item) => sum + (item.discount || 0), 0);

    const billHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>POS_Bill_${new Date().toISOString().slice(0, 10)}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        <style>
          @media print {
            @page { size: A4; margin: 10mm; }
            .action-buttons { display: none !important; }
            body, .container {
              margin: 0;
              padding: 0;
              box-shadow: none;
              background: white;
            }
          }
          @media screen {
            .container {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 15mm;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
              background: white;
            }
          }
          body {
            font-family: 'Helvetica', sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
            color: #000;
          }
          .container {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 15mm;
            position: relative;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .header img {
            max-width: 100px;
            max-height: 100px;
            margin-bottom: 10px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            color: #333;
          }
          .header p {
            margin: 5px 0;
            color: #666;
          }
          .details-container {
            display: flex;
            justify-content: space-between;
          }
          .details p, .totals p {
            margin: 5px 0;
            font-size: 14px;
          }
          .details strong {
            display: inline-block;
            width: 150px;
            color: #333;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            color: #333;
          }
          .totals {
            border: 1px solid #ddd;
            padding: 10px;
            background-color: #f9f9f9;
          }
          .action-buttons {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin: 20px 0;
          }
          .print-btn, .download-btn {
            padding: 10px 20px;
            font-size: 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .print-btn {
            background-color: #007bff;
            color: white;
          }
          .download-btn {
            background-color: #28a745;
            color: white;
          }
        </style>
      </head>
      <body>
        <div class="action-buttons">
          <button class="print-btn" onclick="window.print()">Print Bill</button>
          <button class="download-btn" onclick="downloadPDF()">Download PDF</button>
        </div>

        <div class="container">
          <div class="header">
            ${shopLogo ? `<img src="${shopLogo}" alt="Shop Logo" />` : ''}
            <h1>Payment Receipt</h1>
            <p>${shopName}</p>
            <p>${shopAddress}</p>
            <p>Phone: ${shopPhone}</p>
          </div>

          <div class="details">
            <div class="details-container">
              <div>
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Contact:</strong> ${contactNumber}</p>
                <p><strong>Description:</strong> ${description}</p>
              </div>
              <div>
                <p><strong>Date:</strong> ${currentDate}</p>
                <p><strong>Payment:</strong> ${paymentEntries.map(e => `${e.method}: Rs.${parseFloat(e.amount).toFixed(2)}`).join(', ')}</p>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Discount</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                const total = (item.sellingPrice * item.quantity - (item.discount || 0)).toFixed(2);
                return `
                  <tr>
                    <td>${item.itemName}</td>
                    <td>${item.quantity}</td>
                    <td>Rs. ${item.sellingPrice.toFixed(2)}</td>
                    <td>Rs. ${(item.discount || 0).toFixed(2)}</td>
                    <td>Rs. ${total}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="details-container">
              <div>
                <p><strong>Subtotal:</strong> Rs. ${subtotal.toFixed(2)}</p>
                <p><strong>Total Discount:</strong> Rs. ${totalDiscount.toFixed(2)}</p>
                <p><strong>Total Amount:</strong> Rs. ${totalAmount.toFixed(2)}</p>
              </div>
              <div>
                <p><strong>Paid Amount:</strong> Rs. ${totalPaid.toFixed(2)}</p>
                <p><strong>Balance:</strong> Rs. ${balance.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        <script type="text/javascript">
          function downloadPDF() {
            const { jsPDF } = window.jspdf;
            const element = document.querySelector('.container');
            html2canvas(element, {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff'
            }).then(canvas => {
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
              });
              const imgProps = pdf.getImageProperties(imgData);
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
              pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
              pdf.save('POS_Bill_${new Date().toISOString().slice(0, 10)}.pdf');
            });
          }
        </script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(billHTML);
    win.document.close();
  };

  const handleConfirmPayment = async () => {
    setPaymentError('');
    // Validate
    const nonCreditEntries = paymentEntries.filter(e => e.method && e.method !== "Credit" && e.amount !== '' && parseFloat(e.amount) > 0);
    const hasCredit = paymentEntries.some(e => e.method === "Credit");

    const validEntries = paymentEntries;

    // Validation
    if (nonCreditEntries.length === 0 && !hasCredit) {
      setPaymentError("Please add at least one valid payment method.");
      return;
    }

    const totalPaidNum = parseFloat(totalPaid.toFixed(2));
    const changeGiven = Math.max(0, totalPaidNum - totalAmount); // never negative
    if (totalPaidNum < totalAmount - 0.01 && !hasCredit) {
      setPaymentError("Total paid is less than the amount due.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Authentication required.");
      navigate('/cashier/login');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("https://raxwo-management.onrender.com/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map(({ _id, itemName, quantity, sellingPrice, discount, assignedTo }) => ({
            productId: _id,
            itemName,
            quantity,
            price: sellingPrice,
            discount: discount || 0,
            assignedTo,
          })),
          totalAmount,
          discountApplied: items.reduce((sum, item) => sum + (item.discount || 0), 0),
          paymentMethods: validEntries.map(e => ({
            method: e.method,
            amount: parseFloat(e.amount) || 0
          })),
          totalPaid: totalPaidNum,
          changeGiven,
          cashierId,
          cashierName,
          isWholesale: isWholesale || false,
          customerDetails: isWholesale ? customerDetails : null,
          customerName: customerName || '',
          contactNumber: contactNumber || '',
          address: address || '',
          description: description || '',
          assignedTo: assignedTo || '',
          paymentDate: paymentDate || new Date().toISOString().split('T')[0], // fallback
          creditedDate: hasCredit ? new Date().toISOString().split('T')[0] : null,
          hasCredit,
        }),
      });

      const data = await response.json();
      console.log('Payment response:', data); // Debug log
      alert("Payment Saved");
      setLoading(false);

      // ✅ Open the popup immediately (before API call)
      // const popup = window.open('', '_blank');

      if (response.ok) {
        
        // const popup = window.open('', '_blank');
        // const receiptHTML = generateReceiptHTML(data.payment, {
        //   customerName,
        //   contactNumber,
        //   items,
        //   totalAmount,
        //   paymentMethod: "Split Payment", // or list methods
        //   invoiceNumber: data.invoiceNumber
        // });
        // popup.document.write(receiptHTML);
        // popup.document.close();
        // generateCustomBill();

        alert(`Payment successful!\nTotal: Rs.${totalAmount.toFixed(2)}\nPaid: Rs.${totalPaidNum.toFixed(2)}\nChange: Rs.${(totalPaidNum - totalAmount).toFixed(2)}\nInvoice: ${data.invoiceNumber}`);
        onClose(data.invoiceNumber);
      } else {
        // popup.close(); // Close empty popup on error
        if (response.status === 401) {
          alert("Session expired or invalid token. Please log in again.");
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          localStorage.removeItem('username');
          localStorage.removeItem('role');
          navigate('/cashier/login');
        } else {
          alert(`Error: ${data.message || 'Failed to process payment.'}`);
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      setLoading(false);
      alert("Failed to process payment. Please try again.");
      // if (popup) popup.close(); // Close if open
      // alert("Failed to process payment. Please try again.");
    }
  };

  return (
    <div className="popup">
      {/* 🔒 Full-screen loading overlay */}
      {loading && (
        <div className="payment-loading-overlay">
          <div className="payment-loading-spinner">
            <div className="spinner"></div>
            <p>Processing payment... Please wait</p>
          </div>
        </div>
      )}

      <div className={`popup-content ${darkMode ? "dark-mode" : ""}`}>
        <div className="left-section">
          <h2 className={`pop-title ${darkMode ? "dark-mode" : ""}`}>Complete Payment</h2>

          <div className="payment-methods-section">
            <label className={`p-lbl ${darkMode ? "dark-mode" : ""}`}>Payment Methods:</label>
            {paymentEntries.map((entry, index) => {
              const isCredit = entry.method === "Credit";
              return (
                <div key={index} className="payment-entry" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <select
                    value={entry.method}
                    onChange={(e) => updatePaymentMethod(index, 'method', e.target.value)}
                    className={`p-lbl ${darkMode ? "dark-mode" : ""}`}
                    style={{ flex: 1 }}
                    disabled={loading} // 🔒 Disable during loading
                  >
                    <option value="">Select</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank-Transfer">Bank Transfer</option>
                    <option value="Bank-Check">Bank Check</option>
                    <option value="Credit">Credit</option>
                  </select>
                  {isCredit ? (
                    <input
                      type="text"
                      value={0}
                      readOnly
                      className={`customer-input ${darkMode ? 'dark' : ''}`}
                      style={{ width: '150px', marginLeft: '8px', backgroundColor: '#f0f0f0' }}
                      disabled
                    />
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={entry.amount}
                      onFocus={(e) => e.target.select()}
                      onWheel={(e) => e.target.blur()}
                      onChange={(e) => updatePaymentMethod(index, 'amount', e.target.value)}
                      className={`customer-input ${darkMode ? 'dark' : ''}`}
                      style={{ width: '120px', marginLeft: '8px' }}
                      disabled={loading} // 🔒 Disable during loading
                    />
                  )}
                  {paymentEntries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePaymentMethod(index)}
                      style={{ marginLeft: '8px', background: 'red', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px' }}
                      disabled={loading} // 🔒 Disable during loading
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
            {!paymentEntries.some(entry => entry.method === "Credit") && (
              <button 
                type="button" 
                onClick={addPaymentMethod} 
                style={{ marginTop: '8px', fontSize: '14px' }}
                disabled={loading} // 🔒 Disable during loading
              >
                + Add Another Method
              </button>
            )}
          </div>

          {duplicateError && (
            <p style={{ color: 'red', fontSize: '13px', marginTop: '6px', textAlign: 'center' }}>
              {duplicateError}
            </p>
          )}

          <p className={`balance ${darkMode ? "dark-mode" : ""}`}>
            <strong>Total Paid:</strong> Rs.{totalPaid.toFixed(2)}
          </p>
          <p className={`balance ${darkMode ? "dark-mode" : ""}`}>
            <strong>Change:</strong> Rs.{(totalPaid - totalAmount).toFixed(2)}
          </p>

          {paymentError && (
            <p style={{ color: 'red', fontSize: '13px', marginTop: '6px', textAlign: 'center' }}>
              ❌ {paymentError}
            </p>
          )}

          <div className="button-group">
            <button
              className={`p-con-btn ${darkMode ? "dark-mode" : ""}`}
              onClick={handleConfirmPayment}
              disabled={loading || !!duplicateError || totalPaid < totalAmount}
            >
              {loading ? "Processing..." : "Confirm Payment"}
            </button>
            <button
              className={`p-print-btn ${darkMode ? "dark-mode" : ""}`}
              onClick={generateCustomBill}
              disabled={totalPaid < totalAmount || loading}
            >
              <img src={paymenticon} alt="bill" width="50" height="50" />
            </button>
          </div>
        </div>

        <div className="right-section">
          {/* 🔒 Disable Cancel during loading */}
          <button 
            onClick={() => !loading && onClose(null)} 
            className="p-cancel-btn"
            disabled={loading}
          >
            Cancel
          </button>
          
          {/* 🔒 Disable dialpad during loading */}
          <div className="p-dialpad" style={{ opacity: loading ? 0.5 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, ".", 0].map((num) => (
              <button key={num} onClick={() => handleDialpadInput(num.toString())}>
                {num}
              </button>
            ))}
            <button className="p-del-btn" onClick={handleDialpadDelete}>⌫</button>
          </div>
        </div>
      </div>

      {/* ✅ Add CSS for loading overlay */}
      <style jsx>{`
        .payment-loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          border-radius: 12px;
        }
        .payment-loading-spinner {
          background: white;
          padding: 20px 30px;
          border-radius: 10px;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 15px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PaymentPaid;