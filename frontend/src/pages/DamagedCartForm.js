import React, { useState, useEffect } from 'react';
// import '../styles/Products.css';
import { useNavigate, Link } from 'react-router-dom';
import Select from 'react-select';
import axios from 'axios';
import CreatableSelect from 'react-select/creatable';

const PRODUCTS_API_URL = 'https://raxwo-management.onrender.com/api/products';

const CartForm = ({ supplier, item, closeModal, darkMode, refreshProducts }) => {
  const [grn, setGrn] = useState('');
  const [items, setItems] = useState([{
    itemName: '',
    category: '',
    stock: '', // original received quantity
    buyingPrice: '',
    sellingPrice: '',
    supplierName: '',
    returnstock: '0',
  }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); // renamed to avoid confusion
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [productStock, setProductStock] = useState(null); // live available stock
  const [productReturnStock, setProductReturnStock] = useState(null); // total returns already recorded
  const [productDamagedStock, setProductDamagedStock] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchLiveStock = async () => {
      if (!item?.itemCode) {
        setProductStock(0);
        setProductReturnStock(0);
        setProductDamagedStock(0);
        return;
      }

      setStockLoading(true);
      try {
        const response = await axios.get(
          `${PRODUCTS_API_URL}/${encodeURIComponent(item.itemCode)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const product = response.data;
        setProductStock(product.stock || 0);
        setProductReturnStock(product.returnstock || 0);
        setProductDamagedStock(product.damagedstock || 0);
      } catch (err) {
        console.error('Failed to fetch product stock:', err);
        setProductStock(0);
        setProductReturnStock(0);
        setProductDamagedStock(0);
        setError('Failed to load current stock. Please try again.');
      } finally {
        setStockLoading(false);
      }
    };

    fetchLiveStock();
  }, [item?.itemCode, token]);

  // Initialize form when item/supplier changes
  useEffect(() => {
    if (item) {
      setGrn(item.grnNumber || '');
      setItems([{
        itemName: item.itemName || '',
        category: item.category || '',
        stock: String(item.quantity || ''),
        buyingPrice: String(item.buyingPrice || ''),
        sellingPrice: String(item.sellingPrice || ''),
        supplierName: item.supplierName || supplier?.supplierName || '',
        returnstock: '0', // always start with 0 for new return
      }]);
    } else {
      setGrn('');
      setItems([{
        itemName: '',
        category: '',
        stock: '',
        buyingPrice: '',
        sellingPrice: '',
        supplierName: supplier?.supplierName || '',
        returnstock: '0',
      }]);
    }
    setError('');
    setIsSubmitted(false);
  }, [item, supplier]);

  const handleGrnChange = (e) => setGrn(e.target.value);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const validate = () => {
    const returnQty = Number(items[0].returnstock) || 0;
    const maxAllowed = productStock || 0;

    if (!grn.trim()) {
      setError('GRN is required');
      return false;
    }

    if (returnQty < 0) {
      setError('Return quantity cannot be negative');
      return false;
    }

    if (returnQty > maxAllowed) {
      setError(`Return quantity (${returnQty}) exceeds available stock (${maxAllowed})`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading || isSubmitted) return;

    if (!validate()) return;

    setLoading(true);
    setError('');
    
    try {
      // Get the current user's name from localStorage
      const changedBy = localStorage.getItem('username') || 'system';
      const itemData = items[0];

      await axios.patch(
        `${PRODUCTS_API_URL}/update-damagedstockitem/${encodeURIComponent(item.itemCode)}`,
        {
          damagedstock: parseInt(itemData.returnstock) || 0,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // if (!productResponse.ok) {
      //   const errorData = await productResponse.json();
      //   throw new Error(errorData.message || `Failed to update product stock for item`);
      // }

      if (refreshProducts) {
        refreshProducts();
      }
      closeModal();
      
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.response?.data?.message || 'Failed to process return. Please try again.');
    } finally {
      setLoading(false);
      setIsSubmitted(true);
    }
  };

  const handleCancel = () => {
    closeModal();
  };

  const returnQty = Number(items[0]?.returnstock) || 0;
  const availableStock = productStock || 0;

  return (
    <div className="view-modal-select">
      <div className="modal-content-select">
        <h2 className="modal-title">⚠️ Damaged Item</h2>

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
                readOnly
              />
            </div>
          </div>

          {items.map((itemData, index) => (
            <div key={index} className="form-row">
              <div className="left-column">
                <h3 className={`ap-h3 ${darkMode ? 'dark' : ''}`}>Item Details</h3>
                
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Item Name</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  value={itemData.itemName}
                  readOnly
                />

                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Category</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  value={itemData.category}
                  readOnly
                />

                {/* Live Stock Display */}
                <div style={{ marginBottom: '12px', fontSize: '14px', color: darkMode ? '#ccc' : '#666' }}>
                  <strong>Available Stock:</strong>{' '}
                  {stockLoading ? (
                    <span>Loading...</span>
                  ) : (
                    <span style={{ color: availableStock > 0 ? '#28a745' : '#e74c3c', fontWeight: 'bold' }}>
                      {availableStock}
                    </span>
                  )}
                  <br />
                  <strong>Already Returned:</strong>{' '}
                  <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                    {productReturnStock || 0}
                  </span>
                  <br />
                  <strong>Already Damaged:</strong>{' '}
                  <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                    {productDamagedStock || 0}
                  </span>
                </div>

                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Add to the Damaged Quantity</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="number"
                  min="0"
                  max={availableStock}
                  onWheel={(e) => e.target.blur()}
                  value={itemData.returnstock}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleItemChange(index, 'returnstock', e.target.value)}
                  placeholder="0"
                  required
                />
              </div>

              <div className="right-column">
                <h3 className={`ap-h3 ${darkMode ? 'dark' : ''}`}>Prices</h3>
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Buying Price</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  value={itemData.buyingPrice}
                  readOnly
                />
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Selling Price</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  value={itemData.sellingPrice}
                  readOnly
                />
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Supplier</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  value={itemData.supplierName}
                  readOnly
                />
              </div>
            </div>
          ))}

          <div className="button-group">
            <button
              type="submit"
              className="pro-edit-submit-btn"
              disabled={loading || stockLoading || returnQty === 0}
            >
              {loading ? 'Processing...' : 'Confirm Return'}
            </button>
            <button
              type="button"
              className="A-l-cancel-btn"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CartForm; 