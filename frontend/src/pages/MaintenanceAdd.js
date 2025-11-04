import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import '../styles/MaintenanceAdd.css';
import Select from 'react-select/creatable';
import { useEffect } from 'react';

const API_URL = "https://raxwo-management.onrender.com/api/maintenance";

const getCurrentDate = () => new Date().toISOString().split("T")[0];
const getCurrentTime = () => new Date().toLocaleTimeString();

const MaintenanceAdd = ({ onClose, onUpdate, darkMode }) => {
  const [serviceType, setServiceType] = useState("");
  const [price, setPrice] = useState("");
  const [remarks, setRemarks] = useState("");
  const [date, setDate] = useState(getCurrentDate());
  const [time, setTime] = useState(getCurrentTime());
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingservice, setLoadingService] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchServiceTypes = async () => {
      setLoadingService(true); // ← Start loading
      try {
        const response = await fetch(`${API_URL}`);
        if (!response.ok) throw new Error('Failed to fetch records');
        const records = await response.json();
        const uniqueTypes = [...new Set(records.map(r => r.serviceType).filter(Boolean))];
        setServiceTypes(uniqueTypes.map(type => ({ value: type, label: type })));
      } catch (err) {
        console.error('Error fetching service types:', err);
      } finally {
        setLoadingService(false); // ← End loading
      }
    };
    fetchServiceTypes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ serviceType, price, remarks, date, time, paymentMethod, assignedTo, }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Error adding Bills and Other Expences record");

      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error adding Bills and Other Expences record:", error);
      setError(error.message);
    } finally {
      setLoading(false); // ← Stop loading
    }
  };

  return (
    <div className={`m-a-modal-overlay ${darkMode ? "dark" : ""}`} onClick={onClose}>
      <div className={`m-a-modal-container ${darkMode ? "dark" : ""}`} onClick={(e) => e.stopPropagation()}>
        <h3 className={`m-a-modal-title ${darkMode ? "dark" : ""}`} onClick={(e) => e.stopPropagation()}>Add Bills and Other Expences Record</h3>
        {error && <p className="error-message">{error}</p>}
        {(loading && loadingservice) && (
          <div className="loading-overlay">
            <div className="spinner"></div>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <label className={`madd-label ${darkMode ? "dark" : ""}`}>Date</label>
          <input
            className={`madd-input ${darkMode ? "dark" : ""}`}
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <label className={`madd-label ${darkMode ? "dark" : ""}`}>Time</label>
          <input
            className={`madd-input ${darkMode ? "dark" : ""}`}
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
          />
          <label className={`madd-label ${darkMode ? "dark" : ""}`}>Service Type</label>
          <Select
            isClearable
            options={serviceTypes}
            value={serviceType ? { value: serviceType, label: serviceType } : null}
            onChange={(selected) => setServiceType(selected ? selected.value : '')}
            placeholder="Select or create service type..."
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
            required
          />
          <label className={`madd-label ${darkMode ? "dark" : ""}`}>Price</label>
          <input
            className={`madd-input ${darkMode ? "dark" : ""}`}
            type="number"
            value={price}
            onFocus={(e) => e.target.select()}
            onWheel={(e) => e.target.blur()}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          {/* Payment Method */}
          <label className={`madd-label ${darkMode ? "dark" : ""}`}>Payment Method</label>
          <select
            className={`madd-input ${darkMode ? "dark" : ""}`}
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

          {/* Assign To */}
          {/* <label className={`madd-label ${darkMode ? "dark" : ""}`}>Assign To</label>
          <select
            className={`madd-input ${darkMode ? "dark" : ""}`}
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
          </select> */}
          <label className={`madd-label ${darkMode ? "dark" : ""}`}>Remarks</label>
          <input
            className={`madd-input ${darkMode ? "dark" : ""}`}
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
          <div className="button-group">
            <button type="submit" className="me-submit-btn" disabled={(loading || loadingservice)}>
              {loadingservice ? "Loading..." : loading ? "Submitting..." : "Submit"}
            </button>
            <button type="button" className="me-cancel-btn" onClick={onClose} disabled={(loading)}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceAdd;