import React, { useState, useEffect } from 'react';
import '../styles/Products.css';
import { useNavigate, Link } from 'react-router-dom';
import Select from 'react-select';

const API_URL = 'https://raxwo-management.onrender.com/api/suppliers';

const CartForm = ({ supplier, closeModal, darkMode, refreshProducts }) => {
  const [items, setItems] = useState([{
    grnNumber: '',
    discountdescription: '',
    discountCharge: '',
  }]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();


  useEffect(() => {
      setItems([{
        grnNumber: '',
        discountdescription: '',
        discountCharge: '',
      }]);
    setMessage('');
    setError('');
    setIsSubmitted(false);
  }, []);

  // Extract unique GRN numbers from supplier's items
  const grnOptions = supplier?.items
    ? Array.from(new Set(supplier.items.map(item => item.grnNumber)))
        .filter(grn => grn) // Remove null/undefined
        .map(grn => ({ value: grn, label: grn }))
    : [];

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

    if (!items.grnNumber) {
      setError('Bill GRN no is required');
      setLoading(false);
      return false;
    }

    if (!items.discountCharge || Number(items.discountCharge) < 0) {
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
          discountCharge: Number(items.discountCharge) || 0,
          changedBy // Add changedBy to the request body
        };

        const url = `${API_URL}/${supplier._id}/discounts`;
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
          grnNumber: '',
          discountdescription: '',
          discountCharge: '',
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
        <h2 className="modal-title">Add Bill Discount</h2>
        {loading && <p className="loading">Adding Bill Discount...</p>}
        {error && <p className="error-message">{error}</p>}
        <form className="edit-product-form" onSubmit={handleSubmit}>          
            <div className="form-row">
              <div className="left-column">
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Bill Grn Number</label>
                <Select
                  id="grnNumber"
                  name="grnNumber"
                  value={items.grnNumber ? { value: items.grnNumber, label: items.grnNumber } : null}
                  onChange={(selectedOption) => {
                    setItems((prev) => ({
                      ...prev,
                      grnNumber: selectedOption ? selectedOption.value : '',
                    }));
                  }}
                  options={grnOptions}
                  isClearable
                  isSearchable
                  placeholder="Select or search GRN..."
                  className={`react-select-container ${darkMode ? 'dark' : ''}`}
                  classNamePrefix="react-select"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      backgroundColor: darkMode ? '#333' : 'white',
                      borderColor: state.isFocused ? (darkMode ? '#6c63ff' : '#007bff') : '#ccc',
                      boxShadow: state.isFocused ? `0 0 0 1px ${darkMode ? '#6c63ff' : '#007bff'}` : 'none',
                      '&:hover': {
                        borderColor: darkMode ? '#6c63ff' : '#007bff',
                      },
                      minHeight: '38px',
                      fontSize: '14px',
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: darkMode ? '#333' : 'white',
                      border: `1px solid ${darkMode ? '#444' : '#ccc'}`,
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                      zIndex: 1000,
                    }),
                    menuList: (base) => ({
                      ...base,
                      maxHeight: '200px',
                      '::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '::-webkit-scrollbar-track': {
                        background: darkMode ? '#2d2d2d' : '#f1f1f1',
                      },
                      '::-webkit-scrollbar-thumb': {
                        background: darkMode ? '#666' : '#ccc',
                        borderRadius: '3px',
                      },
                    }),
                    option: (base, { isFocused, isSelected }) => ({
                      ...base,
                      backgroundColor: isSelected
                        ? (darkMode ? '#6c63ff' : '#007bff')
                        : isFocused
                        ? (darkMode ? '#444' : '#e9ecef')
                        : 'transparent',
                      color: isSelected ? 'white' : darkMode ? 'white' : 'black',
                      ':active': {
                        backgroundColor: darkMode ? '#555' : '#0056b3',
                      },
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: darkMode ? 'white' : 'black',
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: darkMode ? '#aaa' : '#666',
                    }),
                    input: (base) => ({
                      ...base,
                      color: darkMode ? 'white' : 'black',
                    }),
                  }}
                />
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Discount Description</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="text"
                  name="discountdescription"
                  value={items.discountdescription}
                  onChange={handleItemChange}
                  required
                />
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Discount</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="text"
                  name="discountCharge"
                  value={items.discountCharge}
                  onChange={handleItemChange}
                  required
                />
              </div>
            </div>
          <div className="button-group">
            <button type="submit" className="pro-edit-submit-btn" disabled={loading}>
              {loading ? 'Saving...' : `Add Discount`}
            </button>
            <button type="button" className="A-l-cancel-btn" onClick={handleCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CartForm; 