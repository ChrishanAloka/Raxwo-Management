import React, { useEffect, useState } from 'react';

const PRODUCTS_API = 'https://raxwo-manage-backend-production.up.railway.app/api/products';
const HIDDEN_PRODUCTS_API = 'https://raxwo-manage-backend-production.up.railway.app/api/products/hidden';

const HiddenProducts = () => {
  const [hiddenProducts, setHiddenProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHiddenProducts() {
      setLoading(true);
      try {
        const response = await fetch(HIDDEN_PRODUCTS_API);
        const data = await response.json();
        setHiddenProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        setHiddenProducts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchHiddenProducts();
  }, []);

  const handleMakeVisible = async (productId) => {
    try {
      const username = localStorage.getItem('username') || localStorage.getItem('cashierName') || 'system';
      const response = await fetch(`${PRODUCTS_API}/toggle-visibility/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to make product visible');
      }
      
      // Remove the product from the hidden list
      setHiddenProducts(hiddenProducts.filter(product => product._id !== productId));
      alert('Product made visible successfully!');
    } catch (error) {
      alert('Error making product visible: ' + error.message);
    }
  };

  return (
    <div className="hidden-products-container" style={{ padding: 24 }}>
      <h2>Hidden Products</h2>
      {loading ? (
        <div>Loading...</div>
      ) : hiddenProducts.length === 0 ? (
        <div>No hidden products found.</div>
      ) : (
        <ul style={{ paddingLeft: 0 }}>
          {hiddenProducts.map(product => (
            <li key={product._id} style={{ 
              marginBottom: 16, 
              listStyle: 'none', 
              borderBottom: '1px solid #e2e8f0', 
              paddingBottom: 8,
              padding: 16,
              backgroundColor: '#f8f9fa',
              borderRadius: 8
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#dc2626', fontWeight: 700, marginRight: 8 }}>[HIDDEN]</span>
                  Category: {product.category} | Supplier: {product.supplierName}<br/>
                  <strong>{product.itemName}</strong> (Code: {product.itemCode})<br/>
                  <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
                    Hidden At: {product.hiddenAt ? new Date(product.hiddenAt).toLocaleString() : 'N/A'} | 
                    Hidden By: {product.hiddenBy || 'N/A'}
                  </div>
                  <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
                    <strong>Change History:</strong>
                    {Array.isArray(product.changeHistory) && product.changeHistory.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {product.changeHistory.map((entry, idx) => (
                          <li key={idx}>
                            {entry.changeType?.toUpperCase() || 'ACTION'} by {entry.changedBy || 'N/A'} on {entry.changedAt ? new Date(entry.changedAt).toLocaleString() : 'N/A'}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ marginLeft: 8 }}>No change history.</div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => handleMakeVisible(product._id)}
                  style={{
                    backgroundColor: '#22c55e',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Make Visible
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HiddenProducts; 