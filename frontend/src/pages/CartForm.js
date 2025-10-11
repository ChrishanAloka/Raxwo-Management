import React, { useState, useEffect } from 'react';
// import '../styles/Products.css';
import { useNavigate, Link } from 'react-router-dom';
import Select from 'react-select';
import axios from 'axios';
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
  const [showCartView, setShowCartView] = useState(false); 
  const [itemNames, setItemNames] = useState([]);
  const [productStocks, setProductStocks] = useState({});
  const [stockLoading, setStockLoading] = useState(false);

  const CART_FORM_STORAGE_KEY = 'cartFormDraft';

  const token = localStorage.getItem('token');

  const fetchNames = async () => {
    setLoading(true);
    setError('');
    try {
      // const response = await fetch(`${API_URL}/${supplier._id}`, {
      // });

      const response = await fetch(`https://raxwo-management.onrender.com/api/product-uploads`, {
      });

      // const response = await axios.get('https://raxwo-management.onrender.com/api/products', {
      //   headers: {
      //     Authorization: `Bearer ${token}`,
      //   },
      // });
            
      if (!response.ok) {
        throw new Error(`Failed to fetch supplier items: ${response.statusText}`);
      }
      const data = await response.json();
      setItemNames(data.records || []);
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
      // Add mode: try to restore from localStorage
      const savedDraft = localStorage.getItem(CART_FORM_STORAGE_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setGrn(parsed.grn || '');
          setItems(parsed.items || [{
            itemName: '',
            category: '',
            stock: '',
            buyingPrice: '',
            sellingPrice: '',
            supplierName: supplier.supplierName || '',
          }]);
        } catch (e) {
          console.warn('Failed to parse saved cart draft', e);
          // fallback to empty
        }
      } else {
        // Fresh add
        setGrn('');
        setItems([{
          itemName: '',
          category: '',
          stock: '',
          buyingPrice: '',
          sellingPrice: '',
          supplierName: supplier.supplierName || '',
          returnstock: '0',
        }]);
      }
    }
    setMessage('');
    setError('');
    setIsSubmitted(false);
    fetchNames();
  }, [item, supplier]);

  // Auto-save draft when adding (not editing)
  useEffect(() => {
    if (!item) {
      // Only save if there's meaningful data
      const hasData = grn.trim() || items.some(i => 
        i.itemName.trim() || 
        i.category.trim() || 
        i.stock.trim() || 
        i.buyingPrice.trim()
      );

      if (hasData) {
        const draft = { grn, items };
        localStorage.setItem(CART_FORM_STORAGE_KEY, JSON.stringify(draft));
      } else {
        // Clear if empty
        localStorage.removeItem(CART_FORM_STORAGE_KEY);
      }
    }
  }, [grn, items, item]); // Only runs when these change
  

  useEffect(() => {
    const fetchLiveStock = async () => {
          if (!item?.itemCode) {
            setProductStocks(0);
            return;
          }
    
          setStockLoading(true);
          try {
            const response = await axios.get(
              `${PRODUCTS_API_URL}/${encodeURIComponent(item.itemCode)}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
    
            const product = response.data;
            setProductStocks(product.stock || 0);
          } catch (err) {
            console.error('Failed to fetch product stock:', err);
            setProductStocks(0);
            setError('Failed to load current stock. Please try again.');
          } finally {
            setStockLoading(false);
          }
        };
    
        fetchLiveStock();
      }, [item?.itemCode, token]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!item) {
        const hasData = grn.trim() || items.some(i => 
          i.itemName.trim() || 
          i.category.trim() || 
          i.stock.trim() || 
          i.buyingPrice.trim()
        );
        if (hasData) {
          e.preventDefault();
          e.returnValue = 'You have unsaved items. Are you sure you want to leave?';
          return e.returnValue;
        }
      }
    };

    if (!item) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [grn, items, item]);

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
        
        
        const url = item ? `${API_URL}/${supplier._id}/items/${item._id}` : `${API_URL}/${supplier._id}/items`;
        const method = item ? 'PATCH' : 'POST';
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${token}` },
          body: JSON.stringify(itemData),
        });


        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to ${item ? 'update' : 'add'} item ${i + 1}`);
        }

        const result = await response.json(); // Parse JSON response

        // ✅ Get the itemCode from the response
        const generatedItemCode = result.itemCode;
        const encodedItemCode = encodeURIComponent(generatedItemCode);

        const url2 = item ? `${PRODUCTS_API_URL}/update-stockitem/${encodedItemCode}` : `${PRODUCTS_API_URL}/update-stock/${encodedItemCode}`;
        const method2 = item ? 'PATCH' : 'POST';

        const productResponse = await fetch(url2, {
          method: method2,
          headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${token}` },
          body: JSON.stringify({
            newStock: itemData.quantity,
            newBuyingPrice: itemData.buyingPrice,
            newSellingPrice: itemData.sellingPrice,
            returnstock: parseInt(itemData.returnstock) || 0,
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
      // Inside handleSubmit, after success:
      localStorage.removeItem(CART_FORM_STORAGE_KEY); // ✅ Clear draft
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
    // localStorage.removeItem(CART_FORM_STORAGE_KEY); // ✅ Clear draft
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
    marginbottom: '20px',
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

  // Calculate totals for cart view
  const totalQuantity = items.reduce((sum, item) => sum + (parseInt(item.stock) || 0), 0);
  const totalCost = items.reduce((sum, item) => {
    const qty = parseInt(item.stock) || 0;
    const price = parseFloat(item.buyingPrice) || 0;
    return sum + qty * price;
  }, 0);
  
  const availableStock = productStocks || 0;

  return (
    <div className="view-modal-select">
      <div className="modal-content-select">
        <div className={`supplier-info-header ${darkMode ? 'dark' : ''}`} style={{
          backgroundColor: darkMode ? '#1F2A44' : '#f0f8ff',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: darkMode ? '1px solid #374151' : '1px solid #d1e7ff',
          textAlign: 'center'
        }}>
          <h3 style={{
            margin: '0',
            color: darkMode ? '#63b3ed' : '#0d6efd',
            fontSize: '1.2rem'
          }}>
            {supplier.businessName || supplier.supplierName || 'Unknown Supplier'}
          </h3>
          {supplier.supplierName && supplier.businessName && supplier.supplierName !== supplier.businessName && (
            <p style={{
              margin: '4px 0 0',
              color: darkMode ? '#a0aec0' : '#6c757d',
              fontSize: '0.9rem'
            }}>
              ({supplier.supplierName})
            </p>
          )}
          <h2 className="modal-title">{item ? '✏️ Edit Item' : '🛒 Add Items To Cart'}</h2>
        </div>
        
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
          
          {/* Scrollable container for items */}
        <div className="scrollable-items-container">
          {items.map((itemData, index) => (
            <div key={index} className="form-row">
              <div className="left-column">
                <h3 className={`ap-h3 ${darkMode ? 'dark' : ''}`}>Item {index + 1} Details</h3>
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Item Name</label>
                <div style={{marginBottom: "8px"}}>
                <CreatableSelect
                  isClearable
                  options={itemNameOptions}
                  value={itemData.itemName ? { label: itemData.itemName, value: itemData.itemName } : null}
                  onChange={(selected) => handleItemChange(index, 'itemName', selected ? selected.value : '')}
                  styles={getSelectStyles(darkMode)} // ← Apply custom styles
                />
                </div>

                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>
                  Category</label>
                <div style={{marginBottom: "8px"}}>
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
                  type="text"
                  value={itemData.stock}
                  onChange={(e) => handleItemChange(index, 'stock', e.target.value)}
                  required
                />
                {item && itemData.itemName && (
                  <div style={{ marginBottom: "8px", color: darkMode ? "#ccc" : "#666", fontSize: "14px" }}>
                    <strong>Available  Stock: </strong>
                    {stockLoading ? (
                      <span>Loading...</span>
                    ) : (
                      <span style={{ color: availableStock > 0 ? '#28a745' : '#e74c3c', fontWeight: 'bold' }}>
                        {availableStock}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="right-column">
                <h3 className={`ap-h3 ${darkMode ? 'dark' : ''}`}>Prices</h3>
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Buying Price</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="text"
                  value={itemData.buyingPrice}
                  onChange={(e) => handleItemChange(index, 'buyingPrice', e.target.value)}
                  required
                />
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Selling Price</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="text"
                  value={itemData.sellingPrice}
                  onChange={(e) => handleItemChange(index, 'sellingPrice', e.target.value)}
                  required
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
        </div>
          
          <div className="button-group">
            <button type="button" className="add-item-btn" onClick={addItem}>
              ➕ Add Another Item
            </button>
            {/* View Cart Button */}
            <button
              type="button"
              className="view-cart-btn"
              onClick={() => setShowCartView((prev) => !prev)}
            >
              {showCartView ? 'Hide Cart' : 'View Cart'}
            </button>
            <button type="submit" className="pro-edit-submit-btn" disabled={loading}>
              {loading ? 'Saving...' : item ? 'Update Item' : `Add ${items.length} Item${items.length > 1 ? 's' : ''}`}
            </button>
            <button type="button" className="A-l-cancel-btn" onClick={handleCancel}>Cancel</button>
          </div>
          {/* Cart Preview Section */}
          {showCartView && (
            <div
              className={`cart-preview-section ${darkMode ? 'dark' : ''}`}
              style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: darkMode ? '#1F2A44' : '#f9f9f9',
                border: darkMode ? '1px solid #374151' : '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            >
              <h3 style={{ marginBottom: '12px', color: darkMode ? '#fff' : '#000' }}>🛒 Current Cart Summary</h3>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '2px solid #1abc9c' }}>
                    <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Item</th>
                    <th style={{ textAlign: 'center', paddingBottom: '8px' }}>Qty</th>
                    <th style={{ textAlign: 'right', paddingBottom: '8px' }}>Unit Price</th>
                    <th style={{ textAlign: 'right', paddingBottom: '8px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const qty = parseInt(item.stock) || 0;
                    const price = parseFloat(item.buyingPrice) || 0;
                    const total = qty * price;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px 0' }}>{item.itemName || 'Unnamed Item'}</td>
                        <td style={{ textAlign: 'center', padding: '8px 0' }}>{qty}</td>
                        <td style={{ textAlign: 'right', padding: '8px 0' }}>Rs. {price.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', padding: '8px 0', fontWeight: 'bold' }}>
                          Rs. {total.toFixed(2)}
                        </td> 
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="2"></td>
                    <td style={{ textAlign: 'right', paddingTop: '12px', fontWeight: 'bold' }}>Total:</td>
                    <td style={{ textAlign: 'right', paddingTop: '12px', fontWeight: 'bold', color: '#1abc9c' }}>
                     Rs. {totalCost.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="2"></td>
                    <td style={{ textAlign: 'right', fontSize: '12px', color: '#666' }}>Total Items:</td>
                    <td style={{ textAlign: 'right', fontSize: '12px', color: '#666' }}>{totalQuantity}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CartForm; 