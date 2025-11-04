import React, { useState, useEffect } from "react";
import '../styles/MaintenanceEdit.css';
import Select from 'react-select/creatable';

const API_URL = "https://raxwo-management.onrender.com/api/maintenance";

const MaintenanceEdit = ({ record, onClose, onUpdate, darkMode }) => {
  const [editedRecord, setEditedRecord] = useState({ ...record });
  const [error, setError] = useState(null);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Helper to format time to HH:mm for input[type="time"]
    const formatTimeForInput = (timeString) => {
      if (!timeString) return "";
      const date = new Date();
      const time = new Date(`2000-01-01 ${timeString}`);
      if (isNaN(time)) return "";
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    // Get current time in HH:mm format
    const getCurrentTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    setEditedRecord(prev => ({
      ...prev,
      date: prev.date || new Date().toISOString().split("T")[0],
      time: prev.time ? formatTimeForInput(prev.time) : getCurrentTime(),
      paymentMethod: prev.paymentMethod || "",
      assignedTo: prev.assignedTo || "",
    }));
  }, [record]);

  useEffect(() => {
    const fetchServiceTypes = async () => {
       setLoading(true);
      try {
        const response = await fetch(`${API_URL}`);
        if (!response.ok) throw new Error('Failed to fetch records');
        const records = await response.json();
        const uniqueTypes = [...new Set(records.map(r => r.serviceType).filter(Boolean))];
        setServiceTypes(uniqueTypes.map(type => ({ value: type, label: type })));
      } catch (err) {
        console.error('Error fetching service types:', err);
      } finally {
        setLoading(false); // ← End loading
      }
    };
    fetchServiceTypes();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/${editedRecord._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json","Authorization": `Bearer ${token}` },
        body: JSON.stringify(editedRecord),
      });
      if (!response.ok) throw new Error("Error updating Bills and Other Expences record");
      onUpdate();
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false); // ← Stop loading
    }
  };

  return (
    <div className="m-e-modal-overlay" onClick={onClose}>
      <div className={`m-e-modal-container ${darkMode ? "dark" : ""}`} onClick={(e) => e.stopPropagation()}>
        <h3 className={`m-e-title ${darkMode ? "dark" : ""}`} >Edit Bills and Other Expences Record</h3>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleUpdate}>
          <label className={`me-lable ${darkMode ? "dark" : ""}`}>Date</label>
          <input
            type="date"
            className={`me-input ${darkMode ? "dark" : ""}`}
            value={editedRecord.date}
            onChange={(e) => setEditedRecord({ ...editedRecord, date: e.target.value })}
            required
          />
          <label className={`me-lable ${darkMode ? "dark" : ""}`}>Time</label>
          <input
            type="time"
            className={`me-input ${darkMode ? "dark" : ""}`}
            value={editedRecord.time}
            onChange={(e) => setEditedRecord({ ...editedRecord, time: e.target.value })}
            required
          />
          <label className={`me-lable ${darkMode ? "dark" : ""}`}>Service Type</label>
          <Select
            isClearable
            options={serviceTypes}
            value={editedRecord.serviceType ? { value: editedRecord.serviceType, label: editedRecord.serviceType } : null}
            onChange={(selected) => setEditedRecord({ ...editedRecord, serviceType: selected ? selected.value : '' })}
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
          <label className={`me-lable ${darkMode ? "dark" : ""}`}>Price</label>
          <input
            type="number"
            className={`me-input ${darkMode ? "dark" : ""}`}
            value={editedRecord.price}
            onFocus={(e) => e.target.select()}
            onWheel={(e) => e.target.blur()}
            onChange={(e) => setEditedRecord({ ...editedRecord, price: e.target.value })}
            required
          />
          {/* Payment Method */}
          <label className={`me-lable ${darkMode ? "dark" : ""}`}>Payment Method</label>
          <select
            className={`me-input ${darkMode ? "dark" : ""}`}
            value={editedRecord.paymentMethod || ""}
            onChange={(e) => setEditedRecord({ ...editedRecord, paymentMethod: e.target.value })}
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
          {/* <label className={`me-lable ${darkMode ? "dark" : ""}`}>Assign To</label>
          <select
            className={`me-input ${darkMode ? "dark" : ""}`}
            value={editedRecord.assignedTo || ""}
            onChange={(e) => setEditedRecord({ ...editedRecord, assignedTo: e.target.value })}
            required
          >
            <option value="" disabled>Select Assignee</option>
            <option value="Prabath">Prabath</option>
            <option value="Nadeesh">Nadeesh</option>
            <option value="Accessories">Accessories</option>
            <option value="Genex-EX">Genex EX</option>
            <option value="I-Device">I Device</option>
          </select> */}
          <label className={`me-lable ${darkMode ? "dark" : ""}`}>Remarks</label>
          <input
            type="text"
            className={`me-input ${darkMode ? "dark" : ""}`}
            value={editedRecord.remarks}
            onChange={(e) => setEditedRecord({ ...editedRecord, remarks: e.target.value })}
          />
          <div className="button-group">
            <button type="submit" className="m-e-update">Update</button>
            <button type="button" onClick={onClose} className="m-e-cancel">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceEdit;