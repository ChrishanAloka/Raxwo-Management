import React, { useState, useEffect } from 'react';
import '../styles/Products.css';
import { useNavigate, Link } from 'react-router-dom';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

const API_URL = 'https://raxwo-management.onrender.com/api/suppliers';
const PRODUCTS_API_URL = 'https://raxwo-management.onrender.com/api/products';

const CartForm = ({ supplier, item, closeModal, darkMode, refreshProducts }) => {
  const [grn, setGrn] = useState('');
  const [items, setItems] = useState([{
    itemName: '',
    category: '',
    stock: '',
    buyingPrice: '',
    sellingPrice: '',
    supplierName: '',
  }]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();
  const [itemNames, setItemNames] = useState([]);

  const fetchNames = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/${supplier._id}`, {
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch supplier items: ${response.statusText}`);
      }
      const data = await response.json();
      setItemNames(data.items || []);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching items');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (item) {
      setGrn(item.grnNumber || '');
      setItems([{
        itemName: item.itemName || '',
        category: item.category || '',
        stock: item.quantity?.toString() || '',
        buyingPrice: item.buyingPrice?.toString() || '',
        sellingPrice: item.sellingPrice?.toString() || '',
        supplierName: item.supplierName || supplier.supplierName || '',
      }]);
    } else {
      setGrn('');
      setItems([{
        itemName: '',
        category: '',
        stock: '',
        buyingPrice: '',
        sellingPrice: '',
        supplierName: supplier.supplierName || '',
      }]);
    }
    setMessage('');
    setError('');
    setIsSubmitted(false);
    fetchNames();
  }, [item, supplier]);

  const handleGrnChange = (e) => {
    setGrn(e.target.value);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    setItems(updatedItems);
  };

  const addItem = () => {
    setItems([...items, {
      itemName: '',
      category: '',
      stock: '',
      buyingPrice: '',
      sellingPrice: '',
      supplierName: supplier.supplierName || '',
    }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      const updatedItems = items.filter((_, i) => i !== index);
      setItems(updatedItems);
    }
  };

  const validateItems = () => {
    if (!grn.trim()) {
      setError('GRN is required');
      return false;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.itemName.trim()) {
        setError(`Item Name is required for item ${i + 1}`);
        return false;
      }
      if (!item.category.trim()) {
        setError(`Category is required for item ${i + 1}`);
        return false;
      }
      if (!item.stock || Number(item.stock) < 0) {
        setError(`Stock must be a non-negative number for item ${i + 1}`);
        return false;
      }
      if (!item.buyingPrice || Number(item.buyingPrice) < 0) {
        setError(`Buying Price must be a non-negative number for item ${i + 1}`);
        return false;
      }
      if (!item.sellingPrice || Number(item.sellingPrice) < 0) {
        setError(`Selling Price must be a non-negative number for item ${i + 1}`);
        return false;
      }
      if (!item.supplierName.trim()) {
        setError(`Supplier Name is required for item ${i + 1}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitted(true);
    setLoading(true);
    setMessage('');
    setError('');

    if (!validateItems()) {
      setLoading(false);
      setIsSubmitted(false);
      return;
    }

    try {
      // Get the current user's name from localStorage
      const changedBy = localStorage.getItem('username') || 'system';
      // Process each item
      for (let i = 0; i < items.length; i++) {
        const itemData = {
          itemCode: item ? item.itemCode : grn,
          ...items[i],
          grnNumber: grn,
          quantity: parseInt(items[i].stock) || 0,
          buyingPrice: Number(items[i].buyingPrice) || 0,
          sellingPrice: Number(items[i].sellingPrice) || 0,
          changedBy // Add changedBy to the request body
        };

        const url = item ? `${API_URL}/${supplier._id}/items/${item.index}` : `${API_URL}/${supplier._id}/items`;
        const method = item ? 'PATCH' : 'POST';
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to ${item ? 'update' : 'add'} item ${i + 1}`);
        }

        const result = await response.json(); // Parse JSON response

        // ✅ Get the itemCode from the response
        const generatedItemCode = result.itemCode;

        const productResponse = await fetch(`${PRODUCTS_API_URL}/update-stock/${generatedItemCode}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newStock: itemData.quantity,
            newBuyingPrice: itemData.buyingPrice,
            newSellingPrice: itemData.sellingPrice,
            itemName: itemData.itemName,
            category: itemData.category,
            grnNumber: itemData.itemCode,
            supplierName: supplier.supplierName,
          }),
        });

        if (!productResponse.ok) {
          const errorData = await productResponse.json();
          throw new Error(errorData.message || `Failed to update product stock for item ${i + 1}`);
        }
      }

      if (refreshProducts) {
        refreshProducts();
      }

      if (!item) {
        setGrn('');
        setItems([{
          itemName: '',
          category: '',
          stock: '',
          buyingPrice: '',
          sellingPrice: '',
          supplierName: supplier.supplierName || '',
        }]);
      }

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

  const formatOptions = (arr, labelKey = 'label', valueKey = 'value') => {
    return arr.map((item) =>
      typeof item === 'string'
        ? { label: item, value: item }
        : { label: item[labelKey], value: item[valueKey] || item[labelKey] }
    );
  };

  const itemNameOptions = formatOptions(itemNames, 'itemName', 'itemName');
  const categoryOptions = formatOptions([...new Set(itemNames.map(i => i.category))]);

  const uniqueCategories = [...new Set(itemNames.map(item => item.category))];

  const getSelectStyles = (darkMode) => ({
  control: (provided, state) => ({
    ...provided,
    width: '100%',
    padding: '0',
    fontSize: '1rem',
    fontFamily: 'Inter, sans-serif',
    backgroundColor: darkMode ? '#1F2A44' : '#ffffff',
    borderColor: state.isFocused ? '#1abc9c' : '#ccc',
    borderWidth: '1px',
    borderRadius: '8px',
    boxShadow: state.isFocused ? '0 0 8px rgba(26, 188, 156, 0.3)' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#1abc9c' : '#999'
    },
    height: '48px',
    minHeight: '48px'
  }),
  input: (provided) => ({
    ...provided,
    color: darkMode ? '#E5E7EB' : '#333'
  }),
  singleValue: (provided) => ({
    ...provided,
    color: darkMode ? '#E5E7EB' : '#333'
  }),
  placeholder: (provided) => ({
    ...provided,
    color: darkMode ? '#9ca3af' : '#6b7280'
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 1000,
    backgroundColor: darkMode ? '#1F2A44' : '#ffffff',
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused
      ? '#1abc9c'
      : state.isSelected
      ? '#000000'
      : 'transparent',
    color: state.isFocused || state.isSelected ? '#ffffff' : darkMode ? '#E5E7EB' : '#333',
    '&:hover': {
      backgroundColor: '#1abc9c',
      color: '#fff'
    }
  }),
  indicatorsContainer: () => ({
    display: 'flex',
    paddingRight: '8px'
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: darkMode ? '#9ca3af' : '#6b7280',
    '&:hover': {
      color: '#1abc9c'
    }
  }),
  clearIndicator: (provided) => ({
    ...provided,
    color: darkMode ? '#9ca3af' : '#6b7280',
    '&:hover': {
      color: '#e74c3c'
    }
  })
});
  

  return (
    <div className="modal-overlay">
      <div className={`pro-edit-modal-container ${darkMode ? 'dark' : ''}`}>
        <h2 className="modal-title">{item ? '✏️ Edit Item' : '🛒 Add Items To Cart'}</h2>
        {loading && <p className="loading">{item ? 'Updating' : 'Adding'} items...</p>}
        {error && <p className="error-message">{error}</p>}
        <form className="edit-product-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="left-column">
              <h3 className={`ap-h3 ${darkMode ? 'dark' : ''}`}>GRN Details</h3>
              <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>GRN</label>
              <input
                className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                type="text"
                value={grn}
                onChange={handleGrnChange}
                required
              />
            </div>
          </div>
          
          {items.map((itemData, index) => (
            <div key={index} className="form-row">
              <div className="left-column">
                <h3 className={`ap-h3 ${darkMode ? 'dark' : ''}`}>Item {index + 1} Details</h3>
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Item Name</label>
                <div>
                <CreatableSelect
                  isClearable
                  options={itemNameOptions}
                  value={itemData.itemName ? { label: itemData.itemName, value: itemData.itemName } : null}
                  onChange={(selected) => handleItemChange(index, 'itemName', selected ? selected.value : '')}
                  styles={getSelectStyles(darkMode)} // ← Apply custom styles
                />
                </div>

                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Category</label>
                <div>
                <CreatableSelect
                  isClearable
                  options={categoryOptions}
                  value={itemData.category ? { label: itemData.category, value: itemData.category } : null}
                  onChange={(selected) => handleItemChange(index, 'category', selected ? selected.value : '')}
                  styles={getSelectStyles(darkMode)} // ← Apply custom styles
                />
                </div>
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Stock</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="number"
                  value={itemData.stock}
                  onChange={(e) => handleItemChange(index, 'stock', e.target.value)}
                  required
                  min="0"
                />
              </div>
              <div className="right-column">
                <h3 className={`ap-h3 ${darkMode ? 'dark' : ''}`}>Prices</h3>
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Buying Price</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="number"
                  value={itemData.buyingPrice}
                  onChange={(e) => handleItemChange(index, 'buyingPrice', e.target.value)}
                  required
                  min="0"
                  step="0.01"
                />
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Selling Price</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="number"
                  value={itemData.sellingPrice}
                  onChange={(e) => handleItemChange(index, 'sellingPrice', e.target.value)}
                  required
                  min="0"
                  step="0.01"
                />
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Supplier</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="text"
                  value={itemData.supplierName ? itemData.supplierName : supplier.supplierName}
                  onChange={(e) => handleItemChange(index, 'supplierName', e.target.value)}
                  required
                  readOnly
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    className="remove-item-btn"
                    onClick={() => removeItem(index)}
                  >
                    Remove Item
                  </button>
                )}
              </div>
            </div>
          ))}
          
          <div className="button-group">
            <button type="button" className="add-item-btn" onClick={addItem}>
              ➕ Add Another Item
            </button>
            <button type="submit" className="pro-edit-submit-btn" disabled={loading}>
              {loading ? 'Saving...' : item ? 'Update Item' : `Add ${items.length} Item${items.length > 1 ? 's' : ''}`}
            </button>
            <button type="button" className="A-l-cancel-btn" onClick={handleCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CartForm; 