import React, { useState, useEffect } from 'react';
import CartForm from './CartForm';
import '../Products.css';
import editicon from '../icon/edit.png';
import deleteicon from '../icon/delete.png';
import saveicon from '../icon/sucess.png';

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
      setItems(data.paymentHistory || []);
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

  const totalProductPages = Math.ceil(items.length / productsPerPage);
  const ProductsForModal = items.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage);


  return (
    <div className={`cart-details-container ${darkMode ? 'dark' : ''}`}>
      <h3 className={`cart-details-title ${darkMode ? 'dark' : ''}`}>{supplierName ? `${supplierName} Payments History` : 'Payments History'}</h3>
      {loading && <p className="loading">Loading items...</p>}
      {error && (
        <>
          <p className="error-message">{error}</p>
          <button onClick={fetchItems} className="supplier-retry-btn">
            Retry
          </button>
        </>
      )}
      {!loading && items.length === 0 ? (
        <p className="no-products">No Payments Done.</p>
      ) : (
        <table className={`product-table ${darkMode ? 'dark' : ''}`}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Up to date Cost</th>
              <th>Payed Amount</th>
              <th>Amount Due</th>
              <th>Payment Method</th>
              {/* <th>Action</th> */}
            </tr>
          </thead>
          <tbody>
            {ProductsForModal.map((item, index) => (
              <tr key={index}>
                <td>{new Date(item.date).toISOString().split("T")[0] || '-'}</td>
                <td>Rs. {item.uptodateCost || '0'}</td>
                <td>Rs. {item.currentPayment || '0'}</td>
                <td>Rs. {item.amountDue || '0'}</td>
                <td>{item.paymentMethod || '-'}</td>
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