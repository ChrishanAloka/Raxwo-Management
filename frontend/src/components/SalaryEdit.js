import { useState, useEffect } from "react";
import axios from "axios";
import "../styles/SalaryEdit.css";

const API_URL = "https://raxwo-management.onrender.com/api/salaries";
const EMPLOYEE_API_URL = "https://raxwo-management.onrender.com/api/salaries/employee";

const SalaryEdit = ({ isOpen, onClose, salary, refreshSalaries, darkMode }) => {
  const [formData, setFormData] = useState({
    employeeId: salary.employeeId,
    employeeName: salary.employeeName,
    advance: salary.advance,
    remarks: salary.remarks,
    paymentMethod: salary.paymentMethod || "",   // ← Add with fallback
    assignedTo: salary.assignedTo || "", 
  });
  const [error, setError] = useState(null);

  const handleChange = async (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "employeeId" && value) {
      try {
        const res = await axios.get(`${EMPLOYEE_API_URL}/${value}`);
        setFormData((prev) => ({ ...prev, employeeName: res.data.employeeName }));
        setError(null);
      } catch (err) {
        setFormData((prev) => ({ ...prev, employeeName: "" }));
        setError("Employee not found");
      }
    }
  };

  useEffect(() => {
    setFormData({
      employeeId: salary.employeeId,
      employeeName: salary.employeeName,
      advance: salary.advance,
      remarks: salary.remarks,
      paymentMethod: salary.paymentMethod || "",
      assignedTo: salary.assignedTo || "",
    });
  }, [salary]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_URL}/${salary._id}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      } ,formData);
      alert("Salary updated successfully");
      refreshSalaries();
      onClose();
    } catch (err) {
      alert("Error updating salary: " + err.response?.data?.message || err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`salary-add-modal-container ${darkMode ? "dark" : ""}`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`modal-title ${darkMode ? "dark" : ""}`}>Edit Salary</h2>
        {error && <p className="error-message">{error}</p>}
        <form className="add-salary-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="left-column">
              <label className={`salary-add-label ${darkMode ? "dark" : ""}`}>Employee ID</label>
              <input
                className={`salary-add-input ${darkMode ? "dark" : ""}`}
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                required
              />
              <label className={`salary-add-label ${darkMode ? "dark" : ""}`}>Employee Name</label>
              <input
                className={`salary-add-input ${darkMode ? "dark" : ""}`}
                type="text"
                name="employeeName"
                value={formData.employeeName}
                readOnly
              />
            </div>
            <div className="right-column">
              <label className={`salary-add-label ${darkMode ? "dark" : ""}`}>Advance (LKR)</label>
              <input
                className={`salary-add-input ${darkMode ? "dark" : ""}`}
                type="number"
                onWheel={(e) => e.target.blur()}
                onFocus={(e) => e.target.select()}
                name="advance"
                value={formData.advance}
                onChange={handleChange}
                required
                min="0"
              />
              {/* Payment Method */}
              <label className={`salary-add-label ${darkMode ? "dark" : ""}`}>Payment Method</label>
              <select
                className={`salary-add-input ${darkMode ? "dark" : ""}`}
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
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
              {/* <label className={`salary-add-label ${darkMode ? "dark" : ""}`}>Assign To</label>
              <select
                className={`salary-add-input ${darkMode ? "dark" : ""}`}
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Select Assignee</option>
                <option value="Prabath">Prabath</option>
                <option value="Nadeesh">Nadeesh</option>
                <option value="Accessories">Accessories</option>
                <option value="Genex-EX">Genex EX</option>
                <option value="I-Device">I Device</option>
              </select> */}
              <label className={`salary-add-label ${darkMode ? "dark" : ""}`}>Remarks</label>
              <input
                className={`salary-add-input ${darkMode ? "dark" : ""}`}
                type="text"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="button-group">
            <button type="submit" className="salary-add-submit-btn">Update</button>
            <button type="button" className="salary-add-cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalaryEdit;