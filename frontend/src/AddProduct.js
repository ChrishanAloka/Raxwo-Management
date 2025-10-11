import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./AddProduct.css";

const API_URL = 'https://raxwo-management.onrender.com/api/products';

const AddProduct = ({ darkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [clickedProducts, setClickedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get product from navigation state (if any)
  const product = location.state?.product;
  const clickDateTime = location.state?.clickedAt;

  const fetchDeletedProducts = async () => {
    setLoading(true);
    try {
      console.log('Fetching deleted products from server...');
      const response = await fetch(`${API_URL}/deleted`); // Adjust URL if needed

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const deletedProducts = await response.json();
      console.log('Fetched deleted products:', deletedProducts);

      // Update state
      setClickedProducts(deletedProducts);

      // Optionally: Sync with localStorage if you want fallback
      localStorage.setItem('deletedProductsCache', JSON.stringify(deletedProducts));
    } catch (err) {
      console.error('Error fetching deleted products:', err);
      setError('Failed to load deleted products. Please try again later.');

      // Fallback to localStorage cache if available
      try {
        const cache = JSON.parse(localStorage.getItem('deletedProductsCache') || '[]');
        if (cache.length > 0) {
          console.log('Using cached deleted products from localStorage');
          setClickedProducts(cache);
        }
      } catch (e) {
        console.warn('Failed to read cache:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const token = localStorage.getItem('token');
  
  useEffect(() => {

    fetchDeletedProducts();

    // console.log('AddProduct useEffect - Location state:', location.state);
    // console.log('AddProduct useEffect - Product:', product);
    // console.log('AddProduct useEffect - Click DateTime:', clickDateTime);
    
    // setLoading(true);
    // try {
    //   let clickedProductsLS = JSON.parse(localStorage.getItem('clickedProducts') || '[]');
    //   console.log('AddProduct useEffect - Initial localStorage data:', clickedProductsLS);
      
    //   // If a product was just clicked, add it if not already present
    //   if (product && product._id) {
    //     console.log('AddProduct useEffect - Adding product to localStorage:', product);
    //     const alreadyExists = clickedProductsLS.some(cp => cp._id === product._id);
    //     if (!alreadyExists) {
    //       const username = localStorage.getItem('username') || localStorage.getItem('cashierName') || 'system';
    //       const newClickedProduct = {
    //         ...product,
    //         clickedAt: clickDateTime || new Date().toISOString(),
    //         clickedFrom: location.state?.clickedFrom || 'unknown',
    //         clickedBy: username
    //       };
    //       clickedProductsLS.push(newClickedProduct);
    //       localStorage.setItem('clickedProducts', JSON.stringify(clickedProductsLS));
    //       console.log('AddProduct useEffect - Product added to localStorage');
    //     } else {
    //       console.log('AddProduct useEffect - Product already exists in localStorage');
    //     }
    //   }
      
    //   console.log('AddProduct useEffect - Final clickedProductsLS:', clickedProductsLS);
    //   setClickedProducts(clickedProductsLS);
    // } catch (err) {
    //   console.error('AddProduct useEffect - Error:', err);
    //   setError('Failed to load clicked products.');
    // } finally {
    //   setLoading(false);
    // }
    // eslint-disable-next-line
  }, []);

  const handleBack = () => {
    navigate('/products'); // Or wherever you want to go back
  };

  const handleClearAll = () => {
    localStorage.removeItem('clickedProducts');
    setClickedProducts([]);
  };

  const handleRestoreAll = async () => {
    if (!window.confirm("Are you sure you want to restore ALL deleted products?")) return;

    try {
      const response = await fetch(`${API_URL}/restore-all`, {
        method: 'PATCH',
        headers: {  'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to restore all');

      localStorage.removeItem('clickedProducts');
    
      setClickedProducts([]);
      alert('All products restored successfully!');
    } catch (err) {
      alert('Failed to restore all products.');
    }
  };

  const handleAddProduct = async (productToRestore) => {
    if (!window.confirm(`Are you sure you want to restore "${productToRestore.itemName}"?`)) {
      return; // User canceled
    }

    try {
      const username = localStorage.getItem('username') || 
                      localStorage.getItem('cashierName') || 
                      'system';

      const response = await fetch(`${API_URL}/${productToRestore._id}/restoreProduct`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          restoredBy: username
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to restore');
      }

      // ✅ Success: Remove from displayed list
      setClickedProducts(prev => prev.filter(p => p._id !== productToRestore._id));

      // Optional: Show success feedback
      alert(`${productToRestore.itemName} has been restored and is now visible in the product list.`);

    } catch (err) {
      console.error('Error restoring product:', err);
      alert(`Failed to restore "${productToRestore.itemName}". ${err.message}`);
    }
  };

  // const handleAddProduct = (productToRestore) => {
  //   try {
  //     // Remove the product from clickedProducts localStorage
  //     let clickedProductsLS = JSON.parse(localStorage.getItem('clickedProducts') || '[]');
  //     const updatedClickedProducts = clickedProductsLS.filter(cp => cp._id !== productToRestore._id);
  //     localStorage.setItem('clickedProducts', JSON.stringify(updatedClickedProducts));
      
  //     // Store the restored product with added back timestamp
  //     const restoredProduct = {
  //       ...productToRestore,
  //       addedBackAt: new Date().toISOString(),
  //       addedBackBy: localStorage.getItem('username') || localStorage.getItem('cashierName') || 'system'
  //     };
      
  //     // Get existing restored products and add the new one
  //     let restoredProductsLS = JSON.parse(localStorage.getItem('restoredProducts') || '[]');
  //     const existingIndex = restoredProductsLS.findIndex(rp => rp._id === productToRestore._id);
      
  //     if (existingIndex !== -1) {
  //       // Update existing entry
  //       restoredProductsLS[existingIndex] = restoredProduct;
  //     } else {
  //       // Add new entry
  //       restoredProductsLS.push(restoredProduct);
  //     }
      
  //     localStorage.setItem('restoredProducts', JSON.stringify(restoredProductsLS));
      
  //     // Update the state
  //     setClickedProducts(updatedClickedProducts);
      
  //     console.log('Product restored:', productToRestore.itemName);
      
  //     // Show success message (you can add a toast notification here if needed)
  //     alert(`${productToRestore.itemName} has been restored to the product list and stock management.`);
      
  //   } catch (err) {
  //     console.error('Error restoring product:', err);
  //     alert('Failed to restore product. Please try again.');
  //   }
  // };

  return (
    <div className={`add-product-page ${darkMode ? "dark" : ""}`}>
      <div className={`add-product-container ${darkMode ? "dark" : ""}`}>
        <h2 className={`produ-modal-title ${darkMode ? "dark" : ""}`}>🗑️ Deleted Product Page</h2>
        <p className="page-description">This is the Delete page. Products marked for deletion will be shown here.</p>
        {loading ? (
          <p className="loading">Loading clicked products...</p>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : clickedProducts.length === 0 ? (
          <p className="no-items">No products have been added yet.</p>
        ) : (
          <div className="clicked-items-list">
            <h3 className={`clicked-items-title ${darkMode ? "dark" : ""}`}>All Items Marked for Deletion:</h3>
            <div className="clicked-items-container">
              {clickedProducts.map((clickedProduct) => (
                <div key={clickedProduct._id} className="clicked-item">
                  <p><strong>Item:</strong> {clickedProduct.itemName}</p>
                  <p><strong>Marked At:</strong> {new Date(clickedProduct.clickedAt).toLocaleString()}</p>
                  <p><strong>Category:</strong> {clickedProduct.category}</p>
                  <p><strong>Price:</strong> Rs. {clickedProduct.sellingPrice?.toFixed(2)}</p>
                  <p><strong>Stock:</strong> {clickedProduct.stock}</p>
                  <button 
                    type="button" 
                    className="add-product-btn"
                    onClick={() => handleAddProduct(clickedProduct)}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      marginTop: '8px'
                    }}
                  >
                    ➕ Restore Product
                  </button>
                  {/* <p><strong>Supplier:</strong> {clickedProduct.supplierName}</p>
                  <p><strong>Marked By:</strong> {clickedProduct.clickedBy || 'Unknown'}</p>
                  <p><strong>Marked From:</strong> {clickedProduct.clickedFrom || 'Unknown'}</p> */}
                  {/*
                    add-product-btn: This button allows the user to restore a deleted product back to the product list and stock management. 
                    When clicked, it removes the product from the local 'clickedProducts' list and adds it to the 'restoredProducts' in localStorage.
                  */}
                  {/* <button 
                    type="button" 
                    className="add-product-btn"
                    onClick={() => handleAddProduct(clickedProduct)}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginTop: '10px',
                      fontSize: '14px'
                    }}
                  >
                    ➕ Add Product
                  </button> */}
            </div>
              ))}
            </div>
          </div>
        )}
          <div className="button-group">
          <button type="button" className="a-p-cancel-btn" onClick={handleBack}>
            Back to Products
            </button>
          {clickedProducts.length > 0 && (
            <button type="button" className="a-p-cancel-btn" onClick={handleRestoreAll} style={{ marginLeft: '10px', backgroundColor: '#dc3545' }}>
              Restore All
            </button>
          )}
          </div>
      </div>
    </div>
  );
};

export default AddProduct;