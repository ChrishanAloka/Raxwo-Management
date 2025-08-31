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
      setItems(data.discounts || []);
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


  return (
    <div className={`cart-details-container ${darkMode ? 'dark' : ''}`}>
      <h3 className={`cart-details-title ${darkMode ? 'dark' : ''}`}>{supplierName ? `${supplierName} Discounts` : 'Discounts'}</h3>
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
        <p className="no-products">No Discounts.</p>
      ) : (
        <table className={`product-table ${darkMode ? 'dark' : ''}`}>
          <thead>
            <tr>
              <th>GRN Number</th>
              <th>Description</th>
              <th>Discount Amount</th>
              {/* <th>Action</th> */}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                
                <td>{item.grnNumber || 'N/A'}</td>
                <td>{item.discountdescription || 'N/A'}</td>
                <td>Rs. {item.discountCharge || '0'}</td>
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