import React, { useState, useEffect } from 'react';
import '../styles/Products.css';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = 'https://raxwo-management.onrender.com/api/suppliers';

const CartForm = ({ supplier, closeModal, darkMode, refreshProducts }) => {
  const [items, setItems] = useState([{
    paymentdescription: '',
    paymentCharge: '',
  }]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();


  useEffect(() => {
      setItems([{
        paymentdescription: '',
        paymentCharge: '',
      }]);
    setMessage('');
    setError('');
    setIsSubmitted(false);
  }, []);

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

    if (!items.paymentdescription) {
      setError('Payment Description is required');
      setLoading(false);
      return false;
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

        const url = `${API_URL}/${supplier._id}/pastpayments`;
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
        <h2 className="modal-title">Add Past Payment</h2>
        {loading && <p className="loading">Adding Past Payment...</p>}
        {error && <p className="error-message">{error}</p>}
        <form className="edit-product-form" onSubmit={handleSubmit}>          
            <div className="form-row">
              <div className="left-column">
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Payment Description</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="text"
                  name="paymentdescription"
                  value={items.paymentdescription}
                  onChange={handleItemChange}
                  required
                />
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Payment</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="number"
                  onWheel={(e) => e.target.blur()}
                  name="paymentCharge"
                  onFocus={(e) => e.target.select()}
                  value={items.paymentCharge}
                  onChange={handleItemChange}
                  required
                  min="0"
                />
              </div>
            </div>
          <div className="button-group">
            <button type="submit" className="pro-edit-submit-btn" disabled={loading}>
              {loading ? 'Saving...' : `Add Past Payment`}
            </button>
            <button type="button" className="A-l-cancel-btn" onClick={handleCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CartForm; 