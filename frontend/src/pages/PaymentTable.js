import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFile, faFilePdf, faFileExcel, faSearch, faTimes, faChartSimple } from '@fortawesome/free-solid-svg-icons';
import jsPDF from 'jspdf';
import html2canvas from "html2canvas";
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Highcharts from "highcharts";
import "highcharts/highcharts-3d";
import HighchartsReact from "highcharts-react-official";
import '../styles/PaymentTable.css';
import deleteIcon from "../icon/delete.png";
import editicon from '../icon/edit.png';
import EditPayment from '../EditPayment';
import ReturnPayment from '../ReturnPayment';
import { useMemo } from 'react'; // Make sure this is imported

const API_URL = 'https://raxwo-management.onrender.com/api/payments';
const PAYMENT_WITH_CATEGORY_API_URL = 'https://raxwo-management.onrender.com/api/payments/with-itemcodes';

const PaymentTable = ({ darkMode }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPaymenteditModal, setShowPaymenteditModal] = useState(false);
  const [showPaymentreturnModal, setShowPaymentreturnModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [showPaymentFilter, setShowPaymentFilter] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(null); // Track which header shows filter

  const userRole = localStorage.getItem('role');

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      if (showPaymentFilter) setShowPaymentFilter(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showPaymentFilter]);

  const fetchPayments = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required. Please log in.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(PAYMENT_WITH_CATEGORY_API_URL, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json(); // ← Wait for JSON parsing
        if (errorData.message === "User is not an admin") {
          throw new Error("User is not an admin");
        } 
        // throw new Error(`Server error: ${response.statusText}`);
        throw new Error(`Authentication Expired Please Log in`);
      }
      const data = await response.json();
      console.log("data", data);
      setPayments(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleDelete = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required. Please log in.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${paymentId}`, {
        method: 'DELETE',
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete payment: ${response.statusText}`);
      }

      setPayments(payments.filter(payment => payment._id !== paymentId));
      setShowActionMenu(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (payment) => {
    setSelectedPayment(payment);
    setShowPaymenteditModal(true);
  };

  const handleReturn = (payment) => {
    setSelectedPayment(payment);
    setShowPaymentreturnModal(true);
  };

  const generatePaymentBill = (paymentData) => {
    const shopName = localStorage.getItem('shopName') || 'GENIUS';
    const shopAddress = localStorage.getItem('shopAddress') || '#422 Thimbirigasyaya Road, Colombo 05';
    const shopPhone = localStorage.getItem('shopPhone') || '0770235330';
    const shopEmail = localStorage.getItem('shopEmail') || 'igentuslk@gmail.com';

    const customerName = paymentData.customerName || "SAHAN";
    const contactNumber = paymentData.contactNumber || "JB76666666";
    const address = paymentData.address || "-";
    const items = paymentData.items || [];
    const totalAmount = paymentData.totalAmount || 0;
    const paymentMethod = paymentData.paymentMethod || "-";

    const invoiceNumber = paymentData.invoiceNumber || 'INV-0001';
    const invoiceNo = invoiceNumber.split('-')[1];

    const subtotal = items.reduce((sum, item) => sum + (item.totalAmount * item.quantity), 0);
    const totalDiscount = items.reduce((sum, item) => sum + (item.discount || 0), 0);

    const receiptHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Payment Receipt - ${invoiceNumber}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        <style>
          @page {
            size: 80mm 140mm;
            margin: 5mm;
          }
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
          .header {
            text-align: center;
            margin-bottom: 5px;
          }
          .shop-name {
            font-size: 14px;
            font-weight: bold;
          }
          .tagline {
            font-size: 9px;
          }
          .contact {
            font-size: 9px;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 5px 0;
          }
          .invoice {
            font-weight: bold;
            text-align: center;
            margin: 5px 0;
          }
          .details {
            margin: 5px 0;
            line-height: 1.4;
          }
          .items {
            margin: 5px 0;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
          }
          .item-name {
            width: 40%;
          }
          .item-qty {
            width: 10%;
          }
          .item-amt {
            width: 30%;
            text-align: right;
          }
          .total {
            margin-top: 5px;
            font-weight: bold;
            text-align: right;
          }
          .footer {
            text-align: center;
            margin-top: 10px;
            font-size: 8px;
          }
          .print-btn, .download-btn {
            display: block;
            width: 80px;
            margin: 10px auto;
            padding: 8px;
            background-color: #007bff;
            color: white;
            border: none;
            cursor: pointer;
            text-align: center;
            border-radius: 4px;
            font-size: 12px;
          }
          .download-btn {
            background-color: #28a745;
          }
          @media print {
            .print-btn, .download-btn { display: none; }
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
              <span class="item-name">${item.itemName.length > 12 ? item.itemName.substring(0) : item.itemName}</span>
              <span class="item-amt">Rs. ${(item.price * item.quantity).toFixed(2)}</span>
            </div>
            <!-- Category line -->
            <div class="item-row" style="font-size: 8px; color: #666;">
              <span></span>
              <span class="item-name">Category: ${item.category || '—'}</span>
              <span></span>
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

        <div class="total">
          TOTAL: Rs. ${totalAmount.toFixed(2)}
        </div>

        <div class="divider"></div>

        <div class="footer">
          Thank you for your business!<br>
          Software by Exyplan Software<br>
          Contact: 074 357 3323
        </div>

        <button class="print-btn" onclick="window.print()">Print</button>
        <button class="download-btn" onclick="downloadPDF()">Download PDF</button>

        <script type="text/javascript">
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

    const win = window.open("", "_blank");
    win.document.write(receiptHTML);
    win.document.close();
  };

  const generateCustomBill = (paymentData) => {
    const shopName = localStorage.getItem('shopName') || 'Default Shop';
    const shopAddress = localStorage.getItem('shopAddress') || '123 Main St, City, Country';
    const shopPhone = localStorage.getItem('shopPhone') || '(123) 456-7890';
    const shopLogo = localStorage.getItem('shopLogo') || '';
    const currentDate = new Date(paymentData.date).toLocaleString();

    const customerName = paymentData.customerName || "N/A";
    const contactNumber = paymentData.contactNumber || "N/A";
    const address = paymentData.address || "N/A";
    const description = paymentData.description || "N/A";
    const paymentMethod = paymentData.paymentMethods || "Not Selected";
    const items = paymentData.items || [];
    const totalAmount = paymentData.totalAmount || 0;
    const paidAmount = paymentData.totalPaid || 0;
    const balance = paidAmount - totalAmount ;

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalDiscount = items.reduce((sum, item) => sum + (item.discount || 0), 0);

    const billHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>POS Bill - ${paymentData.invoiceNumber}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        <style>
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            body, .container {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 15mm;
              box-shadow: none;
              background: white;
            }
            .print-btn, .download-btn { display: none; }
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
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            background: white;
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
          .details, .totals {
            margin-bottom: 20px;
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
          .details-container {
            display: flex;
            justify-content: space-between;
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
          .print-btn, .download-btn {
            display: block;
            width: 120px;
            margin: 20px auto;
            padding: 10px;
            background-color: #007bff;
            color: white;
            border: none;
            cursor: pointer;
            text-align: center;
            border-radius: 4px;
            font-size: 16px;
          }
          .download-btn {
            background-color: #28a745;
          }
          @media print {
             .action-buttons {
                display: none !important;
              }
              body, .container {
                margin: 0;
                padding: 0;
                box-shadow: none;
                background: white;
              }
          }
            
        </style>
      </head>
      <body>
        <div class="action-buttons" style="display: flex; justify-content: center; gap: 15px; margin: 20px 0;">
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
                <p><strong>Invoice:</strong> ${paymentData.invoiceNumber}</p>
                <p>
                  <strong>Payment Method(s):</strong>
                  <ul style="margin: 5px 0; list-style-type: disc;">
                    ${
                      Array.isArray(paymentData.paymentMethods) && paymentData.paymentMethods.length > 0
                        ? paymentData.paymentMethods.map(pm => 
                            `<li>${pm.method}: Rs. ${Number(pm.amount || 0).toFixed(2)}</li>`
                          ).join('')
                        : `<li>${paymentData.paymentMethod || 'Not Selected'}: Rs. ${Number(paymentData.totalAmount || 0).toFixed(2)}</li>`
                    }
                  </ul>
                </p>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Discount</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                const itemName = item.itemName || 'Unknown Item';
                const quantity = item.quantity || 0;
                const price = item.price || 0;
                const discount = typeof item.discount === 'number' ? item.discount : 0;
                const total = (price * quantity - discount).toFixed(2);
                const category = item.category || '—';
                return `
                  <tr>
                    <td>${itemName}</td>
                    <td>${category}</td>
                    <td>${quantity}</td>
                    <td>Rs. ${price.toFixed(2)}</td>
                    <td>Rs. ${discount.toFixed(2)}</td>
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
                <p><strong>Paid Amount:</strong> Rs. ${paidAmount.toFixed(2)}</p>
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
            }).then(function(canvas) {
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
              pdf.save('FullBill_${paymentData.invoiceNumber}.pdf');
            });

          }
        </script>
      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    win.document.write(billHTML);
    win.document.close();
  };

  const calculateSummary = () => {
    const totalIncome = payments
      .filter(payment => payment.paymentMethod !== 'Refund')
      .reduce((sum, payment) => sum + payment.totalAmount, 0);
    const totalProfit = payments
      .filter(payment => payment.paymentMethod !== 'Refund')
      .reduce((sum, payment) => sum + (payment.totalAmount - (payment.discountApplied || 0)), 0);
    return { totalIncome, totalProfit };
  };

  const { totalIncome, totalProfit } = calculateSummary();

  const chartOptions = {
    chart: {
      type: "column",
      options3d: {
        enabled: true,
        alpha: 0,
        beta: 1,
        depth: 50,
        viewDistance: 15,
        frame: {
          bottom: { size: 1, color: darkMode ? "rgba(251, 251, 251, 0.1)" : "whitesmoke" },
          side: { size: 0 },
          back: { size: 0 },
        },
      },
      backgroundColor: darkMode ? "rgba(251, 251, 251, 0.1)" : "whitesmoke",
      borderWidth: 0,
    },
    title: {
      text: "Income vs Profit",
      style: { color: darkMode ? "#ffffff" : "#000000", fontFamily: "'Inter', sans-serif", fontSize: "18px" },
    },
    xAxis: {
      categories: ["Summary"],
      labels: {
        style: {
          color: darkMode ? "#ffffff" : "#000000",
          fontFamily: "'Inter', sans-serif",
          fontSize: "14px",
        },
      },
      lineColor: darkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(82, 82, 82, 0.2)",
    },
    yAxis: {
      title: { text: null },
      labels: {
        style: {
          color: darkMode ? "#ffffff" : "#000000",
          fontFamily: "'Inter', sans-serif",
          fontSize: "14px",
        },
        formatter: function () {
          return `Rs. ${Highcharts.numberFormat(this.value, 0)}`;
        },
      },
      gridLineColor: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
      lineColor: darkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(82, 82, 82, 0.2)",
      lineWidth: 1,
      offset: 0,
    },
    plotOptions: {
      column: {
        depth: 25,
        pointWidth: 30,
        groupPadding: 0.2,
        pointPadding: 0.05,
        colorByPoint: false,
        dataLabels: {
          enabled: true,
          format: "Rs. {y}",
          style: {
            color: darkMode ? "#ffffff" : "#000000",
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
            textOutline: "none",
          },
        },
      },
    },
    series: [
      {
        name: "Income",
        data: [totalIncome],
        color: "#1e90ff",
      },
      {
        name: "Profit",
        data: [totalProfit],
        color: "#ff4040",
      },
    ],
    legend: {
      align: "center",
      verticalAlign: "bottom",
      itemStyle: {
        color: darkMode ? "#ffffff" : "#000000",
        fontFamily: "'Inter', sans-serif",
        fontSize: "14px",
      },
    },
    credits: { enabled: false },
    tooltip: {
      backgroundColor: darkMode ? "rgba(15, 23, 42, 0.9)" : "rgba(245, 245, 245, 0.9)",
      style: {
        color: darkMode ? "#ffffff" : "#000000",
        fontFamily: "'Inter', sans-serif",
      },
      formatter: function () {
        return `<b>${this.series.name}</b>: Rs. ${Highcharts.numberFormat(this.y, 2)}`;
      },
    },
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text('Payment List', 90, 20);
    const tableColumn = [
      'Date',
      'Time',
      'Invoice No.',
      'Item Name',
      'Quantity',
      'Payment Method',
      'Cashier Name',
      'Cashier ID',
      'Total Amount',
      'Discount',
    ];
    const tableRows = sortedAndFilteredPayments.flatMap(payment =>
      payment.items.map(item => [
        new Date(payment.date).toLocaleDateString(),
        new Date(payment.date).toLocaleTimeString(),
        payment.invoiceNumber,
        item.itemName,
        item.quantity,
        payment.paymentMethod,
        payment.cashierName,
        payment.cashierId,
        `Rs. ${payment.totalAmount.toFixed(2)}`,
        `Rs. ${(payment.discountApplied || 0).toFixed(2)}`,
      ])
    );
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 30 });
    doc.save('Payment_List.pdf');
    setShowReportOptions(false);
  };

  const generateExcel = () => {
    const formattedPayments = sortedAndFilteredPayments.flatMap(payment =>
      payment.items.map(item => ({
        Date: new Date(payment.date).toLocaleDateString(),
        Time: new Date(payment.date).toLocaleTimeString(),
        'Invoice Number': payment.invoiceNumber,
        'Item Name': item.itemName,
        Quantity: item.quantity,
        'Payment Method': payment.paymentMethod,
        'Cashier Name': payment.cashierName,
        'Cashier ID': payment.cashierId,
        'Total Amount': `Rs. ${payment.totalAmount.toFixed(2)}`,
        Discount: `Rs. ${(payment.discountApplied || 0).toFixed(2)}`,
      }))
    );
    const worksheet = XLSX.utils.json_to_sheet(formattedPayments);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');
    XLSX.writeFile(workbook, 'Payment_List.xlsx');
    setShowReportOptions(false);
  };

  const handleSort = (key) => {
    setSortConfig((prevConfig) => {
      // If clicking same column, toggle direction
      const direction =
        prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc';
      return { key, direction };
    });
  };

  const normalize = str => (str || '').toLowerCase().trim().replace(/\s+/g, '');

  const paymentMethods = [...new Set(payments.map(p => p.paymentMethod).filter(Boolean))];

  // Fuzzy substring match: tolerate minor typos like "ipone" → "iphone"
  function fuzzyIncludes(haystack, needle) {
    // Remove non-alphanumeric and split needle into chars
    const cleanHaystack = Array.from(haystack);
    const cleanNeedle = Array.from(needle);

    // console.log("Search query", cleanHaystack, cleanNeedle);

    let j = 0; // pointer in haystack
    for (let i = 0; i < cleanNeedle.length; i++) {
      const char = cleanNeedle[i];
      let found = false;
      while (j < cleanHaystack.length) {
        if (cleanHaystack[j] === char) {
          found = true;
          j++;
          break;
        }
        j++;
      }
      if (!found) return false;
    }
    return true;
  }

  const sortedAndFilteredPayments = useMemo(() => {

    let result = payments;

    if (searchQuery.trim() !== '') {
    // const normalizedQuery = normalize(searchQuery);

    const normalizedQuery = searchQuery
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '');

    result = payments.filter(payment => {
      // Combine all searchable fields properly
      const invoice = normalize(payment.invoiceNumber || '');
      const customerName = normalize(payment.customerName || '');
      const contactNumber = normalize(payment.contactNumber || '');
      const cashierName = normalize(payment.cashierName || '');
      const cashierId = normalize(payment.cashierId || '');
      const paymentMethod = normalize(payment.paymentMethod || '');
      const dateStr = normalize(new Date(payment.date).toLocaleDateString());
      const timeStr = normalize(new Date(payment.date).toLocaleTimeString());

      // ✅ Correctly extract and join all item names
      const itemNames = payment.items
        .map(item => normalize(item.itemName || ''))
        .join(' ');

      const fullText = (invoice + customerName + contactNumber + cashierName + cashierId + paymentMethod + dateStr + timeStr + itemNames)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '');

      const search1 = fullText.includes(normalizedQuery);
      const search2 = fuzzyIncludes(fullText, normalizedQuery);

      if (search1.length === 0){
        return search2;
      }
      return search1;
      // Use fuzzy or simple substring match
       
    });
  }

    // Apply payment method filter
    if (paymentMethodFilter) {
      result = result.filter(payment => payment.paymentMethod === paymentMethodFilter);
    }

    // Apply sorting if a column is selected
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let valueA = '';
        let valueB = '';

        switch (sortConfig.key) {
          case 'date':
            valueA = new Date(a.date);
            valueB = new Date(b.date);
            break;

          case 'invoiceNumber':
            valueA = a.invoiceNumber || '';
            valueB = b.invoiceNumber || '';
            break;

          case 'itemName':
            valueA = a.items.map(item => item.itemName).join(' ').toLowerCase();
            valueB = b.items.map(item => item.itemName).join(' ').toLowerCase();
            break;

          case 'paymentMethod':
            valueA = a.paymentMethod || '';
            valueB = b.paymentMethod || '';
            break;

          case 'cashierName':
            valueA = a.cashierName || '';
            valueB = b.cashierName || '';
            break;

          case 'cashierId':
            valueA = a.cashierId || '';
            valueB = b.cashierId || '';
            break;

          case 'discount':
            valueA = a.discountApplied || 0;
            valueB = b.discountApplied || 0;
            break;

          case 'totalAmount':
            valueA = a.totalAmount || 0;
            valueB = b.totalAmount || 0;
            break;

          default:
            return 0;
        }

        // Handle numeric comparison
        if (typeof valueA === 'number') {
          return sortConfig.direction === 'asc' ? valueA - valueB : valueB - valueA;
        }

        // Handle date comparison
        if (valueA instanceof Date && valueB instanceof Date) {
          return sortConfig.direction === 'asc' ? valueA - valueB : valueB - valueA;
        }

        // String comparison
        valueA = String(valueA).toLowerCase();
        valueB = String(valueB).toLowerCase();
        if (valueA < valueB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [payments, searchQuery, paymentMethodFilter, sortConfig]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className={`product-repair-list-container ${darkMode ? "dark" : ""}`}>
      
      <div className="header-section">
        

        <h2 className={`product-repair-list-title ${darkMode ? "dark" : ""}`}>
        Payment Transactions
        </h2>
      </div>
      <div className="search-action-container">
        <div className={`search-bar-container ${darkMode ? 'dark' : ''}`}>
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="       Search Payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`product-list-search-bar ${darkMode ? 'dark' : ''}`}
          />
          {searchQuery && (
            <button onClick={handleClearSearch} className="search-clear-btn">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>
        <div className='filter-action-row'>
        {userRole === 'admin' && (
          <button onClick={() => setShowModal(true)} className="btn-summary">
            <FontAwesomeIcon icon={faChartSimple} /> Summary
          </button>
        )}
        <button onClick={() => setShowReportOptions(true)} className="btn-report">
          <FontAwesomeIcon icon={faFile} /> Reports
        </button>
        </div>
      </div>
      {showReportOptions && (
        <div className="report-modal-overlay" onClick={() => setShowReportOptions(false)}>
          <div className={`report-modal-content ${darkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="report-modal-header">
              <h3 className="report-modal-title">Select Report Type</h3>
              <button
                onClick={() => setShowReportOptions(false)}
                className="report-modal-close-icon"
              >
                ✕
              </button>
            </div>
            <div className="report-modal-buttons">
              <button
                onClick={generateExcel}
                className="btn-report-e"
                style={{ background: 'green' }}
              >
                <FontAwesomeIcon icon={faFileExcel} className="report-btn-icon" /> Excel
              </button>
              <button
                onClick={generatePDF}
                className="btn-report-p"
                style={{ background: 'red' }}
              >
                <FontAwesomeIcon icon={faFilePdf} className="report-btn-icon" /> PDF
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <p className="error-message">{error}</p>}
      {loading ? (
        <p className="loading">Loading payments...</p>
      ) : sortedAndFilteredPayments.length === 0 ? (
        <p className="no-products">No payments found.</p>
      ) : (
        <table className={`product-table ${darkMode ? 'dark' : ''}`}>
          <colgroup>
            <col style={{ width: '8%' }} />   {/* Date */}
            <col style={{ width: '8%' }} />   {/* Time */}
            <col style={{ width: '10%' }} />  {/* Invoice No. */}
            <col style={{ width: '6%' }} />  {/* Contact No. */}
            <col style={{ width: '38%' }} />  {/* Item Name ← main focus */}
            <col style={{ width: '6%' }} />  {/* Payment Method ← treated as "category" */}
            <col style={{ width: '10%' }} />  {/* Cashier Name */}
            <col style={{ width: '8%' }} />   {/* Discount */}
            <col style={{ width: '10%' }} />  {/* Total Amount */}
            <col style={{ width: '6%' }} />   {/* Action (buttons) */}
          </colgroup>
          <thead>
            <tr>
              <th onClick={() => handleSort('date')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Date
                {sortConfig.key === 'date' && (
                  <span style={{ marginLeft: '6px' }}>
                    {sortConfig.direction === 'asc' ? ' 🔽' : ' 🔼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('date')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Time
                {sortConfig.key === 'date' && (
                  <span style={{ marginLeft: '6px' }}>
                    {sortConfig.direction === 'asc' ? ' 🔽' : ' 🔼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('invoiceNumber')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Invoice No.
                {sortConfig.key === 'invoiceNumber' && (
                  <span style={{ marginLeft: '6px' }}>
                    {sortConfig.direction === 'asc' ? ' 🔽' : ' 🔼'}
                  </span>
                )}
              </th>
              <th>
                Contact No
              </th>
              <th onClick={() => handleSort('itemName')} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'normal', wordBreak: 'break-word'  }}>
                Item Name
                {sortConfig.key === 'itemName' && (
                  <span style={{ marginLeft: '6px' }}>
                    {sortConfig.direction === 'asc' ? ' 🔽' : ' 🔼'}
                  </span>
                )}
              </th>
              {/* <th>Quantity</th> */}
              {/* <th onClick={() => handleSort('paymentMethod')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Payment Method
                {sortConfig.key === 'paymentMethod' && (
                  <span style={{ marginLeft: '6px' }}>
                    {sortConfig.direction === 'asc' ? ' 🔽' : ' 🔼'}
                  </span>
                )}
              </th> */}
              <th style={{ position: 'relative', padding: '12px', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    onClick={() => handleSort('paymentMethod')}
                    style={{ cursor: 'pointer', userSelect: 'none', flex: 1 }}
                  >
                    Payment Method {paymentMethodFilter === "" ? '' : '*'}
                    {sortConfig.key === 'paymentMethod' && (
                      <span style={{ marginLeft: '6px' }}>
                        {sortConfig.direction === 'asc' ? '🔽' : '🔼'}
                      </span>
                    )}
                  </span>

                  {/* Filter Button */}
                  {/* <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPaymentFilter(prev => !prev);
                    }}
                    
                    title="Filter by Payment Method"
                  >
                    {paymentMethodFilter === "" ? '☰' : '☰*'}
                  </span> */}
                </div>

                {/* Filter Dropdown */}
                {showPaymentFilter && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      width: '200px',
                      backgroundColor: darkMode ? '#2d3748' : '#ffffff',
                      border: `1px solid ${darkMode ? '#4a5568' : '#ddd'}`,
                      borderRadius: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 10,
                      maxHeight: '300px',
                      overflowY: 'auto',
                    }}
                  >
                    <div
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontWeight: paymentMethodFilter === '' ? 'bold' : 'normal',
                        backgroundColor: paymentMethodFilter === '' ? (darkMode ? '#4a5568' : '#e6f7ff') : 'transparent',
                        color: darkMode ? '#e2e8f0' : '#333',
                      }}
                      onClick={() => {
                        setPaymentMethodFilter('');
                        setShowPaymentFilter(false);
                        handleSort('date');
                      }}
                    >
                      All Methods
                    </div>
                    {paymentMethods.map((method) => (
                      <div
                        key={method}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontWeight: paymentMethodFilter === method ? 'bold' : 'normal',
                          backgroundColor: paymentMethodFilter === method ? (darkMode ? '#4a5568' : '#e6f7ff') : 'transparent',
                          color: darkMode ? '#e2e8f0' : '#333',
                        }}
                        onClick={() => {
                          setPaymentMethodFilter(method);
                          setShowPaymentFilter(false);
                          handleSort('date');
                        }}
                      >
                        {method}
                      </div>
                    ))}
                  </div>
                )}
              </th>
              <th onClick={() => handleSort('cashierName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Cashier Name
                {sortConfig.key === 'cashierName' && (
                  <span style={{ marginLeft: '6px' }}>
                    {sortConfig.direction === 'asc' ? ' 🔽' : ' 🔼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('discount')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Discount
                {sortConfig.key === 'discount' && (
                  <span style={{ marginLeft: '6px' }}>
                    {sortConfig.direction === 'asc' ? ' 🔽' : ' 🔼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('totalAmount')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Total Amount
                {sortConfig.key === 'totalAmount' && (
                  <span style={{ marginLeft: '6px' }}>
                    {sortConfig.direction === 'asc' ? ' 🔽' : ' 🔼'}
                  </span>
                )}
              </th>
              {/* <th onClick={() => handleSort('cashierId')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Cashier ID
                {sortConfig.key === 'cashierId' && (
                  <span style={{ marginLeft: '6px' }}>
                    {sortConfig.direction === 'asc' ? ' 🔽' : ' 🔼'}
                  </span>
                )}
              </th> */}
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredPayments.flatMap(payment => (
                <tr key={payment._id}>
                  <td>{new Date(payment.date).toLocaleDateString()}</td>
                  <td>{new Date(payment.date).toLocaleTimeString()}</td>
                  <td style={{whiteSpace: 'normal', wordBreak: 'break-word'}}>{payment.invoiceNumber} {payment.returnAlert === "returned" ? "(Ret)" : ""} {payment.customerName}</td>
                  <td>{payment.contactNumber}</td>
                  <td style={{whiteSpace: 'normal', wordBreak: 'break-word'}}>{/* Combine all item names */}
                    {payment.items.map((item, idx) => (
                      <div key={idx}>{item.itemName} ({item.category || '—'} / {item.quantity || '—'}),</div>
                    ))}
                  </td>
                  {/* <td> */}
                    {/* Combine quantities */}
                    {/* {payment.items.map(item => item.quantity).join(', ')} */}
                  {/* </td> */}
                  <td>
                    {Array.isArray(payment.paymentMethods) && payment.paymentMethods.length > 0
                      ? payment.paymentMethods.map(pm => `${pm.method}`).join(', ')
                      : payment.paymentMethod || '—'}
                  </td>
                  <td>{payment.cashierName}</td>
                  <td>Rs. {(payment.discountApplied || 0).toFixed(2)}</td>
                  <td>Rs. {payment.totalAmount.toFixed(2)}</td>
                  {/* <td>{payment.cashierId}</td> */}
                  <td>
                    <div className="action-container">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setShowActionMenu(showActionMenu === payment._id ? null : payment._id);
                        }}
                        className="action-dot-btn"
                      >
                        ⋮
                      </button>
                      {showActionMenu === payment._id && (
                        <>
                          <div className="action-menu-overlay" onClick={() => setShowActionMenu(null)} />
                          <div className="action-menu">
                            {userRole === 'admin' && (
                              <button onClick={() => handleEdit(payment)} className="p-edit-btn">
                                <div className="action-btn-content">
                                  <img src={editicon} alt="edit" width="30" height="30" className="p-edit-btn-icon" />
                                  <span>Edit</span>
                                </div>
                              </button>
                            )}
                            {userRole === 'admin' && (
                              <button onClick={() => handleDelete(payment._id)} className="p-delete-btn">
                                <div className="action-btn-content">
                                  <img src={deleteIcon} alt="delete" width="30" height="30" className="p-delete-btn-icon" />
                                  <span>Delete</span>
                                </div>
                              </button>
                            )}
                            {userRole === 'admin' && (
                              <button onClick={() => handleReturn(payment)} className="p-edit-btn">
                                <div className="action-btn-content">
                                  <span className="p-edit-btn-icon" style={{width:"30", height:"30"}}>↩️ </span>
                                  <span> Return</span>
                                </div>
                              </button>
                            )}
                              <button 
                              onClick={() => generatePaymentBill(payment)}
                              className="p-edit-btn"
                            >
                              <div className="action-btn-content">
                                <span>Print Receipt</span>
                              </div>
                            </button>
                            <button 
                              onClick={() => generateCustomBill(payment)}
                              className="p-edit-btn"
                            >
                              <div className="action-btn-content">
                                <span>Print Full Bill</span>
                              </div>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
      {showModal && (
        <div className="product-summary-modal-overlay">
          <div className={`product-summary-modal-content ${darkMode ? 'dark' : ''}`}>
            <div className="product-summary-modal-header">
              <h3 className="product-summary-modal-title">Payment Summary</h3>
              <button
                onClick={() => setShowModal(false)}
                className="product-summary-modal-close-icon"
              >
                ✕
              </button>
            </div>
            <div className="product-summary-content">
              <div className="summary-card">
                <div className="summary-icon income-icon">💰</div>
                <div className="summary-text">
                  <h4>Total Income</h4>
                  <p>Rs. {totalIncome.toFixed(2)}</p>
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-icon profit-icon">📈</div>
                <div className="summary-text">
                  <h4>Total Profit</h4>
                  <p>Rs. {totalProfit.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="product-summary-chart-container">
              <HighchartsReact highcharts={Highcharts} options={chartOptions} />
            </div>
          </div>
        </div>
      )}
      {showPaymenteditModal && selectedPayment && (
        <EditPayment
          payment={selectedPayment}
          closeModal={() => {
            setShowPaymenteditModal(false);
            fetchPayments()
          }}
          darkMode={darkMode}
        />
      )}
      {showPaymentreturnModal && selectedPayment && (
        <ReturnPayment
          payment={selectedPayment}
          closeModal={() => {
            setShowPaymentreturnModal(false);
            fetchPayments()
          }}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default PaymentTable;