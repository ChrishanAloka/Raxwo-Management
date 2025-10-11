import React, { useState, useEffect } from 'react';
import CartForm from './CartForm';
import '../Products.css';
import editicon from '../icon/edit.png';
import deleteicon from '../icon/delete.png';
import saveicon from '../icon/sucess.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useMemo } from "react";

const API_URL = 'https://raxwo-management.onrender.com/api/suppliers';
const PRODUCT_API_URL = 'https://raxwo-management.onrender.com/api/products';

const CartDetailsTable = ({ supplierId, darkMode, refreshSuppliers }) => {
  const [items, setItems] = useState([]);
  const [supplierName, setSupplierName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 8;
  const [searchQuery, setSearchQuery] = useState('');
  

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
      setItems(data.repairService || []);
      setSupplierName(data.supplierName || '');
      setLoading(false);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching items');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [supplierId]);

  const handleEdit = (item, index) => {
    setEditItem({ ...item, index });
    setShowEditModal(true);
    setShowActionMenu(null);
  };

  const token = localStorage.getItem('token');

  const handleDelete = async (index) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const response = await fetch(`${API_URL}/${supplierId}/items/${index}`, {
          method: 'DELETE',
          headers: {
            "Authorization": `Bearer ${token}`,
          },
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
      let result = items;

      const query = searchQuery.trim();
      if (query === '') return result;

      const normalizedQuery = normalize(query);
      const queryWords = normalizedQuery.split(/\s+/).filter(word => word);

      result = items.filter(product => {
        const searchableText = normalize(
          (product.repairDevice || '') + ' ' +
          (product.jobNumber?.toString() || '') + ' ' +
          (product.serielNo || '') + ' ' +
          (product.deviceIssue || '') + ' ' +
          (product.paymentdescription || '')
        );

        return queryWords.every(word => {
          const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

          // 🔍 Always do case-insensitive substring search
          const regex = new RegExp(escapedWord, 'i');
          return regex.test(searchableText);
        });
      });

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
      <h3 className={`cart-details-title ${darkMode ? 'dark' : ''}`}>{supplierName ? `${supplierName} Repair Services` : 'Repair Services'}</h3>
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
        <p className="no-products">No Repair Services.</p>
      ) : (
        <table className={`product-table ${darkMode ? 'dark' : ''}`}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Job Number</th>
              <th>Device Type</th>
              <th>Seriel No</th>
              <th>Issue</th>
              <th>Description</th>
              <th>Charge</th>
              {/* <th>Action</th> */}
            </tr>
          </thead>
          <tbody>
            {ProductsForModal.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((item, index) => (
              <tr key={index}>
                <td>{new Date(item.createdAt).toISOString().split("T")[0] || '-'}</td>
                <td>{item.jobNumber || 'N/A'}</td>
                <td>{item.repairDevice || 'N/A'}</td>
                <td>{item.serielNo || 'N/A'}</td>
                <td>{item.deviceIssue || 'N/A'}</td>
                <td>{item.paymentdescription || 'N/A'}</td>
                
                <td>Rs. {item.paymentCharge || '0'}</td>
                {/* <td>
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
                          <button onClick={() => handleEdit(item, index)} className="p-edit-btn">
                            <div className="action-btn-content">
                              <img src={editicon} alt="edit" width="30" height="30" className="p-edit-btn-icon" />
                              <span>Edit</span>
                            </div>
                          </button>
                          <button onClick={() => handleDelete(index)} className="p-delete-btn">
                            <div className="action-btn-content">
                              <img src={deleteicon} alt="delete" width="30" height="30" className="p-delete-btn-icon" />
                              <span>Delete</span>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td> */}
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
      {showEditModal && editItem && (
        <CartForm
          supplier={{ _id: supplierId, supplierName:supplierName }}
          item={editItem}
          closeModal={() => {
            setShowEditModal(false);
            setEditItem(null);
            fetchItems();
            refreshSuppliers();
          }}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default CartDetailsTable;