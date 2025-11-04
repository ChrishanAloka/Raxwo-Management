import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faChartSimple, faFile, faFilePdf, faFileExcel, faSearch, faTimes } from "@fortawesome/free-solid-svg-icons";
import Highcharts from "highcharts";
import "highcharts/highcharts-3d";
import HighchartsReact from "highcharts-react-official";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import editicon from "../icon/edit.png";
import deleteicon from "../icon/delete.png";
import "../styles/ExtraIncome.css";
import Select from 'react-select/creatable';
import { components } from 'react-select';

const API_URL = "https://raxwo-management.onrender.com/api/extra-income";

const ExtraIncome = ({ darkMode }) => {
  // State for form inputs
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    incomeType: "",
    description: "",
    assignedTo:"",
  });
  // State for table data
  const [extraIncomes, setExtraIncomes] = useState([]);
  // State for editing
  const [editingRecord, setEditingRecord] = useState(null);
  // State for modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(null);
  // State for search
  const [searchQuery, setSearchQuery] = useState("");
  // State for loading and error
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);

  const [returningRecord, setReturningRecord] = useState(null);

  const userRole = localStorage.getItem('role');

  const [summaryIncomeTypeFilter, setSummaryIncomeTypeFilter] = useState('all');

  const [paymentBreakdown, setPaymentBreakdown] = useState([{ method: "", amount: "" }]);

  // Sample data for demo mode
  const sampleData = [
    {
      _id: "1",
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().slice(0, 5),
      incomeType: "Bonus",
      amount: 5000,
      description: "Year-end bonus",
    },
    {
      _id: "2",
      date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
      time: new Date(Date.now() - 86400000).toTimeString().slice(0, 5),
      incomeType: "Refund",
      amount: 2000,
      description: "Supplier refund",
    },
  ];

  // Helper: Get unique income types from existing records
  const getUniqueIncomeTypes = () => {
    const types = [...new Set(extraIncomes.map(income => income.incomeType))];
    return types.map(type => ({ value: type, label: type }));
  };

  // Fetch extra income records
  const fetchExtraIncomes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error("Failed to fetch extra incomes");
      }
      const data = await response.json();
      setExtraIncomes(
        data.map((income) => ({
          ...income,
          date: new Date(income.date).toISOString().split("T")[0],
          time: new Date(income.date).toTimeString().slice(0, 5),
        }))
      );
    } catch (err) {
      console.error("Error fetching extra incomes:", err);
      setError("Failed to load data. Showing sample data.");
      setExtraIncomes(sampleData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExtraIncomes();
  }, []);

  useEffect(() => {
    if (!returningRecord) return;

    let total = 0;

    if (returningRecord.returnAlert === "returned") {
      total = parseFloat(returningRecord.serviceCharge) || 0;
    } else {
      total = parseFloat(returningRecord.amount) || 0;
    }

    setReturningRecord(prev => ({
      ...prev,
      totalAmount: total.toFixed(2)
    }));
  }, [returningRecord?.returnAlert, returningRecord?.serviceCharge, returningRecord?.amount]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const token = localStorage.getItem('token');

  const handleOpenAddModal = () => {
    setPaymentBreakdown([{ method: "", amount: "" }]);
    setShowAddModal(true);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const hasCredit = paymentBreakdown.some(p => p.method === "Credit");

    // ✅ VALIDATION: Payment breakdown must be valid
    const validPayments = paymentBreakdown.filter(p => p.method && p.amount !== "");
    if (validPayments.length === 0) {
      setError("Please add at least one valid payment method and amount.");
      return;
    }

    const totalAmount = validPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    setFormLoading(true);

    try {
      const payload = {
        date: `${formData.date}T${formData.time}:00.000Z`,
        incomeType: formData.incomeType,
        amount: totalAmount,
        description: formData.description,
        assignedTo: formData.assignedTo,
        creditedDate: hasCredit ? new Date().toISOString().split('T')[0] : null,
        hasCredit,
        paymentBreakdown: validPayments.map(p => ({
          method: p.method,
          amount: parseFloat(p.amount)
        })),
      };
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to add extra income");
      }
      const newIncome = await response.json();
      setExtraIncomes([
        {
          ...newIncome,
          date: new Date(newIncome.date).toISOString().split("T")[0],
          time: new Date(newIncome.date).toTimeString().slice(0, 5),
        },
        ...extraIncomes,
      ]);
      setFormData({
        date: "",
        time: "",
        incomeType: "",
        description: "",
        assignedTo: "",
      });
      setShowAddModal(false);
      setPaymentBreakdown([{ method: "", amount: "" }]);
      onUpdate();
    } catch (err) {
      console.error("Error adding extra income:", err);
      setError(err.message);
    } finally {
      setFormLoading(false); // ✅ Stop loading
    }
  };

  const handleReturn = (record) => {
    setReturningRecord({
      ...record,
      returnAlert: record.returnAlert || "",
      serviceCharge: record.serviceCharge?.toString() || "0",
      totalAmount: record.totalAmount?.toString() || record.amount?.toString() || "0",
    });
    setShowActionMenu(null);
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();

    try {
      const {
        _id,
        date,
        time,
        incomeType,
        amount,
        description,
        assignedTo,
        paymentMethod,
        returnAlert,
        serviceCharge,
        totalAmount
      } = returningRecord;

      const combinedDateTime = new Date(`${date}T${time}`);

      const payload = {
        date: combinedDateTime,
        incomeType,
        amount: parseFloat(amount),
        description,
        assignedTo,
        paymentMethod,
        returnAlert,
        serviceCharge: parseFloat(serviceCharge) || 0,
        totalAmount: parseFloat(totalAmount),
      };

      const response = await fetch(`${API_URL}/${_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update return record");
      }

      const updatedRecord = await response.json();

      setExtraIncomes(
        extraIncomes.map((income) =>
          income._id === _id
            ? {
                ...updatedRecord,
                date: new Date(updatedRecord.date).toISOString().split("T")[0],
                time: new Date(updatedRecord.date).toTimeString().slice(0, 5),
              }
            : income
        )
      );

      setReturningRecord(null);
      onUpdate();
    } catch (err) {
      console.error("Error updating return record:", err);
      setError(err.message);
    }
  };

  // Handle edit button click
  const handleEdit = (record) => {
    setEditingRecord(record);
    setShowActionMenu(null);

    const existingBreakdown = record.paymentBreakdown && Array.isArray(record.paymentBreakdown) && record.paymentBreakdown.length > 0
    ? record.paymentBreakdown.map(p => ({ method: p.method, amount: p.amount.toString() }))
    : [{ method: record.paymentMethod, amount: (record.totalPaid || record.amount || 0).toString() }];

    setPaymentBreakdown(existingBreakdown);
  };

  // Handle edit form submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    const hasCredit = paymentBreakdown.some(p => p.method === "Credit");

    const validPayments = paymentBreakdown.filter(p => p.method && p.amount !== "");
    if (validPayments.length === 0) {
      setError("Please add at least one valid payment method and amount.");
      return;
    }

    const totalAmount = validPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    setFormLoading(true);
    try {
      const payload = {
        date: `${editingRecord.date}T${editingRecord.time}:00.000Z`,
        incomeType: editingRecord.incomeType,
        amount: totalAmount,
        description: editingRecord.description,
        assignedTo: editingRecord.assignedTo,
        creditedDate: hasCredit ? new Date().toISOString().split('T')[0] : null,
        hasCredit,
        paymentBreakdown: validPayments.map(p => ({
          method: p.method,
          amount: parseFloat(p.amount)
        })),
      };
      const response = await fetch(`${API_URL}/${editingRecord._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to update extra income");
      }
      const updatedIncome = await response.json();
      setExtraIncomes(
        extraIncomes.map((income) =>
          income._id === editingRecord._id
            ? {
                ...updatedIncome,
                date: new Date(updatedIncome.date).toISOString().split("T")[0],
                time: new Date(updatedIncome.date).toTimeString().slice(0, 5),
              }
            : income
        )
      );
      setEditingRecord(null);
      setPaymentBreakdown([{ method: "", amount: "" }]);
      onUpdate();
    } catch (err) {
      console.error("Error updating extra income:", err);
      setError(err.message);
    } finally {
      setFormLoading(false); // ✅ Stop loading
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        const response = await fetch(`${API_URL}/${id}`, {
          method: "DELETE",
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error("Failed to delete extra income");
        }
        setExtraIncomes(extraIncomes.filter((income) => income._id !== id));
        setShowActionMenu(null);
        onUpdate();
      } catch (err) {
        console.error("Error deleting extra income:", err);
        setError(err.message);
      }
    }
  };

  // Handle update after add/edit
  const onUpdate = () => {
    fetchExtraIncomes();
  };

  // Calculate monthly summary for chart
  const calculateMonthlySummary = (incomeTypeFilter = 'all') => {
    const monthlyData = {};
    let totalAmount = 0;

    const filteredForSummary = extraIncomes.filter(record => {
      if (incomeTypeFilter === 'all') return true;
      return record.incomeType === incomeTypeFilter;
    });

    filteredForSummary.forEach((record) => {
      const date = new Date(record.date);
      const monthYear = date.toLocaleString("default", { month: "long", year: "numeric" });
      if (!monthlyData[monthYear]) monthlyData[monthYear] = 0;
      monthlyData[monthYear] += record.amount;
      totalAmount += record.amount;
    });

    const months = Object.keys(monthlyData);
    const amounts = months.map((month) => monthlyData[month]);
    return { monthlyData, totalAmount, months, amounts };
  };

  const uniqueIncomeTypes = [...new Set(extraIncomes.map(r => r.incomeType))];

  const currentSummary = calculateMonthlySummary(summaryIncomeTypeFilter);
  const { totalAmount } = currentSummary;

  // Chart options for Highcharts
  const chartOptions = React.useMemo(() => {
    const { months, amounts } = calculateMonthlySummary(summaryIncomeTypeFilter);

    return {
      chart: {
        type: "column",
        options3d: {
          enabled: true,
          alpha: 1,
          beta: 0,
          depth: 50,
          viewDistance: 25,
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
        text: "Monthly Extra Income",
        style: { color: darkMode ? "#ffffff" : "#000000", fontFamily: "'Inter', sans-serif", fontSize: "18px" },
      },
      xAxis: {
        categories: months,
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
            return Highcharts.numberFormat(this.value, 0);
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
          pointWidth: 20,
          groupPadding: 0.2,
          pointPadding: 0.05,
          colorByPoint: true,
          dataLabels: {
            enabled: true,
            format: "{y}",
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
          name: "Extra Income",
          data: amounts,
          colors: ["#1e90ff", "#ff4040", "#32cd32", "#ffcc00", "#ff69b4", "#8a2be2"],
        },
      ],
      legend: { enabled: false },
      credits: { enabled: false },
      tooltip: {
        backgroundColor: darkMode ? "rgba(15, 23, 42, 0.9)" : "rgba(245, 245, 245, 0.9)",
        style: {
          color: darkMode ? "#ffffff" : "#000000",
          fontFamily: "'Inter', sans-serif",
        },
        formatter: function () {
          return `<b>${this.x}</b>: ${Highcharts.numberFormat(this.y, 2)}`;
        },
      },
    };
  }, [summaryIncomeTypeFilter, darkMode, extraIncomes]);

  // Generate Excel report
  const generateExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredRecords.map((record, index) => ({
        No: index + 1,
        Date: record.date,
        Time: record.time,
        "Income Type": record.incomeType,
        Amount: record.amount.toFixed(2),
        Description: record.description || "N/A",
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Extra Income Records");
    XLSX.writeFile(workbook, "Extra_Income_Records.xlsx");
    setShowReportOptions(false);
  };

  // Generate PDF report
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text("Extra Income Records", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [["No", "Date", "Time", "Income Type", "Amount", "Description"]],
      body: filteredRecords.map((record, index) => [
        index + 1,
        record.date,
        record.time,
        record.incomeType,
        record.amount.toFixed(2),
        record.description || "N/A",
      ]),
    });
    doc.save("Extra_Income_Records.pdf");
    setShowReportOptions(false);
  };

  const normalize = str => (str || '').toLowerCase().replace(/\s+/g, '');

  // Filter records based on search query
  const filteredRecords = extraIncomes.filter(
    (record) =>
      normalize(record.date).includes(normalize(searchQuery)) ||
      normalize(record.time).includes(normalize(searchQuery)) ||
      normalize(record.incomeType).includes(normalize(searchQuery)) ||
      normalize(record.description).includes(normalize(searchQuery))
  );

  // Clear search query
  const handleClearSearch = () => {
    setSearchQuery("");
  };

  return (
    <div className={`product-repair-list-container ${darkMode ? "dark" : ""}`}>
      <div className="header-section">
        <h2 className={`product-repair-list-title ${darkMode ? "dark" : ""}`}>Extra Income Records</h2>
      </div>
      <div className="search-action-container">
        <div className={`search-bar-container ${darkMode ? "dark" : ""}`}>
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="       Search Extra Income..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`product-list-search-bar ${darkMode ? "dark" : ""}`}
          />
          {searchQuery && (
            <button onClick={handleClearSearch} className="search-clear-btn">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>
        <div className="filter-action-row">
          {userRole === 'admin' && (
            <button onClick={() => setShowSummaryModal(true)} className="btn-summary">
              <FontAwesomeIcon icon={faChartSimple} /> Summary
            </button>
          )}
          <button onClick={handleOpenAddModal} className="btn-primary">
            <FontAwesomeIcon icon={faPlus} /> Add Extra Income
          </button>
          <button onClick={() => setShowReportOptions(true)} className="btn-report">
            <FontAwesomeIcon icon={faFile} /> Reports
          </button>
        </div>
      </div>
      {showReportOptions && (
        <div className="report-modal-overlay" onClick={() => setShowReportOptions(false)}>
          <div className={`report-modal-content ${darkMode ? "dark" : ""}`} onClick={(e) => e.stopPropagation()}>
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
                style={{ background: "green" }}
              >
                <FontAwesomeIcon icon={faFileExcel} className="report-btn-icon" /> Excel
              </button>
              <button
                onClick={generatePDF}
                className="btn-report-p"
                style={{ background: "red" }}
              >
                <FontAwesomeIcon icon={faFilePdf} className="report-btn-icon" /> PDF
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <p className="error-message">{error}</p>}
      {loading ? (
        <p className="loading">Loading extra income records...</p>
      ) : filteredRecords.length === 0 ? (
        <p className="no-products">No extra income records available.</p>
      ) : (
        <table className={`product-table ${darkMode ? "dark" : ""}`}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Income Type</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Payment Method</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => (
              <tr key={record._id}>
                <td>{record.date}</td>
                <td>{record.time}</td>
                <td>{record.incomeType} {record.returnAlert === "returned" ? "(returned)" : ""}</td>
                <td>{record.amount.toFixed(2)}</td>
                <td>{record.description || "N/A"}</td>
                <td>
                  {record.paymentBreakdown && record.paymentBreakdown.length > 0 ? (
                    <div>
                      {record.paymentBreakdown.map((p, i) => (
                        <div key={i} style={{ fontSize: "12px" }}>
                          {p.method}: Rs. {p.amount.toFixed(2)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>{record.paymentMethod || "N/A"}</>
                  )}
                </td>
                <td>
                  <div className="action-container">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setShowActionMenu(showActionMenu === record._id ? null : record._id);
                      }}
                      className="action-dot-btn"
                    >
                      ⋮
                    </button>
                    {showActionMenu === record._id && (
                      <>
                        <div className="action-menu-overlay" onClick={() => setShowActionMenu(null)} />
                        <div className="action-menu">
                          <button onClick={() => handleEdit(record)} className="p-edit-btn">
                            <div className="action-btn-content">
                              <img src={editicon} alt="edit" width="30" height="30" className="p-edit-btn-icon" />
                              <span>Edit</span>
                            </div>
                          </button>
                          {userRole === 'admin' && (

                            <button onClick={() => handleDelete(record._id)} className="p-delete-btn">
                              <div className="action-btn-content">
                                <img src={deleteicon} alt="delete" width="30" height="30" className="p-delete-btn-icon" />
                                <span>Delete</span>
                              </div>
                            </button>
                          
                          )}
                          <button onClick={() => handleReturn(record)} className="p-return-btn">
                            <div className="action-btn-content">
                              <span className="p-edit-btn-icon" style={{width:"30", height:"30"}}>↩️ </span>
                              <span>Return</span>
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

      {showAddModal && (
        <div className={`m-a-modal-overlay ${darkMode ? "dark" : ""}`} onClick={() => setShowAddModal(false)}>
          <div className={`m-a-modal-container ${darkMode ? "dark" : ""}`} onClick={(e) => e.stopPropagation()} 
            style={{
              maxHeight: "1000px",
              display: "flex",
              flexDirection: "column",
              width: "100%",
              maxWidth: "600px",
          }}>
            <h3 className={`m-a-modal-title ${darkMode ? "dark" : ""}`}>Add Extra Income Record</h3>
            {error && <p className="error-message">{error}</p>}
            {formLoading && (
              <div className="form-loading">
                <div className="spinner"></div>
                <p>Processing...</p>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <label className={`madd-label ${darkMode ? "dark" : ""}`}>Date</label>
              <input
                className={`madd-input ${darkMode ? "dark" : ""}`}
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
              <label className={`madd-label ${darkMode ? "dark" : ""}`}>Time</label>
              <input
                className={`madd-input ${darkMode ? "dark" : ""}`}
                type="time"
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                required
              />
              <label className={`madd-label ${darkMode ? "dark" : ""}`}>Income Type</label>
              <Select
                isClearable
                options={getUniqueIncomeTypes()}
                value={formData.incomeType ? { value: formData.incomeType, label: formData.incomeType } : null}
                onChange={(selected) => setFormData({ ...formData, incomeType: selected ? selected.value : '' })}
                placeholder="Select or create income type..."
                classNamePrefix="react-select"
                styles={{
                  control: (provided) => ({
                    ...provided,
                    backgroundColor: darkMode ? '#333' : '#fff',
                    borderColor: darkMode ? '#555' : '#ccc',
                    color: darkMode ? '#fff' : '#333',
                    minHeight: '40px',
                  }),
                  menu: (provided) => ({
                    ...provided,
                    backgroundColor: darkMode ? '#2d3748' : '#fff',
                    zIndex: 1000,
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isFocused
                      ? (darkMode ? '#4a5568' : '#e2e8f0')
                      : (darkMode ? '#2d3748' : '#fff'),
                    color: darkMode ? '#fff' : '#000',
                  }),
                  singleValue: (provided) => ({
                    ...provided,
                    color: darkMode ? '#fff' : '#333',
                  }),
                  input: (provided) => ({
                    ...provided,
                    color: darkMode ? '#fff' : '#333',
                  }),
                  placeholder: (provided) => ({
                    ...provided,
                    color: darkMode ? '#a0aec0' : '#999',
                  }),
                }}
              />
              {/* <label className={`madd-label ${darkMode ? "dark" : ""}`}>Amount</label>
              <input
                className={`madd-input ${darkMode ? "dark" : ""}`}
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                onWheel={(e) => e.target.blur()}
                min="0"
                step="0.01"
                required
              /> */}
              <label className={`madd-label ${darkMode ? "dark" : ""}`}>Description</label>
              <input
                className={`madd-input ${darkMode ? "dark" : ""}`}
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
              />
              {/* === NEW: Assigned To Dropdown === */}
                <label className={`madd-label ${darkMode ? "dark" : ""}`}>Assign To:</label>
                <select
                  name="assignedTo"
                  className={`madd-input ${darkMode ? "dark" : ""}`}
                  value={formData.assignedTo || ""}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  required
                  style={{
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    backgroundColor: darkMode ? "#444" : "#fff",
                    color: darkMode ? "#fff" : "#333",
                    width: "100%",
                  }}
                >
                  <option value="" disabled selected>Select Technician/Team</option>
                  <option value="Prabath">Prabath</option>
                  <option value="Nadeesh">Nadeesh</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Genex-EX">Genex EX</option>
                  <option value="I-Device">I Device</option>
                </select>
              {/* === END NEW FIELD === */}
              {/* === NEW: Payment Method Dropdown === */}
                {/* === PAYMENT BREAKDOWN SECTION === */}
                <div style={{ marginTop: "15px", padding: "12px", backgroundColor: darkMode ? "#2d3748" : "#f0f9ff", borderRadius: "5px", border: `1px solid ${darkMode ? "#4a5568" : "#bee3f8"}` }}>
                  <h4 style={{ margin: "0 0 12px 0", color: darkMode ? "#63b3ed" : "#2b6cb0", fontSize: "16px", fontWeight: "bold" }}>
                    Payment Breakdown
                  </h4>
                  {paymentBreakdown.map((entry, index) => (
                    <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
                      <select
                        value={entry.method}
                        onChange={(e) => {
                          const newMethod = e.target.value;
                          const newBreakdown = [...paymentBreakdown];

                          // ✅ SPECIAL HANDLING FOR "Credit"
                          if (newMethod === "Credit") {
                            // Reset to only Credit
                            setPaymentBreakdown([{ method: "Credit", amount: "" }]);
                            return;
                          }

                          // If currently in Credit-only mode and switching away
                          if (
                            paymentBreakdown.length === 1 &&
                            paymentBreakdown[0].method === "Credit"
                          ) {
                            setPaymentBreakdown([{ method: newMethod, amount: "" }]);
                            return;
                          }

                          // ✅ If changing TO a method that already exists elsewhere, MERGE
                          if (newMethod && newMethod !== entry.method) {
                            const existingIndex = newBreakdown.findIndex(
                              (p, idx) => p.method === newMethod && idx !== index
                            );

                            if (existingIndex >= 0) {
                              // Merge amount into existing row
                              const currentAmount = parseFloat(entry.amount) || 0;
                              const existingAmount = parseFloat(newBreakdown[existingIndex].amount) || 0;
                              newBreakdown[existingIndex] = {
                                ...newBreakdown[existingIndex],
                                amount: (existingAmount + currentAmount).toFixed(2)
                              };
                              // Remove the current row
                              newBreakdown.splice(index, 1);
                            } else {
                              // Just update the method
                              newBreakdown[index].method = newMethod;
                            }
                          } else {
                            // Clear method
                            newBreakdown[index].method = newMethod;
                          }

                          setPaymentBreakdown(newBreakdown);
                        }}
                        style={{
                          flex: 1,
                          padding: "8px",
                          borderRadius: "4px",
                          border: "1px solid #ccc",
                          backgroundColor: darkMode ? "#444" : "#fff",
                          color: darkMode ? "#fff" : "#333"
                        }}
                      >
                        <option value="">Select Method</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="Bank-Transfer">Bank Transfer</option>
                        <option value="Bank-Check">Bank Check</option>
                        <option value="Credit">Credit</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        onWheel={(e) => e.target.blur()}
                        onFocus={(e) => e.target.select()}
                        value={entry.amount}
                        onChange={(e) => {
                          const newBreakdown = [...paymentBreakdown];
                          newBreakdown[index].amount = e.target.value;
                          setPaymentBreakdown(newBreakdown);
                        }}
                        style={{
                          width: "120px",
                          padding: "8px",
                          borderRadius: "4px",
                          border: "1px solid #ccc",
                          backgroundColor: darkMode ? "#444" : "#fff",
                          color: darkMode ? "#fff" : "#333",
                          textAlign: "right"
                        }}
                      />
                      {paymentBreakdown.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newBreakdown = [...paymentBreakdown];
                            newBreakdown.splice(index, 1);
                            setPaymentBreakdown(newBreakdown);
                          }}
                          style={{
                            background: "#e53e3e",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            width: "30px",
                            height: "30px",
                            cursor: "pointer"
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {!paymentBreakdown.some(p => p.method === "Credit") && (
                    <button
                      type="button"
                      onClick={() => setPaymentBreakdown([...paymentBreakdown, { method: "", amount: "" }])}
                      style={{
                        marginTop: "8px",
                        background: "#38a169",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 12px",
                        fontSize: "14px",
                        cursor: "pointer"
                      }}
                    >
                      + Add Payment
                    </button>
                  )}

                  {/* REAL-TIME TOTAL */}
                  {paymentBreakdown.some(p => p.amount) && (
                    <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: `1px solid ${darkMode ? "#4a5568" : "#cbd5e0"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", color: darkMode ? "#e2e8f0" : "#2d3748" }}>
                        <span>Total Amount:</span>
                        <span>
                          Rs. {paymentBreakdown
                            .filter(p => p.amount)
                            .reduce((sum, p) => sum + parseFloat(p.amount), 0)
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              {/* === END NEW FIELD === */}
              <div className="button-group">
                <button 
                  type="submit" 
                  className="me-submit-btn"
                  disabled={formLoading}
                >
                  {formLoading ? "Processing..." : "Submit"}
                </button>
                <button type="button" className="me-cancel-btn" onClick={() => setShowAddModal(false)} disabled={formLoading}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingRecord && (
        <div className={`m-a-modal-overlay ${darkMode ? "dark" : ""}`} onClick={() => setEditingRecord(null)}>
          <div className={`m-a-modal-container ${darkMode ? "dark" : ""}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`m-a-modal-title ${darkMode ? "dark" : ""}`}>Edit Extra Income Record</h3>
            {error && <p className="error-message">{error}</p>}
            {formLoading && (
              <div className="form-loading">
                <div className="spinner"></div>
                <p>Processing...</p>
              </div>
            )}
            <form onSubmit={handleEditSubmit}>
              <label className={`madd-label ${darkMode ? "dark" : ""}`}>Date</label>
              <input
                className={`madd-input ${darkMode ? "dark" : ""}`}
                type="date"
                name="date"
                value={editingRecord.date}
                onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
                required
              />
              <label className={`madd-label ${darkMode ? "dark" : ""}`}>Time</label>
              <input
                className={`madd-input ${darkMode ? "dark" : ""}`}
                type="time"
                name="time"
                value={editingRecord.time}
                onChange={(e) => setEditingRecord({ ...editingRecord, time: e.target.value })}
                required
              />
              <label className={`madd-label ${darkMode ? "dark" : ""}`}>Income Type</label>
              <Select
                isClearable
                options={getUniqueIncomeTypes()}
                value={editingRecord.incomeType ? { value: editingRecord.incomeType, label: editingRecord.incomeType } : null}
                onChange={(selected) => setEditingRecord({ ...editingRecord, incomeType: selected ? selected.value : '' })}
                placeholder="Select or create income type..."
                classNamePrefix="react-select"
                styles={{
                  control: (provided) => ({
                    ...provided,
                    backgroundColor: darkMode ? '#333' : '#fff',
                    borderColor: darkMode ? '#555' : '#ccc',
                    color: darkMode ? '#fff' : '#333',
                    minHeight: '40px',
                  }),
                  menu: (provided) => ({
                    ...provided,
                    backgroundColor: darkMode ? '#2d3748' : '#fff',
                    zIndex: 1000,
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isFocused
                      ? (darkMode ? '#4a5568' : '#e2e8f0')
                      : (darkMode ? '#2d3748' : '#fff'),
                    color: darkMode ? '#fff' : '#000',
                  }),
                  singleValue: (provided) => ({
                    ...provided,
                    color: darkMode ? '#fff' : '#333',
                  }),
                  input: (provided) => ({
                    ...provided,
                    color: darkMode ? '#fff' : '#333',
                  }),
                  placeholder: (provided) => ({
                    ...provided,
                    color: darkMode ? '#a0aec0' : '#999',
                  }),
                }}
              />
              {/* <label className={`madd-label ${darkMode ? "dark" : ""}`}>Amount</label>
              <input
                className={`madd-input ${darkMode ? "dark" : ""}`}
                type="number"
                name="amount"
                value={editingRecord.amount}
                onChange={(e) => setEditingRecord({ ...editingRecord, amount: e.target.value })}
                onWheel={(e) => e.target.blur()}
                min="0"
                step="0.01"
                required
              /> */}
              <label className={`madd-label ${darkMode ? "dark" : ""}`}>Description</label>
              <input
                className={`madd-input ${darkMode ? "dark" : ""}`}
                type="text"
                name="description"
                value={editingRecord.description}
                onChange={(e) => setEditingRecord({ ...editingRecord, description: e.target.value })}
              />
              {/* === NEW: Assigned To Dropdown === */}
                <label className={`madd-label ${darkMode ? "dark" : ""}`}>Assign To:</label>
                <select
                  name="assignedTo"
                  className={`madd-input ${darkMode ? "dark" : ""}`}
                  value={editingRecord.assignedTo || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, assignedTo: e.target.value })}
                  required
                  style={{
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    backgroundColor: darkMode ? "#444" : "#fff",
                    color: darkMode ? "#fff" : "#333",
                    width: "100%",
                  }}
                >
                  <option value="" disabled selected>Select Technician/Team</option>
                  <option value="Prabath">Prabath</option>
                  <option value="Nadeesh">Nadeesh</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Genex-EX">Genex EX</option>
                  <option value="I-Device">I Device</option>
                </select>
                {/* === END NEW FIELD === */}
                {/* === NEW: Payment Method Dropdown === */}
                {/* <label className={`madd-label ${darkMode ? "dark" : ""}`}>Payment Method:</label>
                <select
                  name="paymentMethod"
                  className={`madd-input ${darkMode ? "dark" : ""}`}
                  value={editingRecord.paymentMethod}
                  onChange={(e) => setEditingRecord({ ...editingRecord, paymentMethod: e.target.value })}
                  required // Makes it mandatory
                >
                  <option value="">Select Payment Method</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank-Transfer">Bank Transfer</option>
                  <option value="Bank-Check">Bank Check</option>
                  <option value="Credit">Credit</option>
                </select> */}
                {/* === PAYMENT BREAKDOWN SECTION === */}
                <div style={{ marginTop: "15px", padding: "12px", backgroundColor: darkMode ? "#2d3748" : "#f0f9ff", borderRadius: "5px", border: `1px solid ${darkMode ? "#4a5568" : "#bee3f8"}` }}>
                  <h4 style={{ margin: "0 0 12px 0", color: darkMode ? "#63b3ed" : "#2b6cb0", fontSize: "16px", fontWeight: "bold" }}>
                    Payment Breakdown
                  </h4>
                  {paymentBreakdown.map((entry, index) => (
                    <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
                      <select
                        value={entry.method}
                        onChange={(e) => {
                          const newMethod = e.target.value;
                          const newBreakdown = [...paymentBreakdown];

                          // ✅ SPECIAL HANDLING FOR "Credit"
                          if (newMethod === "Credit") {
                            // Reset to only Credit
                            setPaymentBreakdown([{ method: "Credit", amount: "" }]);
                            return;
                          }

                          // If currently in Credit-only mode and switching away
                          if (
                            paymentBreakdown.length === 1 &&
                            paymentBreakdown[0].method === "Credit"
                          ) {
                            setPaymentBreakdown([{ method: newMethod, amount: "" }]);
                            return;
                          }

                          // ✅ If changing TO a method that already exists elsewhere, MERGE
                          if (newMethod && newMethod !== entry.method) {
                            const existingIndex = newBreakdown.findIndex(
                              (p, idx) => p.method === newMethod && idx !== index
                            );

                            if (existingIndex >= 0) {
                              // Merge amount into existing row
                              const currentAmount = parseFloat(entry.amount) || 0;
                              const existingAmount = parseFloat(newBreakdown[existingIndex].amount) || 0;
                              newBreakdown[existingIndex] = {
                                ...newBreakdown[existingIndex],
                                amount: (existingAmount + currentAmount).toFixed(2)
                              };
                              // Remove the current row
                              newBreakdown.splice(index, 1);
                            } else {
                              // Just update the method
                              newBreakdown[index].method = newMethod;
                            }
                          } else {
                            // Clear method
                            newBreakdown[index].method = newMethod;
                          }

                          setPaymentBreakdown(newBreakdown);
                        }}
                        style={{
                          flex: 1,
                          padding: "8px",
                          borderRadius: "4px",
                          border: "1px solid #ccc",
                          backgroundColor: darkMode ? "#444" : "#fff",
                          color: darkMode ? "#fff" : "#333"
                        }}
                      >
                        <option value="">Select Method</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="Bank-Transfer">Bank Transfer</option>
                        <option value="Bank-Check">Bank Check</option>
                        <option value="Credit">Credit</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        onFocus={(e) => e.target.select()}
                        onWheel={(e) => e.target.blur()}
                        value={entry.amount}
                        onChange={(e) => {
                          const newBreakdown = [...paymentBreakdown];
                          newBreakdown[index].amount = e.target.value;
                          setPaymentBreakdown(newBreakdown);
                        }}
                        style={{
                          width: "120px",
                          padding: "8px",
                          borderRadius: "4px",
                          border: "1px solid #ccc",
                          backgroundColor: darkMode ? "#444" : "#fff",
                          color: darkMode ? "#fff" : "#333",
                          textAlign: "right"
                        }}
                      />
                      {paymentBreakdown.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newBreakdown = [...paymentBreakdown];
                            newBreakdown.splice(index, 1);
                            setPaymentBreakdown(newBreakdown);
                          }}
                          style={{
                            background: "#e53e3e",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            width: "30px",
                            height: "30px",
                            cursor: "pointer"
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {!paymentBreakdown.some(p => p.method === "Credit") && (
                    <button
                      type="button"
                      onClick={() => setPaymentBreakdown([...paymentBreakdown, { method: "", amount: "" }])}
                      style={{
                        marginTop: "8px",
                        background: "#38a169",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 12px",
                        fontSize: "14px",
                        cursor: "pointer"
                      }}
                    >
                      + Add Payment
                    </button>
                  )}

                  {/* REAL-TIME TOTAL */}
                  {paymentBreakdown.some(p => p.amount) && (
                    <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: `1px solid ${darkMode ? "#4a5568" : "#cbd5e0"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", color: darkMode ? "#e2e8f0" : "#2d3748" }}>
                        <span>Total Amount:</span>
                        <span>
                          Rs. {paymentBreakdown
                            .filter(p => p.amount)
                            .reduce((sum, p) => sum + parseFloat(p.amount), 0)
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              {/* === END NEW FIELD === */}
              <div className="button-group">
                <button 
                  type="submit" 
                  className="me-submit-btn"
                  disabled={formLoading}
                >
                  {formLoading ? "Processing..." : "Submit"}
                </button>
                <button type="button" className="me-cancel-btn" onClick={() => setEditingRecord(null)} disabled={formLoading}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {returningRecord && (
        <div className={`m-a-modal-overlay ${darkMode ? "dark" : ""}`} onClick={() => setReturningRecord(null)}>
          <div className={`m-a-modal-container ${darkMode ? "dark" : ""}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`m-a-modal-title ${darkMode ? "dark" : ""}`}>Process Return</h3>
            {error && <p className="error-message">{error}</p>}
            <form onSubmit={handleReturnSubmit}>
              <label className={`madd-label ${darkMode ? "dark" : ""}`}>Date</label>
              <input
                className={`madd-input ${darkMode ? "dark" : ""}`}
                type="date"
                value={returningRecord.date}
                readOnly
              />
              <label className={`madd-label ${darkMode ? "dark" : ""}`}>Time</label>
              <input
                className={`madd-input ${darkMode ? "dark" : ""}`}
                type="time"
                value={returningRecord.time}
                readOnly
              />
              <label className={`madd-label ${darkMode ? "dark" : ""}`}>Income Type</label>
              <input
                className={`madd-input ${darkMode ? "dark" : ""}`}
                type="text"
                value={returningRecord.incomeType}
                readOnly
              />
              <label className={`madd-label ${darkMode ? "dark" : ""}`}>Original Amount</label>
              <input
                className={`madd-input ${darkMode ? "dark" : ""}`}
                type="number"
                onFocus={(e) => e.target.select()}
                onWheel={(e) => e.target.blur()}
                value={returningRecord.amount}
                readOnly
                step="0.01"
              />

              {/* === RETURN ALERT DROPDOWN === */}
              <label className={`madd-label ${darkMode ? "dark" : ""}`}>Return Alert:</label>
              <select
                className={`madd-input ${darkMode ? "dark" : ""}`}
                value={returningRecord.returnAlert}
                onChange={(e) => setReturningRecord({ ...returningRecord, returnAlert: e.target.value })}
                style={{
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  backgroundColor: darkMode ? "#444" : "#fff",
                  color: darkMode ? "#fff" : "#333",
                  width: "100%",
                }}
              >
                <option value="">Normal</option>
                <option value="returned">Returned</option>
              </select>
              {/* === END RETURN ALERT === */}

              {/* === SERVICE CHARGE INPUT === */}
              <label className={`madd-label ${darkMode ? "dark" : ""}`}>Service Charge (Rs.):</label>
              <input
                className={`madd-input ${darkMode ? "dark" : ""}`}
                type="text"
                value={returningRecord.serviceCharge}
                onChange={(e) => setReturningRecord({ ...returningRecord, serviceCharge: e.target.value })}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
              {/* === END SERVICE CHARGE === */}

              {/* === TOTAL AMOUNT (READONLY) === */}
              <label className={`madd-label ${darkMode ? "dark" : ""}`}>Total Amount (Rs.):</label>
              <input
                className={`madd-input ${darkMode ? "dark" : ""}`}
                type="number"
                onFocus={(e) => e.target.select()}
                onWheel={(e) => e.target.blur()}
                value={returningRecord.totalAmount}
                readOnly
                step="0.01"
              />
              {/* === END TOTAL === */}

              {/* === ASSIGNED TO & PAYMENT METHOD (Optional: make editable or readonly) === */}
              {/* <label className={`madd-label ${darkMode ? "dark" : ""}`}>Assign To:</label>
              <select
                className={`madd-input ${darkMode ? "dark" : ""}`}
                value={returningRecord.assignedTo || ""}
                onChange={(e) => setReturningRecord({ ...returningRecord, assignedTo: e.target.value })}
                style={{
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  backgroundColor: darkMode ? "#444" : "#fff",
                  color: darkMode ? "#fff" : "#333",
                  width: "100%",
                }}
              >
                <option value="" disabled>Select Technician/Team</option>
                <option value="Prabath">Prabath</option>
                <option value="Nadeesh">Nadeesh</option>
                <option value="Accessories">Accessories</option>
                <option value="Genex-EX">Genex EX</option>
                <option value="I-Device">I Device</option>
              </select>

              <label className={`madd-label ${darkMode ? "dark" : ""}`}>Payment Method:</label>
              <select
                className={`madd-input ${darkMode ? "dark" : ""}`}
                value={returningRecord.paymentMethod}
                onChange={(e) => setReturningRecord({ ...returningRecord, paymentMethod: e.target.value })}
              >
                <option value="">Select Payment Method</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Bank-Transfer">Bank Transfer</option>
                <option value="Bank-Check">Bank Check</option>
                <option value="Credit">Credit</option>
                <option value="Refund">Refund</option>
              </select> */}
              {/* === END OPTIONAL FIELDS === */}

              <div className="button-group">
                <button type="submit" className="me-submit-btn">Save Return</button>
                <button type="button" className="me-cancel-btn" onClick={() => setReturningRecord(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {showSummaryModal && (
        <div className="product-summary-modal-overlay">
          <div className={`product-summary-modal-content ${darkMode ? "dark" : ""}`}>
            <div className="product-summary-modal-header">
              <h3 className="product-summary-modal-title">Extra Income Summary</h3>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="product-summary-modal-close-icon"
              >
                ✕
              </button>
            </div>

            {/* Income Type Filter */}
            <div className="summary-filter-section">
              <label htmlFor="incomeTypeFilter">Filter by Income Type: </label>
              <select
                id="incomeTypeFilter"
                value={summaryIncomeTypeFilter}
                onChange={(e) => setSummaryIncomeTypeFilter(e.target.value)}
                className={`summary-filter-select ${darkMode ? 'dark' : ''}`}
              >
                <option value="all">All Income Types</option>
                {uniqueIncomeTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="product-summary-content">
              <div className="product-summary-card">
                <div className="product-summary-icon product-summary-total-icon">💸</div>
                <div className="product-summary-text">
                  <h4>Total Extra Income</h4>
                  <p>{totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="product-summary-chart-container">
              <HighchartsReact highcharts={Highcharts} options={chartOptions} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtraIncome;