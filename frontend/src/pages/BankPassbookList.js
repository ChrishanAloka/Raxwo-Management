import React, { useState, useEffect } from "react";
import "../styles/BankPassbookList.css";
import BankPassbookEdit from "./BankPassbookEdit";
import BankPassbookAdd from "./BankPassbookAdd";
import editicon from "../icon/edit.png";
import deleteicon from "../icon/delete.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faChartSimple, faFile, faFilePdf, faFileExcel, faSearch, faTimes } from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Highcharts from "highcharts";
import "highcharts/highcharts-3d";
import HighchartsReact from "highcharts-react-official";

const API_URL = "https://raxwo-management.onrender.com/api/bank-passbook";
const PRODUCTS_REPAIR_API_URL = "https://raxwo-management.onrender.com/api/productsRepair"; // Adjust if needed
const PAYMENTS_API_URL = 'https://raxwo-management.onrender.com/api/payments/forsummery';
const EXTRA_INCOME_API_URL = 'https://raxwo-management.onrender.com/api/extra-income';
const SALARIES_API_URL = 'https://raxwo-management.onrender.com/api/salaries';
const MAINTENANCE_API_URL = 'https://raxwo-management.onrender.com/api/maintenance';
const SUPPLIERS_API_URL = 'https://raxwo-management.onrender.com/api/suppliers';

// Allowed bank-based payment methods
const BANK_PAYMENT_METHODS = ["Bank-Transfer", "Card", "Bank-Check"];


const BankPassbookList = ({ darkMode }) => {
  const [transactions, setTransactions] = useState([]);
  const [repairIncomes, setRepairIncomes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [paymentIncomes, setPaymentIncomes] = useState([]); 
  const [extraIncomes, setExtraIncomes] = useState([]); // ← Add this
  const [salaryAdvances, setSalaryAdvances] = useState([]);
  const [maintenanceExpenses, setMaintenanceExpenses] = useState([]);
  const [supplierPayments, setSupplierPayments] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const token = localStorage.getItem('token');

  const isWithinDateRange = (dateStr) => {
    if (!startDate && !endDate) return true;
    const transactionDate = new Date(dateStr);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && transactionDate < start) return false;
    if (end && transactionDate > end) return false;
    return true;
  };
  // Fetch bank transactions
  const fetchBankTransactions = async () => {
    try {
      const response = await fetch(API_URL, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load bank transactions");
      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      return [];
    }
  };

// Fetch supplier payments (only Bank-Transfer from paymentHistory)
const fetchSupplierPayments = async () => {
  try {
    const response = await fetch(SUPPLIERS_API_URL, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to load suppliers");
    const suppliers = await response.json();

    const paymentEntries = [];

    suppliers.forEach(supplier => {
      if (!Array.isArray(supplier.paymentHistory)) return;

      supplier.paymentHistory
        .filter(payment =>
          payment.currentPayment &&
          !isNaN(parseFloat(payment.currentPayment)) &&
          parseFloat(payment.currentPayment) > 0 &&
          BANK_PAYMENT_METHODS.includes(payment.paymentMethod)
        )
        .forEach(payment => {
          const createdAt = new Date(payment.date);
          const date = createdAt.toISOString().split("T")[0];
          const time = createdAt.toTimeString().slice(0, 5); // HH:MM

          paymentEntries.push({
            _id: `supplier-${payment._id || Date.now() + Math.random()}`, // fallback ID
            date,
            time,
            description: `Supplier: ${supplier.supplierName || 'N/A'} - ${supplier.businessName || 'N/A'}`,
            type: "Debit",
            amount: parseFloat(payment.currentPayment), // Convert string → number
            paymentMethod: "Bank-Transfer",
            source: "supplier",
          });
        });
    });

    return paymentEntries;
  } catch (err) {
    console.warn("Could not fetch supplier payments:", err.message);
    return [];
  }
};

// Fetch maintenance expenses (only Bank-Transfer)
const fetchMaintenanceExpenses = async () => {
  try {
    const response = await fetch(MAINTENANCE_API_URL, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to load maintenance records");
    const records = await response.json();

    const expenseEntries = records
      .filter(record =>  // Only bank transfers
        record.price > 0 &&
        BANK_PAYMENT_METHODS.includes(record.paymentMethod)
      )
      .map(record => ({
        _id: `maintenance-${record._id}`,
        date: record.date,                           // Already in "YYYY-MM-DD"
        time: record.time,                           // "1:31:58 PM" – use as-is
        description: `Maintenance: ${record.serviceType || 'N/A'}`,
        type: "Debit",
        amount: record.price,
        paymentMethod: "Bank-Transfer",
        source: "maintenance", // Mark as maintenance expense
      }));

    return expenseEntries;
  } catch (err) {
    console.warn("Could not fetch maintenance expenses:", err.message);
    return [];
  }
};

  // Fetch salary advances (only bank transfers)
const fetchSalaryAdvances = async () => {
  try {
    const response = await fetch(SALARIES_API_URL, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to load salary advances");
    const salaries = await response.json();

    const advanceEntries = salaries
      .filter(salary =>
        // salary.paymentMethod === "Bank-Transfer" &&  // Only bank transfers
        salary.advance > 0                           // Only if advance given
      )
      .map(salary => {
        const createdAt = new Date(salary.createdAt);
        const date = createdAt.toISOString().split("T")[0];
        const time = createdAt.toTimeString().slice(0, 5); // HH:MM

        return {
          _id: `salary-${salary._id}`,
          date,
          time,
          description: `${salary.remarks} ${salary.employeeName || 'N/A'}`,
          type: "Debit",
          amount: salary.advance,
          paymentMethod: "Bank-Transfer",
          source: "salary", // Mark as salary advance
        };
      });

    return advanceEntries;
  } catch (err) {
    console.warn("Could not fetch salary advances:", err.message);
    return [];
  }
};

  // Fetch extra income (only bank-based payment methods)
  const fetchExtraIncome = async () => {
    try {
      const response = await fetch(EXTRA_INCOME_API_URL, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load extra income");
      const incomes = await response.json();

      const incomeEntries = [];
      incomes.forEach(income => {
        // Handle split payments (paymentBreakdown)
        const breakdowns = [];
        // Handle split payments (paymentMethods)
        if (Array.isArray(income.paymentBreakdown) && income.paymentBreakdown.length > 0) {
          income.paymentBreakdown.forEach(pm => {
            if (pm.method && pm.amount > 0) {
              breakdowns.push({ method: pm.method, amount: pm.amount });
            }
          });
        }

        else if (income.paymentMethod && income.totalAmount > 0) {
          breakdowns.push({ method: income.paymentMethod, amount: income.totalAmount });
        }

        breakdowns.forEach((pb, idx) => {
          if (
            BANK_PAYMENT_METHODS.includes(pb.method) 
            // && pb.amount > 0 && income.status !== "Cancelled"
          ) {
            const createdAt = new Date(income.date || income.createdAt);
            const date = createdAt.toISOString().split("T")[0];
            const time = createdAt.toTimeString().slice(0, 5);

            incomeEntries.push({
              _id: `extra-${income._id}-${idx}`,
              date,
              time,
              description: `Extra: ${income.incomeType || 'N/A'}`,
              type: "Credit",
              amount: pb.amount,
              paymentMethod: pb.method,
              source: "extra",
            });
          }
        });
      });

      return incomeEntries;
    } catch (err) {
      console.warn("Could not fetch extra income:", err.message);
      return [];
    }
  };

  // Fetch payment-based incomes (bank methods only)
  const fetchPaymentIncomes = async () => {
    try {
      const response = await fetch(PAYMENTS_API_URL, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load payments");
      const payments = await response.json();

      const incomeEntries = [];
      payments.forEach(payment => {

        const methods = [];
        // Handle split payments (paymentMethods)
        if (Array.isArray(payment.paymentMethods) && payment.paymentMethods.length > 0) {
          payment.paymentMethods.forEach(pm => {
            if (pm.method && pm.amount > 0) {
              methods.push({ method: pm.method, amount: pm.amount });
            }
          });
        }

        else if (payment.paymentMethod && payment.totalAmount > 0) {
          methods.push({ method: payment.paymentMethod, amount: payment.totalAmount });
        }

        methods.forEach((pm, idx) => {
          if (
            BANK_PAYMENT_METHODS.includes(pm.method) &&
            pm.amount > 0 &&
            payment.status !== "Refund"
          ) {
            const createdAt = new Date(payment.date || payment.createdAt);
            const date = createdAt.toISOString().split("T")[0];
            const time = createdAt.toTimeString().slice(0, 5);

            incomeEntries.push({
              _id: `payment-${payment._id}-${idx}`,
              date,
              time,
              description: `Payment - ${payment.invoiceNumber || 'N/A'}`,
              type: "Credit",
              amount: pm.amount,
              paymentMethod: pm.method,
              source: "payment",
            });
          }
        });
      });

      return incomeEntries;
    } catch (err) {
      console.warn("Could not fetch payment incomes:", err.message);
      return [];
    }
  };

  const fetchRepairIncomes = async () => {
    try {
      const response = await fetch(PRODUCTS_REPAIR_API_URL, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load repair jobs");
      const jobs = await response.json();

      const incomeEntries = [];
      jobs.forEach(job => {
        // Skip if not completed/returned
        // if (!["Completed", "Returned"].includes(job.repairStatus)) return;
        const breakdowns  = [];
        // Handle split payments (paymentMethods)
        if (Array.isArray(job.paymentBreakdown) && job.paymentBreakdown.length > 0) {
          job.paymentBreakdown.forEach(pm => {
            if (pm.method && pm.amount > 0) {
              breakdowns.push({ method: pm.method, amount: pm.amount });
            }
          });
        }

        else if (job.paymentMethod && job.totalAmount > 0) {
          breakdowns.push({ method: job.paymentMethod, amount: job.totalAmount });
        }

        breakdowns.forEach((pb, idx) => {
          if (
            BANK_PAYMENT_METHODS.includes(pb.method) &&
            pb.amount > 0
          ) {
            const createdAt = new Date(job.completedAt || job.updatedAt);
            const date = createdAt.toISOString().split("T")[0];
            const time = createdAt.toTimeString().slice(0, 5);

            // Calculate total amount if needed (for legacy)
            const totalAmount = pb.amount || (
              (job.totalRepairCost || 0) +
              (job.totalAdditionalServicesAmount || 0) +
              (job.checkingCharge || 0) -
              (job.totalDiscountAmount || 0)
            );

            incomeEntries.push({
              _id: `repair-${job._id}-${idx}`,
              date,
              time,
              description: `Repair: ${job.customerName || 'N/A'} - ${job.repairInvoice || 'N/A'}`,
              type: "Credit",
              amount: pb.amount || totalAmount,
              paymentMethod: pb.method,
              source: "repair",
            });
          }
        });
      });

      return incomeEntries;
    } catch (err) {
      console.warn("Could not fetch repair incomes:", err.message);
      return [];
    }
  };

  useEffect(() => {
  const loadData = async () => {
    if (!token) {
      setError('Authentication required. Please log in.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [
      bankTxs,
      repairTxs,
      paymentTxs,
      extraTxs,
      salaryTxs,
      maintenanceTxs,
      supplierTxs
    ] = await Promise.all([
      fetchBankTransactions(),
      fetchRepairIncomes(),
      fetchPaymentIncomes(),
      fetchExtraIncome(),
      fetchSalaryAdvances(),
      fetchMaintenanceExpenses(),
      fetchSupplierPayments() // ← Add here
    ]);

    setTransactions(bankTxs);
    setRepairIncomes(repairTxs);
    setPaymentIncomes(paymentTxs);
    setExtraIncomes(extraTxs);
    setSalaryAdvances(salaryTxs);
    setMaintenanceExpenses(maintenanceTxs);
    setSupplierPayments(supplierTxs); // Save to state
    setLoading(false);
  };

  loadData();
}, []);

  // Combine and sort all transactions
  const allTransactions = [
    ...transactions, 
    ...repairIncomes,
    ...paymentIncomes,
    ...extraIncomes,
    ...salaryAdvances,
    ...maintenanceExpenses,
    ...supplierPayments
  ].sort((a, b) => new Date(a.date) - new Date(b.date) || a.time.localeCompare(b.time));

  // Filtered transactions
  const normalize = (str) => (str || "").toLowerCase().replace(/\s+/g, "");
  const filteredTransactions = allTransactions.filter((t) => {
    // Date range filter
    if (!isWithinDateRange(t.date)) return false;

    // Search filter
    const normalizedQuery = normalize(searchQuery);
    return (
      normalize(t.date).includes(normalizedQuery) ||
      normalize(t.time).includes(normalizedQuery) ||
      normalize(t.description).includes(normalizedQuery) ||
      normalize(t.type).includes(normalizedQuery)
    );
  });

  // Delete transaction (only real ones, not repair incomes)
  const handleDelete = async (id) => {
    if (!id.startsWith("repair-")) {
      if (window.confirm("Are you sure you want to delete this transaction?")) {
        try {
          await fetch(`${API_URL}/${id}`, { method: "DELETE" } , {headers: {
            'Authorization': `Bearer ${token}`
          }} );                         
          setTransactions(transactions.filter(t => t._id !== id));
          setShowActionMenu(null);
        } catch (err) {
          setError("Failed to delete transaction");
        }
      }
    } else {
      alert("Repair income entries cannot be deleted manually.");
    }
  };

  // Edit transaction (only real ones)
  const handleEdit = (transaction) => {
    if (!transaction.source) {
      setEditingTransaction(transaction);
      setShowActionMenu(null);
    }
  };

  // Calculate summary
  const calculateSummary = () => {
    let totalCredit = 0;
    let totalDebit = 0;
    let balance = 0;

    const monthlyData = {};

    allTransactions.forEach((t) => {
      if (!isWithinDateRange(t.date)) return;

      const monthYear = new Date(t.date).toLocaleString("default", { month: "long", year: "numeric" });
      if (!monthlyData[monthYear]) monthlyData[monthYear] = { credit: 0, debit: 0 };

      if (t.type === "Credit") {
        totalCredit += t.amount;
        balance += t.amount;
        monthlyData[monthYear].credit += t.amount;
      } else {
        totalDebit += t.amount;
        balance -= t.amount;
        monthlyData[monthYear].debit += t.amount;
      }
    });

    const months = Object.keys(monthlyData);
    const credits = months.map(m => monthlyData[m].credit);
    const debits = months.map(m => monthlyData[m].debit);

    return { totalCredit, totalDebit, balance, months, credits, debits };
  };

  const { totalCredit, totalDebit, balance, months, credits, debits } = calculateSummary();

  // Chart options
  const chartOptions = {
    chart: {
      type: "column",
      options3d: { enabled: true, alpha: 10, beta: 0, depth: 50 },
      backgroundColor: darkMode ? "rgba(251, 251, 251, 0.1)" : "whitesmoke",
    },
    title: {
      text: "Monthly Credit vs Debit",
      style: { color: darkMode ? "#fff" : "#000", fontSize: "18px" },
    },
    xAxis: {
      categories: months,
      labels: { style: { color: darkMode ? "#fff" : "#000" } },
      lineColor: darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
    },
    yAxis: {
      title: { text: null },
      labels: {
        style: { color: darkMode ? "#fff" : "#000" },
        formatter: function () {
          return `Rs. ${Highcharts.numberFormat(this.value, 0)}`;
        },
      },
      gridLineColor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    },
    plotOptions: {
      column: {
        depth: 25,
        pointPadding: 0.1,
        groupPadding: 0.1,
        dataLabels: { enabled: true, format: "Rs. {y}", style: { color: darkMode ? "#fff" : "#000" } },
      },
    },
    series: [
      { name: "Credit", data: credits, color: "#28a745" },
      { name: "Debit", data: debits, color: "#dc3545" }
    ],
    legend: { enabled: true, itemStyle: { color: darkMode ? "#fff" : "#000" } },
    credits: { enabled: false },
    tooltip: {
      backgroundColor: darkMode ? "#1f2937" : "#fff",
      style: { color: darkMode ? "#fff" : "#000" },
      formatter: function () {
        return `<b>${this.series.name}</b>: Rs. ${Highcharts.numberFormat(this.y, 2)}`;
      },
    },
  };

  // Export to Excel
  const generateExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredTransactions.map((t, idx) => ({
        No: idx + 1,
        Date: t.date,
        Time: t.time,
        Description: t.description,
        "Payment Method": t.source ? t.paymentMethod : "Manual",
        Type: t.type,
        Amount: `Rs. ${t.amount.toFixed(2)}`,
        Source: t.source ? "Repair Income" : "Manual",
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bank Passbook");
    XLSX.writeFile(workbook, "Bank_Passbook_With_Income.xlsx");
    setShowReportOptions(false);
  };

  // Export to PDF
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text("Bank Passbook with Repair Incomes", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [["No", "Date", "Time", "Description", "Type", "Amount", "Source"]],
      body: filteredTransactions.map((t, idx) => [
        idx + 1,
        t.date,
        t.time,
        t.description,
        t.source ? t.paymentMethod : "Manual",
        t.type,
        `Rs. ${t.amount.toFixed(2)}`,
        t.source ? "Repair" : "Manual",
      ]),
    });
    doc.save("Bank_Passbook_With_Income.pdf");
    setShowReportOptions(false);
  };

  const handleClearSearch = () => setSearchQuery("");

  return (
    <div className={`bank-passbook-container ${darkMode ? "dark" : ""}`}>
      <div className="header-section">
        <h2 className={`bank-passbook-title ${darkMode ? "dark" : ""}`}>🏦 Bank Passbook</h2>
      </div>

      <div className="search-action-container">
        <div className={`search-bar-container ${darkMode ? "dark" : ""}`}>
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="       Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`search-bar ${darkMode ? "dark" : ""}`}
          />
          {searchQuery && (
            <button onClick={handleClearSearch} className="search-clear-btn">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>

        {/* Date Range Filters */}
        <div className="date-range-filters">
          <span className="date-separator">From</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={`date-input ${darkMode ? "dark" : ""}`}
            placeholder="Start Date"
          />
          <span className="date-separator">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={`date-input ${darkMode ? "dark" : ""}`}
            placeholder="End Date"
          />
        </div>

        <div className="filter-action-row">
          <button onClick={() => setShowSummaryModal(true)} className="btn-summary">
            <FontAwesomeIcon icon={faChartSimple} /> Summary
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <FontAwesomeIcon icon={faPlus} /> Add Entry
          </button>
          <button onClick={() => setShowReportOptions(true)} className="btn-report">
            <FontAwesomeIcon icon={faFile} /> Reports
          </button>
        </div>
      </div>

      {/* Report Options Modal */}
      {showReportOptions && (
        <div className="report-modal-overlay" onClick={() => setShowReportOptions(false)}>
          <div className={`report-modal-content ${darkMode ? "dark" : ""}`} onClick={(e) => e.stopPropagation()}>
            <div className="report-modal-header">
              <h3 className="report-modal-title">Export Report</h3>
              <button className="report-modal-close-icon" onClick={() => setShowReportOptions(false)}>
                ✕
              </button>
            </div>
            <div className="report-modal-buttons">
              <button onClick={generateExcel} className="btn-report-e" style={{ background: "green" }}>
                <FontAwesomeIcon icon={faFileExcel} /> Excel
              </button>
              <button onClick={generatePDF} className="btn-report-p" style={{ background: "red" }}>
                <FontAwesomeIcon icon={faFilePdf} /> PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="error-message">{error}</p>}

      {loading ? (
        <p className="loading">Loading transactions...</p>
      ) : filteredTransactions.length === 0 ? (
        <p className="no-entries">No transactions found.</p>
      ) : (
        <table className={`transaction-table ${darkMode ? "dark" : ""}`}>
          <thead>
            <tr>
              <th>No.</th>
              <th>Date</th>
              <th>Time</th>
              <th>Description</th>
              <th>Payment Method</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((t, idx) => (
              <tr key={t._id} style={t.source ? { fontStyle: 'italic', opacity: 0.95 } : {}}>
                <td>{idx + 1}</td>
                <td>{t.date}</td>
                <td>{t.time}</td>
                <td>{t.description}</td>
                <td>
                  {t.source ? (
                    <span className="badge" style={{ backgroundColor: '#3182ce', color: 'white' }}>
                      {t.paymentMethod}
                    </span>
                  ) : (
                    'Manual'
                  )}
                </td>
                <td>
                  <span className={`badge ${t.type === "Credit" ? "credit" : "debit"}`} style={t.type === "Debit" ? { backgroundColor: '#e74c3c', color: 'white' } : {} }>
                    {t.type}
                    {t.source && " ★"}
                  </span>
                </td>
                <td>Rs. {t.amount.toFixed(2)}</td>
                <td>
                  <div className="action-container">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setShowActionMenu(showActionMenu === t._id ? null : t._id);
                      }}
                      className="action-dot-btn"
                      disabled={t.source}
                      style={t.source ? { color: '#aaa', cursor: 'not-allowed' } : {}}
                    >
                      ⋮
                    </button>
                    {showActionMenu === t._id && !t.source && (
                      <>
                        <div className="action-menu-overlay" onClick={() => setShowActionMenu(null)} />
                        <div className="action-menu">
                          <button onClick={() => handleEdit(t)} className="p-edit-btn">
                            <div className="action-btn-content">
                              <img src={editicon} alt="edit" width="30" height="30" className="p-edit-btn-icon" />
                              <span>Edit</span>
                            </div>
                          </button>
                          <button onClick={() => handleDelete(t._id)} className="p-delete-btn">
                            <div className="action-btn-content">
                              <img src={deleteicon} alt="delete" width="30" height="30" className="p-delete-btn-icon" />
                              <span>Delete</span>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className={`modal-overlay ${darkMode ? "dark" : ""}`} onClick={() => setShowAddModal(false)}>
          <div className={`modal-container ${darkMode ? "dark" : ""}`} onClick={(e) => e.stopPropagation()}>
            <BankPassbookAdd onClose={() => {setShowAddModal(false); fetchPaymentIncomes();} } onUpdate={fetchBankTransactions} darkMode={darkMode} />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTransaction && (
        <BankPassbookEdit
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onUpdate={fetchBankTransactions}
          darkMode={darkMode}
        />
      )}

      {/* Summary Modal */}
      {showSummaryModal && (
        <div className="summary-modal-overlay" onClick={() => setShowSummaryModal(false)}>
          <div className={`summary-modal-content ${darkMode ? "dark" : ""}`} onClick={(e) => e.stopPropagation()}>
            <div className="summary-modal-header">
              <h3 className="summary-modal-title">Financial Summary</h3>
              <button className="summary-modal-close-icon" onClick={() => setShowSummaryModal(false)}>
                ✕
              </button>
            </div>
            <div className="summary-cards">
              <div className="summary-card total-credit">
                <div className="icon">📈</div>
                <div>
                  <h4>Total Credit</h4>
                  <p>Rs. {totalCredit.toFixed(2)}</p>
                </div>
              </div>
              <div className="summary-card total-debit">
                <div className="icon">📉</div>
                <div>
                  <h4>Total Debit</h4>
                  <p>Rs. {totalDebit.toFixed(2)}</p>
                </div>
              </div>
              <div className="summary-card balance">
                <div className="icon">💰</div>
                <div>
                  <h4>Current Balance</h4>
                  <p>Rs. {balance.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="chart-container">
              <HighchartsReact highcharts={Highcharts} options={chartOptions} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankPassbookList;