import React, { useState, useEffect } from 'react';
import '../styles/Products.css';
import { useNavigate, Link } from 'react-router-dom';


// ✅ Change this to your actual Repair API base URL
const REPAIR_API_URL = 'https://raxwo-management.onrender.com/api/productsRepair'; // ← Confirm this endpoint
const API_URL = 'https://raxwo-management.onrender.com/api/suppliers';

const CartForm = ({ supplier, closeModal, darkMode, refreshProducts }) => {
  const [items, setItems] = useState([{
    jobNumber: '',
    repairDevice: '',
    serielNo: '',
    deviceIssue: '',
    paymentdescription: '',
    paymentCharge: '',
  }]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fetchingRepair, setFetchingRepair] = useState(false);
  const navigate = useNavigate();


  useEffect(() => {
      setItems([{
        jobNumber: '',
        repairDevice: '',
        serielNo: '',
        deviceIssue: '',
        paymentdescription: '',
        paymentCharge: '',
      }]);
    setMessage('');
    setError('');
    setIsSubmitted(false);
  }, []);

  // 🔍 Auto-fetch repair data when jobNumber is entered
  useEffect(() => {
    const fetchRepairByJobNumber = async () => {
      if (!items.jobNumber?.trim()) return;

      setFetchingRepair(true);
      setError('');
      try {
        const response = await fetch(`${REPAIR_API_URL}/job/${items.jobNumber}`);
        if (response.ok) {
          const repair = await response.json();

          // ✅ Auto-fill fields from repair data
          setItems((prev) => ({
            ...prev,
            repairDevice: repair.deviceType || repair.device || '', // adjust field name
            serialNo: repair.serialNumber || repair.serial_number || '',
            deviceIssue: repair.issueDescription || repair.deviceIssue || '',
          }));
        } else if (response.status === 404) {
          // Clear fields if job number not found
          setItems((prev) => ({
            ...prev,
            repairDevice: '',
            serialNo: '',
            deviceIssue: '',
          }));
        }
      } catch (err) {
        console.error('Failed to fetch repair:', err);
        // Don't block form — just continue with manual input
      } finally {
        setFetchingRepair(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchRepairByJobNumber();
    }, 500); // Debounce: wait 500ms after typing stops

    return () => clearTimeout(delayDebounce);
  }, [items.jobNumber]);

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setItems((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitted(true);
    setLoading(true);
    setMessage('');
    setError('');

    if (!items.jobNumber){

      if (!items.repairDevice && !items.deviceIssue) {
        setError('Device Type and Device Issue is required');
        setLoading(false);
        return false;
      }
    }

    if (!items.paymentCharge || Number(items.paymentCharge) < 0) {
        setError(`Payment Charge must be a non-negative number`);
        setLoading(false);
        return false;
    }
    const token = localStorage.getItem('token');
    try {
      // Get the current user's name from localStorage
      const changedBy = localStorage.getItem('username') || 'system';
      
        const itemData = {
          ...items,
          paymentCharge: Number(items.paymentCharge) || 0,
          changedBy // Add changedBy to the request body
        };

        const url = `${API_URL}/${supplier._id}/repairService`;
        const method = 'POST';
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${token}` },
          body: JSON.stringify(itemData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to add past charge`);
        }

        const result = await response.json(); // Parse JSON response

      if (refreshProducts) {
        refreshProducts();
      }

        setItems([{
          jobNumber: '',
          repairDevice: '',
          serielNo: '',
          deviceIssue: '',
          paymentdescription: '',
          paymentCharge: '',
        }]);
      

      setMessage('');
      setError('');
      setTimeout(() => {
        closeModal();
      }, 1000);
    } catch (err) {
      setError(err.message);
      setIsSubmitted(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setLoading(false);
    setIsSubmitted(false);
    setMessage('');
    setError('');
    closeModal();
  };
  
  return (
    <div className="modal-overlay">
      <div className={`pro-edit-modal-container ${darkMode ? 'dark' : ''}`}>
        <h2 className="modal-title">Add Repair Service</h2>
        {loading && <p className="loading">Adding Repair Service...</p>}
        {error && <p className="error-message">{error}</p>}
        <form className="edit-product-form" onSubmit={handleSubmit}>          
            <div className="form-row">
              <div className="left-column">
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Job Number</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="text"
                  name="jobNumber"
                  value={items.jobNumber}
                  onChange={handleItemChange}
                  
                />
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Device Type *</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="text"
                  name="repairDevice"
                  value={items.repairDevice}
                  onChange={handleItemChange}
                  required
                />
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Seriel No</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="text"
                  name="serielNo"
                  value={items.serielNo}
                  onChange={handleItemChange}
                  
                />
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Device Issue *</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="text"
                  name="deviceIssue"
                  value={items.deviceIssue}
                  onChange={handleItemChange}
                  required
                />
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Payment Description</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="text"
                  name="paymentdescription"
                  value={items.paymentdescription}
                  onChange={handleItemChange}
                  
                />
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Payment *</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="number"
                  name="paymentCharge"
                  value={items.paymentCharge}
                  onFocus={(e) => e.target.select()}
                  onChange={handleItemChange}
                  onWheel={(e) => e.target.blur()}
                  required
                  min="0"
                />
              </div>
            </div>
          <div className="button-group">
            <button type="submit" className="pro-edit-submit-btn" disabled={loading}>
              {loading ? 'Saving...' : `Add Repair Service`}
            </button>
            <button type="button" className="A-l-cancel-btn" onClick={handleCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CartForm; 