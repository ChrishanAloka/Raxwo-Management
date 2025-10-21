import { useState, useEffect } from "react";
import axios from "axios";
import "../styles/SalaryAdd.css";

const API_URL = "https://raxwo-management.onrender.com/api/salaries";
const EMPLOYEE_API_URL = "https://raxwo-management.onrender.com/api/salaries/employee";

const SalaryAdd = ({ isOpen, onClose, refreshSalaries, darkMode }) => {
  const today = new Date().toISOString().split('T')[0]; // "2024-06-15"
  const [salary, setSalary] = useState({
    employeeId: "",
    employeeName: "",
    advance: "",
    remarks: "",
    paymentMethod: "",     // ← New
    assignedTo: "", 
    date: today,
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = async (e) => {
    const { name, value } = e.target;
    setSalary({ ...salary, [name]: value });

    if (name === "employeeId" && value) {
      try {
        const res = await axios.get(`${EMPLOYEE_API_URL}/${value}`);
        setSalary((prev) => ({ ...prev, employeeName: res.data.employeeName }));
        setError(null);
      } catch (err) {
        setSalary((prev) => ({ ...prev, employeeName: "" }));
        setError("Employee not found");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    // Client-side validation
    if (!salary.employeeId.trim()) {
      setError("Employee ID is required");
      setLoading(false);
      return;
    }
    if (!salary.employeeName.trim()) {
      setError("Employee not found for the provided ID");
      setLoading(false);
      return;
    }
    if (!salary.advance || Number(salary.advance) < 0) {
      setError("Advance must be a non-negative number");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');

    try {
      await axios.post(API_URL, {
        ...salary,
        advance: Number(salary.advance),
        date: salary.date,
      }, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      setMessage("✅ Salary added successfully!");
      setTimeout(() => {
        refreshSalaries();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Error adding salary");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`add-salary-container ${darkMode ? "dark" : ""}`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`salary-modal-title ${darkMode ? "dark" : ""}`}> Add Salary</h2>
        {loading && <p className="loading-message">Adding salary...</p>}
        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}
        <form className="add-salary-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="left-column">
              <h3 className={`as-h3 ${darkMode ? "dark" : ""}`}>Employee Details</h3>
              <label className={`add-salary-lbl ${darkMode ? "dark" : ""}`}>Employee ID</label>
              <input
                className={`add-salary-input ${darkMode ? "dark" : ""}`}
                type="text"
                name="employeeId"
                value={salary.employeeId}
                onChange={handleChange}
                required
              />
              <label className={`add-salary-lbl ${darkMode ? "dark" : ""}`}>Employee Name</label>
              <input
                className={`add-salary-input ${darkMode ? "dark" : ""}`}
                type="text"
                name="employeeName"
                value={salary.employeeName}
                readOnly
              />
              <label className={`add-salary-lbl ${darkMode ? "dark" : ""}`}>Date</label>
              <input
                className={`add-salary-input ${darkMode ? "dark" : ""}`}
                type="date"
                name="date"
                value={salary.date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="right-column">
              <h3 className={`as-h3 ${darkMode ? "dark" : ""}`}>Salary Details</h3>
              <label className={`add-salary-lbl ${darkMode ? "dark" : ""}`}>Advance (LKR)</label>
              <input
                className={`add-salary-input ${darkMode ? "dark" : ""}`}
                type="number"
                onWheel={(e) => e.target.blur()}
                name="advance"
                value={salary.advance}
                onChange={handleChange}
                onFocus={(e) => e.target.select()}
                required
                min="0"
                step="0.01"
              />
              {/* Payment Method */}
              <label className={`add-salary-lbl ${darkMode ? "dark" : ""}`}>Payment Method</label>
              <select
                className={`add-salary-input ${darkMode ? "dark" : ""}`}
                value={salary.paymentMethod}
                onChange={handleChange}
                name="paymentMethod"
                required
              >
                <option value="" disabled>Select Payment Method</option>
                <option className="drop" value="Cash">Cash</option>
                <option className="drop" value="Card">Card</option>
                <option className="drop" value="Bank-Transfer">Bank Transfer</option>
                <option className="drop" value="Bank-Check">Bank Check</option>
                <option className="drop" value="Credit">Credit</option>
              </select>

              {/* Assign To */}
              {/* <label className={`add-salary-lbl ${darkMode ? "dark" : ""}`}>Assign To</label>
              <select
                className={`add-salary-input ${darkMode ? "dark" : ""}`}
                value={salary.assignedTo}
                onChange={handleChange}
                name="assignedTo"
                required
              >
                <option value="" disabled>Select Assignee</option>
                <option value="Prabath">Prabath</option>
                <option value="Nadeesh">Nadeesh</option>
                <option value="Accessories">Accessories</option>
                <option value="Genex-EX">Genex EX</option>
                <option value="I-Device">I Device</option>
              </select> */}
              <label className={`add-salary-lbl ${darkMode ? "dark" : ""}`}>Remarks</label>
              <input
                className={`add-salary-input ${darkMode ? "dark" : ""}`}
                type="text"
                name="remarks"
                value={salary.remarks}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="button-group">
            <button type="submit" className="a-s-submit-btn" disabled={loading}>
              {loading ? "Adding..." : "Add Salary"}
            </button>
            <button type="button" className="a-s-cancel-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalaryAdd;