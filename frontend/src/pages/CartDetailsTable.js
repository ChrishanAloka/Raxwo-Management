import React, { useState, useEffect } from 'react';
import CartForm from './CartForm';
import ReturnCartForm from './ReturnCartForm';
import DamagedCartForm from './DamagedCartForm';


import '../Products.css';
import editicon from '../icon/edit.png';
import viewicon from '../icon/clipboard.png'; 
import deleteicon from '../icon/delete.png';
import saveicon from '../icon/sucess.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useMemo } from "react";

const API_URL = 'https://raxwo-management.onrender.com/api/suppliers';
const PRODUCT_API_URL = 'https://raxwo-management.onrender.com/api/products';

const REPAIRS_API_URL = 'https://raxwo-management.onrender.com/api/productsRepair';
const PAYMENTS_API_URL = 'https://raxwo-management.onrender.com/api/payments';

const CartDetailsTable = ({ supplierId, darkMode, refreshSuppliers }) => {
  const [items, setItems] = useState([]);
  const [supplierName, setSupplierName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [returnItem, setReturnItem] = useState(null);
  const [damagedItem, setDamagedItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDamagedModal, setShowDamagedModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 8;
  const [searchQuery, setSearchQuery] = useState('');

  const [trackItemData, setTrackItemData] = useState(null);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [returnStocks, setReturnStocks] = useState({});
  const [damagedStocks, setDamagedStocks] = useState({});
  const [productStocks, setProductStocks] = useState({});
  const [releaseStocks, setReleaseStocks] = useState({});

  const [itemLoadingStates, setItemLoadingStates] = useState({});

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${API_URL}/${supplierId}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`Failed to fetch supplier items: ${response.statusText}`);
      }
      const data = await response.json();
      const itemsdata = data.items.sort((a) => new Date(a.createdAt));
      setItems(itemsdata || []);
      setSupplierName(data.supplierName || '');
      setLoading(false);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching items');
      setLoading(false);
    }
  };

  const fetchReturnStock = async (itemCode) => {
    try {
      const response = await fetch(`${PRODUCT_API_URL}/${encodeURIComponent(itemCode)}`);
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
      const response = await fetch(`${PRODUCT_API_URL}/${encodeURIComponent(itemCode)}`);
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

  const fetchReleaseStocks = async (itemCode) => {
    try {
      const response = await fetch(`${PRODUCT_API_URL}/${encodeURIComponent(itemCode)}`);
      if (!response.ok) {
        console.warn(`Product ${itemCode} not found`);
        return 0;
      }
      const product = await response.json();
      return product.returnRelease || 0;
    } catch (err) {
      console.error(`Error fetching stock for ${itemCode}:`, err);
      return 0;
    }
  };

  const fetchProductDamagedStock = async (itemCode) => {
    try {
      const response = await fetch(`${PRODUCT_API_URL}/${encodeURIComponent(itemCode)}`);
      if (!response.ok) {
        console.warn(`Product ${itemCode} not found`);
        return 0;
      }
      const product = await response.json();
      return product.damagedstock || 0;
    } catch (err) {
      console.error(`Error fetching stock for ${itemCode}:`, err);
      return 0;
    }
  };

  useEffect(() => {
    fetchItems();
  }, [supplierId]);

  useEffect(() => {
    const loadStocksForItem = async (itemCode) => {
      // Mark as loading
      setItemLoadingStates(prev => ({ ...prev, [itemCode]: true }));

      try {
        const [returnStock, productStock, damagedStock, releaseStocks] = await Promise.all([
          fetchReturnStock(itemCode),
          fetchProductStock(itemCode),
          fetchProductDamagedStock(itemCode),
          fetchReleaseStocks(itemCode),
        ]);

        setReturnStocks(prev => ({ ...prev, [itemCode]: returnStock }));
        setProductStocks(prev => ({ ...prev, [itemCode]: productStock }));
        setDamagedStocks(prev => ({ ...prev, [itemCode]: damagedStock }));
        setReleaseStocks(prev => ({ ...prev, [itemCode]: releaseStocks }));
        
      } catch (err) {
        console.error(`Error loading stocks for ${itemCode}:`, err);
        // Optionally set defaults on error
        setReturnStocks(prev => ({ ...prev, [itemCode]: 0 }));
        setProductStocks(prev => ({ ...prev, [itemCode]: 0 }));
        setDamagedStocks(prev => ({ ...prev, [itemCode]: 0 }));
        setReleaseStocks(prev => ({ ...prev, [itemCode]: 0 }));
      } finally {
        // Mark as done loading
        setItemLoadingStates(prev => ({ ...prev, [itemCode]: false }));
      }
    };

    if (items.length > 0) {
      // Reset loading states for all current items
      const initialLoading = {};
      items.forEach(item => {
        if (item.itemCode) {
          initialLoading[item.itemCode] = true;
        }
      });
      setItemLoadingStates(initialLoading);

      // Fetch all
      items.forEach(item => {
        if (item.itemCode) {
          loadStocksForItem(item.itemCode);
        }
      });
    }
  }, [items]);

  const formatTrackDate = (dateString) => {
  if (!dateString) return 'N/A';

  try {
    // Use 'en-GB' for day-first and consistent formatting
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(dateString));
  } catch (err) {
    console.error('Invalid date:', dateString);
    return 'Invalid Date';
  }
};

  const handleTrackItem = async (item) => {
    setTrackingLoading(true);
    setTrackItemData(null);
    try {
      const { itemCode, itemName } = item;

      // --- Step 2: Fetch Repairs using GRN or Item Code in repairCart ---
      const repairsRes = await fetch(`${REPAIRS_API_URL}`);
      if (!repairsRes.ok) throw new Error("Failed to fetch repair data");
      const repairsList = await repairsRes.json();
      
      const repairsUsed = repairsList
        .filter((repair) =>
          repair.repairCart?.some((cartItem) => cartItem.itemCode === itemCode)
        )
        .map((repair) => {
          const cartItem = repair.repairCart.find((i) => i.itemCode === itemCode);
          return {
            type: "Repair",
            invoiceNo: repair.repairInvoice || "N/A",
            customerName: repair.customerName || "Unknown",
            quantity: cartItem?.quantity || 0,
            date: repair.createdAt ? formatTrackDate(repair.createdAt) : "N/A",
          };
        });

      const repairsReturned = repairsList
        .filter((repair) =>
          repair.returnCart?.some((cartItem) => cartItem.itemCode === itemCode)
        )
        .map((repair) => {
          const cartItem = repair.returnCart.find((i) => i.itemCode === itemCode);
          return {
            type: "Repair Return",
            invoiceNo: repair.repairInvoice || "N/A",
            customerName: repair.customerName || "Unknown",
            quantity: cartItem?.quantity || 0,
            date: repair.createdAt ? formatTrackDate(repair.createdAt) : "N/A",
          };
        });
      // console.log("Found ", repairsReturned);
      // --- Step 3: Fetch Payments and find usage by productId ---
      const paymentsRes = await fetch(
        `${PAYMENTS_API_URL}/track?itemCode=${encodeURIComponent(itemCode)}`
      );

      if (!paymentsRes.ok) {
        const error = await paymentsRes.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch payment usage');
      }

      const paymentsUsed = await paymentsRes.json();

      const formattedPaymentsUsed = paymentsUsed.map(item => ({
        ...item,
        date: formatTrackDate(item.date) // ✅ Same format
      }));

      // Combine both lists
      const usageRecords = [...repairsUsed, ...repairsReturned, ...formattedPaymentsUsed].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      console.log("Found item.itemCode", item.itemCode, item.itemName);

      setTrackItemData({
        itemCode: item.itemCode,
        itemName: item.itemName,
        usage: usageRecords,
      });
    } catch (err) {
      console.error(err);
      alert(`Error tracking item: ${err.message}`);
    } finally {
      setTrackingLoading(false);
      setShowTrackModal(true);
    }
  };

  const handleEdit = (item, index) => {
    setEditItem({ ...item, index });
    setShowEditModal(true);
    setShowActionMenu(null);
  };

  const handleReturn = (item, index) => {
    setReturnItem({ ...item, index });
    setShowReturnModal(true);
    setShowActionMenu(null);
  };

  const handleDamaged = (item, index) => {
    setDamagedItem({ ...item, index });
    setShowDamagedModal(true);
    setShowActionMenu(null);
  };

  const token = localStorage.getItem('token');

  const handleDelete = async (index) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const response = await fetch(`${API_URL}/${supplierId}/items/${index}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to delete item');
        }
        setItems(items.filter((_, i) => i !== index));
        refreshSuppliers();
        setShowActionMenu(null);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleSave = async (item) => {
    try {
      const response = await fetch(`${PRODUCT_API_URL}/update-stock/${item.itemCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({
          newStock: item.quantity,
          newBuyingPrice: item.buyingPrice,
          newSellingPrice: item.sellingPrice,
          itemName: item.itemName,
          category: item.category,
          supplierName: item.supplierName,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to save item to product stock');
      }
      setItems(items.filter((_, i) => i !== item.index));
      refreshSuppliers();
      setShowActionMenu(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const normalize = (str) => str.toLowerCase().replace(/\s+/g, ' ');

  const sortedAndFilteredProducts = useMemo(() => {
      // Start with filtered products
      // Start with all products or filtered list
      let result = items;
  
      // Apply search filter only if query exists
      if (searchQuery.trim() !== '') {
        result = items.filter(product => {
          const searchableText = normalize(product.grnNumber + ' ' + product.itemName + ' ' + product.category + ' ' + product.category);
          const words = normalize(searchQuery).trim().split(/\s+/);
  
          return words.every(word => {
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (/^\d+$/.test(word)) {
              // Numeric: require word boundaries (exact number match)
              const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
              return regex.test(searchableText);
            } else {
              // Text: allow partial substring match
              const regex = new RegExp(escapedWord, 'i');
              return regex.test(searchableText);
            }
          });
        });
      }
  
      return result;
    }, [items, searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  const totalProductPages = Math.ceil(sortedAndFilteredProducts.length / productsPerPage);
  const ProductsForModal = sortedAndFilteredProducts.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage);

  return (
    <div className={`cart-details-container ${darkMode ? 'dark' : ''}`}>
      <h3 className={`cart-details-title ${darkMode ? 'dark' : ''}`}>{supplierName ? `${supplierName} Cart Details` : 'Cart Details'}</h3>
      {loading && <p className="loading">Loading items...</p>}
      {error && (
        <>
          <p className="error-message">{error}</p>
          <button onClick={fetchItems} className="supplier-retry-btn">
            Retry
          </button>
        </>
      )}
      <div className={`search-bar-container ${darkMode ? 'dark' : ''}`}>
        {(!searchQuery) ? <FontAwesomeIcon icon={faSearch} className="search-icon" /> : <></> }
        <input
          type="text"
          placeholder="       Search..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className={`product-list-search-bar ${darkMode ? 'dark' : ''}`}
        />
        {searchQuery && (
          <button onClick={handleClearSearch} className={`search-clear-btn ${darkMode ? 'dark' : ''}`}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        )}
      </div>
      {!loading && items.length === 0 ? (
        <p className="no-products">No items in cart.</p>
      ) : (
        <table className={`product-table ${darkMode ? 'dark' : ''}`}>
          <thead>
            <tr>
              <th>Date</th>
              <th>GRN</th>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Category</th>
              <th>Stock / Avl Sto.</th>
              <th>Returns / Damaged / Release Sto.</th>
              <th>Buying Price</th>
              {/* <th>Selling Price</th> */}
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {ProductsForModal.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map((item, index) => (
              <tr key={index}>
                <td>{new Date(item.createdAt).toISOString().split("T")[0] || '-'}</td>
                <td>{item.grnNumber || 'N/A'}</td>
                <td>{item.itemCode || 'N/A'}</td>
                <td>{item.itemName || 'N/A'}</td>
                <td>{item.category || 'N/A'}</td>
                <td>{item.quantity || '0'} / {productStocks[item.itemCode] || 0}</td>
                <td>
                  {itemLoadingStates[item.itemCode] ? (
                    <span>Loading...</span> // or a spinner like <FontAwesomeIcon icon={faSpinner} spin />
                  ) : (
                    <>
                      <span style={{
                        color: (returnStocks[item.itemCode] || 0) > 0 ? '#e74c3c' : 'inherit',
                        fontWeight: 'bold' 
                      }}>
                        {returnStocks[item.itemCode] || 0}
                      </span>
                      <span> / </span>
                      <span style={{
                        color: (damagedStocks[item.itemCode] || 0) > 0 ? '#e74c3c' : 'inherit',
                        fontWeight: 'bold' 
                      }}>
                        {damagedStocks[item.itemCode] || 0}
                      </span>
                      <span> / </span>
                      <span style={{
                        color: (releaseStocks[item.itemCode] || 0) > 0 ? "#28a745" : "#e74c3c",
                        fontWeight: 'bold' 
                      }}>
                        {releaseStocks[item.itemCode] || 0}
                      </span>
                    </>
                  )}
                </td>
                <td>Rs. {item.buyingPrice || '0'}</td>
                {/* <td>Rs. {item.sellingPrice || '0'}</td> */}
                <td>
                  <div className="action-container">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setShowActionMenu(showActionMenu === (item._id || item.itemCode || index) ? null : (item._id || item.itemCode || index));
                      }}
                      className="action-dot-btn"
                    >
                      ⋮
                    </button>
                    {showActionMenu === (item._id || item.itemCode || index) && (
                      <>
                        <div className="action-menu-overlay" onClick={() => setShowActionMenu(null)} />
                        <div className="action-menu">
                          <button onClick={() => handleTrackItem(item)} className="p-track-btn">
                            <div className="action-btn-content">
                              <img src={viewicon} alt="track" width="30" height="30" className="p-track-btn-icon" />
                              <span>Track Usage</span>
                            </div>
                          </button>
                          <button onClick={() => handleReturn(item, index)} className="p-edit-btn">
                            <div className="action-btn-content">
                              <span className="p-edit-btn-icon" style={{width:"30", height:"30"}}>↩️ </span>
                              <span> Return</span>
                            </div>
                          </button>
                          <button onClick={() => handleDamaged(item, index)} className="p-edit-btn">
                            <div className="action-btn-content">
                              <span className="p-edit-btn-icon" style={{width:"30", height:"30"}}>⚠️ </span>
                              <span> Damaged Items</span>
                            </div>
                          </button>
                          {item.quantity === (productStocks[item.itemCode] || 0) && (
                            <button onClick={() => handleEdit(item, index)} className="p-edit-btn">
                              <div className="action-btn-content">
                                <img src={editicon} alt="edit" width="30" height="30" className="p-edit-btn-icon" />
                                <span>Edit</span>
                              </div>
                            </button>
                          )}
                          {/* <button onClick={() => handleDelete(index)} className="p-delete-btn">
                            <div className="action-btn-content">
                              <img src={deleteicon} alt="delete" width="30" height="30" className="p-delete-btn-icon" />
                              <span>Delete</span>
                            </div>
                          </button> */}
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {totalProductPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '16px 0', gap: 10 }}>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
          <span>Page {currentPage} of {totalProductPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalProductPages, p + 1))} disabled={currentPage === totalProductPages}>Next</button>
        </div>
      )}
      {showTrackModal && trackItemData && (
        <div className="track-modal-overlay" onClick={() => setShowTrackModal(false)}>
          <div className={`track-modal-content ${darkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
            <h3>Item Usage Tracking</h3>
            <p><strong>Item Code:</strong> {trackItemData.itemCode}</p>
            <p><strong>Item Name:</strong> {trackItemData.itemName}</p>

            {trackingLoading ? (
              <p>Loading usage details...</p>
            ) : trackItemData.usage.length > 0 ? (
              <table className={`track-usage-table ${darkMode ? 'dark' : ''}`}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Invoice No</th>
                    <th>Customer</th>
                    <th>Quantity Used</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {trackItemData.usage.map((record, idx) => (
                    <tr key={idx}>
                      <td>{record.type}</td>
                      <td>{record.invoiceNo}</td>
                      <td>{record.customerName}</td>
                      <td>{record.retalert === "returned" ? record.givenQty > 0 ? `Given ${record.givenQty} / Returned: ${record.retquantity}` : ` Returned: ${record.retquantity}` : `${record.quantity}`}</td>
                      <td>{record.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No usage found for this item.</p>
            )}

            <button className="close-track-modal-btn" onClick={() => setShowTrackModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
      {showEditModal && editItem && (
        <CartForm
          supplier={{ _id: supplierId, supplierName:supplierName }}
          item={editItem}
          closeModal={() => {
            setShowEditModal(false);
            setEditItem(null);
            fetchItems();
          }}
          darkMode={darkMode}
        />
      )}
      {showReturnModal && returnItem && (
        <ReturnCartForm
          supplier={{ _id: supplierId, supplierName:supplierName }}
          item={returnItem}
          closeModal={() => {
            setShowReturnModal(false);
            setReturnItem(null);
            fetchItems();
          }}
          darkMode={darkMode}
        />
      )}

      {showDamagedModal && damagedItem && (
        <DamagedCartForm
          supplier={{ _id: supplierId, supplierName:supplierName }}
          item={damagedItem}
          closeModal={() => {
            setShowDamagedModal(false);
            setDamagedItem(null);
            fetchItems();
          }}
          darkMode={darkMode}
        />
      )}
      
    </div>
  );
};

export default CartDetailsTable;