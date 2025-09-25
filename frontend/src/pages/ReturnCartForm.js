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
    stock: '',
    buyingPrice: '',
    sellingPrice: '',
    supplierName: '',
    returnstock: '',
  }]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();
  const [showCartView, setShowCartView] = useState(false); 
  const [itemNames, setItemNames] = useState([]);
  const [returnStocks, setReturnStocks] = useState({});
  const [productStocks, setProductStocks] = useState({});

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
  
  const fetchReturnStock = async (itemCode) => {
    try {
      const response = await fetch(`https://raxwo-management.onrender.com/api/products/${encodeURIComponent(itemCode)}`);
      if (!response.ok) {
        console.warn(`Product ${itemCode} not found`);
        return 0;
      }
      const product = await response.json();
      return product.returnstock || 0;
    } catch (err) {
      console.error(`Error fetching return stock for ${itemCode}:`, err);
      return 0;
    }
  };

  const fetchProductStock = async (itemCode) => {
    try {
      const response = await fetch(`${PRODUCTS_API_URL}/${encodeURIComponent(itemCode)}`);
      if (!response.ok) {
        console.warn(`Product ${itemCode} not found`);
        return 0;
      }
      const product = await response.json();
      return product.stock || 0;
    } catch (err) {
      console.error(`Error fetching stock for ${itemCode}:`, err);
      return 0;
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
        returnstock: item.returnstock?.toString() || '0',
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
        returnstock: '0',
      }]);
    }
    setMessage('');
    setError('');
    setIsSubmitted(false);
    fetchNames();
  }, [item, supplier]);

  useEffect(() => {
    const loadReturnStocks = async () => {
      const stocks = {};
      const avlstocks = {};
      for (const item of items) {
        if (item.itemName) {
          // Try to find itemCode from itemNames array
          const matchedItem = itemNames.find(i => i.itemName === item.itemName);
          const itemCode = matchedItem?.itemCode;
          if (itemCode) {
            stocks[itemCode] = await fetchReturnStock(itemCode);
            avlstocks[itemCode] = await fetchProductStock(itemCode);
          }
        }
      }
      setReturnStocks(stocks);
      setProductStocks(avlstocks);
    };

    if (items.length > 0 && itemNames.length > 0) {
      loadReturnStocks();
    }
  }, [items, itemNames]);

  const handleGrnChange = (e) => {
    setGrn(e.target.value);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    setItems(updatedItems);
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
      // ✅ Validate returnstock
      const returnstock = Number(item.returnstock) || 0;
      if (returnstock < 0) {
        setError(`Return Stock must be a non-negative number for item ${i + 1}`);
        return false;
      }

      // ✅ Get current stock
      const matchedItem = itemNames.find(i => i.itemName === item.itemName);
      const itemCode = matchedItem?.itemCode;
      const currentStock = itemCode ? (productStocks[itemCode] || 0) : 0;

      if (returnstock > currentStock) {
        setError(`Return Stock for "${item.itemName}" cannot exceed available stock (${currentStock})`);
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
        

        // const url = item ? `${API_URL}/${supplier._id}/items/${item._id}` : `${API_URL}/${supplier._id}/items`;
        // const method = item ? 'PATCH' : 'POST';
        // const response = await fetch(url, {
        //   method,
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(itemData),
        // });


        // if (!response.ok) {
        //   const errorData = await response.json();
        //   throw new Error(errorData.message || `Failed to ${item ? 'update' : 'add'} item ${i + 1}`);
        // }

        // const result = await response.json(); // Parse JSON response

        // ✅ Get the itemCode from the response
        const generatedItemCode = item.itemCode;
        const encodedItemCode = encodeURIComponent(generatedItemCode);

        const url2 =  `${PRODUCTS_API_URL}/update-returnstockitem/${encodedItemCode}`;
        const method2 =  'PATCH';

        const productResponse = await fetch(url2, {
          method: method2,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            returnstock: parseInt(itemData.returnstock) || 0,
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

  // Calculate totals for cart view
  const totalQuantity = items.reduce((sum, item) => sum + (parseInt(item.stock) || 0), 0);
  const totalCost = items.reduce((sum, item) => {
    const qty = parseInt(item.stock) || 0;
    const price = parseFloat(item.buyingPrice) || 0;
    return sum + qty * price;
  }, 0);
  

  return (
    <div className="view-modal-select">
      <div className="modal-content-select">
        <h2 className="modal-title">{item ? 'Return Item' : '🛒 Add ReturnItems To Cart'}</h2>
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
                <div style={{marginBottom: "8px"}}>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="text"
                  value={itemData.itemName}
                  readOnly
                />
                </div>

                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>
                  Category</label>
                <div style={{marginBottom: "8px"}}>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="text"
                  value={itemData.category}
                  readOnly
                />
                </div>
               
                {itemData.itemName && (
                  <div style={{ marginBottom: "8px", color: darkMode ? "#ccc" : "#666", fontSize: "14px" }}>
                    <strong>Returns: </strong>
                    {(() => {
                      const matchedItem = itemNames.find(i => i.itemName === itemData.itemName);
                      const itemCode = matchedItem?.itemCode;
                      const returnQty = itemCode ? (returnStocks[itemCode] || 0) : 0;
                      return (
                        <span style={{ color: returnQty > 0 ? "#e74c3c" : "inherit", fontWeight: returnQty > 0 ? "bold" : "normal" }}>
                          {returnQty}
                        </span>
                      );
                    })()}
                    <strong> / Available Stock: </strong>
                    {(() => {
                      const matchedItem = itemNames.find(i => i.itemName === itemData.itemName);
                      const itemCode = matchedItem?.itemCode;
                      const stock = itemCode ? (productStocks[itemCode] || 0) : 0;
                      return (
                        <span style={{ color: stock > 0 ? "#28a745" : "#e74c3c", fontWeight: "bold" }}>
                          {stock}
                        </span>
                      );
                    })()}
                  </div>
                )}

                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Return Stock</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="text"
                  value={itemData.returnstock}
                  onChange={(e) => handleItemChange(index, 'returnstock', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="right-column">
                <h3 className={`ap-h3 ${darkMode ? 'dark' : ''}`}>Prices</h3>
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Buying Price</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="text"
                  value={itemData.buyingPrice}
                  readOnly
                />
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Selling Price</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="text"
                  value={itemData.sellingPrice}
                  readOnly
                />
                <label className={`pro-edit-label ${darkMode ? 'dark' : ''}`}>Supplier</label>
                <input
                  className={`pro-edit-input ${darkMode ? 'dark' : ''}`}
                  type="text"
                  value={itemData.supplierName ? itemData.supplierName : supplier.supplierName}
                  required
                  readOnly
                />
              </div>
            </div>
          ))}
          
          {/* Scrollable container for items */}
        <div className="scrollable-items-container">
          
        </div>
          
          <div className="button-group">
            
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