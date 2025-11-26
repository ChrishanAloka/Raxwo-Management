import { useEffect, useState } from "react";
import axios from "axios";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFile, faChartSimple, faFilePdf, faFileExcel, faSearch, faTimes, faChartBar } from '@fortawesome/free-solid-svg-icons';
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import '../styles/SalaryList.css';
import editicon from '../icon/edit.png';
import deleteicon from '../icon/delete.png';
import SalaryAdd from "./SalaryAdd";
import SalaryEdit from "./SalaryEdit";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_URL = "https://raxwo-management.onrender.com/api/salaries";

const SalaryList = ({ darkMode }) => {
  const [salaries, setSalaries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summaryData, setSummaryData] = useState({ totalCost: 0, groupedByDate: {}, groupedByEmployee: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupBy, setGroupBy] = useState('employee'); // 'date' or 'employee'
  const [chartType, setChartType] = useState('advance'); // 'advance' or 'due'

  useEffect(() => {
    fetchSalaries();
  }, []);

  useEffect(() => {
    if (chartType === 'due') {
      setGroupBy('employee');
    }
  }, [chartType]);

  useEffect(() => {
    if ( !startDate && !endDate) {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const formatDate = (date) => date.toISOString().split('T')[0];

      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(lastDay));
    }

    // Fetch summary when both dates are set (after auto-fill)
    if ( startDate && endDate && Object.keys(summaryData.groupedByEmployee).length === 0) {
      fetchSummary();
    }
  }, [showSummary, startDate, endDate]);

  // useEffect(() => {
  //   if (!showSummary) {
  //     // Reset data when modal closes
  //     setSummaryData({ totalCost: 0, groupedByDate: {}, groupedByEmployee: {} });
  //     setStartDate('');
  //     setEndDate('');
  //   }
  // }, [showSummary]);

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL);
      setSalaries(res.data);
      setLoading(false);
    } catch (err) {
      setError("Error fetching salaries");
      setLoading(false);
    }
  };
  const token = localStorage.getItem('token');
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this salary?")) {
      try {
        await axios.delete(`${API_URL}/${id}`,{
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        setSalaries(salaries.filter((salary) => salary._id !== id));
        setShowActionMenu(null);
      } catch (err) {
        setError("Error deleting salary");
      }
    }
  };

  const handleEditClick = (salary) => {
    setSelectedSalary(salary);
    setEditModalOpen(true);
    setShowActionMenu(null);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Salary List", 90, 20);

    const tableData = filteredSalaries.map((salary) => [
      salary.employeeId,
      salary.employeeName,
      salary.advance.toLocaleString(),
      salary.remarks || 'N/A',
      new Date(salary.date).toLocaleDateString(),
    ]);

    doc.autoTable({
      head: [["Employee ID", "Employee Name", "Advance", "Remarks", "Date"]],
      body: tableData,
      startY: 30,
      styles: { fontSize: 10 },
      theme: "striped",
    });

    doc.save("salary_list.pdf");
    setShowReportOptions(false);
  };

  const generateExcel = () => {
    const formattedSalaries = filteredSalaries.map((salary) => ({
      "Employee ID": salary.employeeId,
      "Employee Name": salary.employeeName,
      Advance: salary.advance,
      Remarks: salary.remarks || 'N/A',
      Date: new Date(salary.date).toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedSalaries);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Salaries");
    XLSX.writeFile(workbook, "salary_list.xlsx");
    setShowReportOptions(false);
  };

  const fetchSummary = async () => {
    if (!startDate || !endDate) {
      alert("Please select a date range");
      return;
    }

    // ✅ Add one day to endDate to make it inclusive
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1); // Move to next day
    const endDateInclusive = end.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    try {
      const res = await axios.get(`${API_URL}/summary/${startDate}/${endDateInclusive}`);
      console.log("Summery data ",res.data);
      setSummaryData(res.data);
      setShowSummary(true);
    } catch (err) {
      setError("Error fetching summary");
    }
  };

  const normalize = str => (str || '').toLowerCase().replace(/\s+/g, '');

  const filteredSalaries = salaries.filter((salary) =>
    normalize(salary.employeeName).includes(normalize(searchQuery)) ||
    normalize(salary.employeeId).includes(normalize(searchQuery)) ||
    normalize(salary.remarks).includes(normalize(searchQuery))
  );

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const chartData = {
    labels: chartType === 'due'
      ? Object.values(summaryData.dueByEmployee || {}).map(emp => emp.employeeName)
      : (groupBy === 'employee'
          ? Object.keys(summaryData.groupedByEmployee || {})
          : Object.keys(summaryData.groupedByDate || {}).sort()),
    datasets: [
      {
        label: chartType === 'due' ? 'Due Amount' : 'Advance Amount',
        data: chartType === 'due'
          ? Object.values(summaryData.dueByEmployee || {}).map(emp => emp.due)
          : (groupBy === 'employee'
              ? Object.values(summaryData.groupedByEmployee || {})
              : Object.values(summaryData.groupedByDate || [])),
        backgroundColor: darkMode ? 'rgba(255, 99, 132, 0.6)' : chartType === 'due' ? 'rgba(255, 99, 132, 1)' : 'rgba(54, 162, 235, 0.6)',
        borderColor: darkMode ? 'rgba(255, 99, 132, 1)' : 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 
        groupBy === 'employee' 
          ? 'Salary Advance by Employee' 
          : 'Salary Advance by Date',
      font: { size: 18, family: 'Inter' } },
    },
    scales: {
      y: { 
        beginAtZero: true, 
        title: { display: true, text: 'Advance (LKR)', font: { size: 14, family: 'Inter' } },
        grid: { color: darkMode ? '#4a5568' : '#e0e0e0' },
      },
      x: { 
        title: { display: true, text: groupBy === 'employee' ? 'Employee ID' : 'Date' , font: { size: 14, family: 'Inter' } },
        grid: { display: false },
      },
    },
  };

  return (
    <div className={`product-repair-list-container ${darkMode ? "dark" : ""}`}>
      
      <div className="header-section">
        

        <h2 className={`product-repair-list-title ${darkMode ? "dark" : ""}`}>
        Salary List
        </h2>
      </div>
      <div className="search-action-container">
        <div className={`search-bar-container ${darkMode ? 'dark' : ''}`}>
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="Search Salaries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`salary-list-search-bar ${darkMode ? 'dark' : ''}`}
          />
          {searchQuery && (
            <button onClick={handleClearSearch} className="search-clear-btn">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>
        <div className='filter-action-row'>

        {/* <button onClick={() => setShowSummary(true)} className="btn-summary">
          <FontAwesomeIcon icon={faChartSimple} /> Summary
        </button> */}
        <button onClick={() => setAddModalOpen(true)} className="btn-primary">
          <FontAwesomeIcon icon={faPlus} /> Add Salary
        </button>
        <button onClick={() => setShowReportOptions(true)} className="btn-report">
          <FontAwesomeIcon icon={faFile} /> Reports
        </button>
        </div>
      </div>
      {showReportOptions && (
        <div className="report-modal-overlay" onClick={() => setShowReportOptions(false)}>
          <div className={`report-modal-content ${darkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="report-modal-header">
              <h3 style={{
                textAlign: 'center',
                flex: 1,
                width: '100%',
                margin: 0,
                fontWeight: 700,
                fontSize: '1.2rem',
                letterSpacing: '0.01em',
              }}>Select Report Type</h3>
              <button
                onClick={() => setShowReportOptions(false)}
                className="report-modal-close-icon"
              >
                ×
              </button>
            </div>
            <div className="report-modal-buttons">
              <button onClick={generateExcel} className="report-btn black">
                <FontAwesomeIcon icon={faFileExcel} style={{marginRight: 8}} /> Excel
              </button>
              <button onClick={generatePDF} className="report-btn black">
                <FontAwesomeIcon icon={faFilePdf} style={{marginRight: 8}} /> PDF
              </button>
            </div>
          </div>
        </div>
      )}
      {/* {showSummary && (
        <div className="salary-summary-modal-overlay" onClick={() => setShowSummary(false)}>
          <div className={`salary-summary-modal-content ${darkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="salary-summary-modal-header">
              <h3 className="salary-summary-modal-title">Salary Summary</h3>
              <button
                onClick={() => setShowSummary(false)}
                className="salary-summary-modal-close-icon"
              >
                ✕
              </button>
            </div>
            <div className="salary-summary-content">
              <div className="date-range-selector">
                <label className={`date-range-label ${darkMode ? 'dark' : ''}`}>Start Date:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`date-range-input ${darkMode ? 'dark' : ''}`}
                />
                <label className={`date-range-label ${darkMode ? 'dark' : ''}`}>End Date:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`date-range-input ${darkMode ? 'dark' : ''}`}
                />
                <button onClick={fetchSummary} className="fetch-summary-btn">
                  Fetch Summary
                </button>
              </div>
              {summaryData.totalCost > 0 && (
                <>
                  <p className={`total-cost ${darkMode ? 'dark' : ''}`}>
                    Total Salary Cost: LKR {summaryData.totalCost.toLocaleString()}
                  </p>
                  <div className="salary-summary-chart-container">
                    <Bar data={chartData} options={chartOptions} height={300} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )} */}
      {error && <p className="error-message">{error}</p>}
      {loading ? (
        <p className="loading">Loading salaries...</p>
      ) : filteredSalaries.length === 0 ? (
        <p className="no-salaries">No salaries available.</p>
      ) : (
      <div>
        <div className="salary-summary-content">
          <div className="date-range-selector">
            <label className={`date-range-label ${darkMode ? 'dark' : ''}`}>Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`date-range-input ${darkMode ? 'dark' : ''}`}
            />
            <label className={`date-range-label ${darkMode ? 'dark' : ''}`}>End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`date-range-input ${darkMode ? 'dark' : ''}`}
            /> 
            {groupBy !== 'date' && (
              <>         
                <label className={`date-range-label ${darkMode ? 'dark' : ''}`}>
                  View:
                </label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                  className={`date-range-input-select ${darkMode ? 'dark' : ''}`}
                >
                  <option value="advance">Advance</option>
                  <option value="due">Due Amount</option>
                </select>
              </>
            )}
            {chartType !== 'due' && (
                <>
                  <label className={`date-range-label ${darkMode ? 'dark' : ''}`}>
                    Group By:
                  </label>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    className={`date-range-input-select ${darkMode ? 'dark' : ''}`}
                    disabled={chartType === 'due'}
                  >
                    <option value="employee">Employee</option>
                    <option value="date">Date</option>
                  </select>
                </>
              )}
            <button onClick={fetchSummary} className="fetch-summary-btn">
              Fetch Summary
            </button>
          </div>
          {summaryData.totalCost > 0 && (
            <>
              <p className={`total-cost ${darkMode ? 'dark' : ''}`}>
                Total Salary Cost: LKR {summaryData.totalCost.toLocaleString()}
              </p>
              <div className="salary-summary-chart-container">
                <Bar data={chartData} options={chartOptions} height={300} width={500}/>
              </div>
            </>
          )}
        </div>
        <br/>
        <table className={`salary-table ${darkMode ? 'dark' : ''}`}>
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Employee Name</th>
              <th>Advance</th>
              <th>Remarks</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSalaries.map((salary) => (
              <tr key={salary._id}>
                <td>{salary.employeeId}</td>
                <td>{salary.employeeName}</td>
                <td>{salary.advance.toLocaleString()}</td>
                <td>{salary.remarks || 'N/A'}</td>
                <td>{new Date(salary.date).toLocaleDateString()}</td>
                <td>
                  <div className="action-container">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setShowActionMenu(showActionMenu === salary._id ? null : salary._id);
                      }}
                      className="action-dot-btn"
                    >
                      ⋮
                    </button>
                    {showActionMenu === salary._id && (
                      <>
                        <div className="action-menu-overlay" onClick={() => setShowActionMenu(null)} />
                        <div className={`action-menu ${darkMode ? 'dark' : ''}`}>
                          <button onClick={() => handleEditClick(salary)} className="salary-edit-btn">
                            <div className="action-btn-content">
                              <img src={editicon} alt="edit" className="salary-edit-btn-icon" />
                              <span>Edit</span>
                            </div>
                          </button>
                          <button onClick={() => handleDelete(salary._id)} className="salary-delete-btn">
                            <div className="action-btn-content">
                              <img src={deleteicon} alt="delete" className="salary-delete-btn-icon" />
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
      </div>
      )}
      {isAddModalOpen && (
        <SalaryAdd
          isOpen={isAddModalOpen}
          onClose={() => setAddModalOpen(false)}
          refreshSalaries={fetchSalaries}
          darkMode={darkMode}
        />
      )}
      {isEditModalOpen && selectedSalary && (
        <SalaryEdit
          isOpen={isEditModalOpen}
          onClose={() => setEditModalOpen(false)}
          salary={selectedSalary}
          refreshSalaries={fetchSalaries}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default SalaryList;