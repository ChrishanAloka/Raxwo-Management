import React, { useEffect, useState } from 'react';

const PRODUCTS_API = 'https://raxwo-manage-backend-production.up.railway.app/api/products';
const DELETED_PRODUCTS_API = 'https://raxwo-manage-backend-production.up.railway.app/api/products/deleted';
const DELETION_LOGS_API = 'https://raxwo-manage-backend-production.up.railway.app/api/products/deleted-logs';
const INACTIVE_PRODUCTS_API = 'https://raxwo-manage-backend-production.up.railway.app/api/products/inactive';

const DeletedProducts = () => {
  const [deletedProducts, setDeletedProducts] = useState([]);
  const [activeProducts, setActiveProducts] = useState([]);
  const [deletionLogs, setDeletionLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllProducts() {
      setLoading(true);
      try {
        const [activeRes, inactiveRes, logsRes] = await Promise.all([
          fetch(PRODUCTS_API),
          fetch(INACTIVE_PRODUCTS_API),
          fetch(DELETION_LOGS_API)
        ]);
        const activeData = await activeRes.json();
        const inactiveData = await inactiveRes.json();
        const logsData = await logsRes.json();
        setActiveProducts(Array.isArray(activeData) ? activeData : (activeData.products || []));
        setDeletedProducts(Array.isArray(inactiveData) ? inactiveData : []);
        setDeletionLogs(Array.isArray(logsData) ? logsData : []);
      } catch (err) {
        setActiveProducts([]);
        setDeletedProducts([]);
        setDeletionLogs([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAllProducts();
  }, []);

  return (
    <div className="deleted-products-container" style={{ padding: 24 }}>
      <h2>All Products (Active & Deleted)</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <h3>Active Products</h3>
          {activeProducts.length === 0 ? (
            <div>No active products found.</div>
          ) : (
            <ul style={{ paddingLeft: 0 }}>
              {activeProducts.map(product => (
                <li key={product._id} style={{ marginBottom: 16, listStyle: 'none', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                  <span style={{ color: '#22c55e', fontWeight: 700, marginRight: 8 }}>[ACTIVE]</span>
                  Category: {product.category} | Supplier: {product.supplierName}<br/>
                  <strong>{product.itemName}</strong> (Code: {product.itemCode})<br/>
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
                </li>
              ))}
            </ul>
          )}

          <h3 style={{ marginTop: 32 }}>Inactive Products</h3>
          {deletedProducts.length === 0 ? (
            <div>No inactive products found.</div>
          ) : (
            <ul style={{ paddingLeft: 0 }}>
              {deletedProducts.map(product => (
                <li key={product._id} style={{ marginBottom: 16, listStyle: 'none', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                  <span style={{ color: '#ef4444', fontWeight: 700, marginRight: 8 }}>[INACTIVE]</span>
                  Category: {product.category} | Supplier: {product.supplierName} | Deleted At: {product.deletedAt ? new Date(product.deletedAt).toLocaleString() : 'N/A'} | Deleted By: {product.deletedBy || 'N/A'}<br/>
                  <strong>{product.itemName}</strong> (Code: {product.itemCode})<br/>
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
                </li>
              ))}
            </ul>
          )}

          <h3 style={{ marginTop: 32 }}>Recent Deletion Logs</h3>
          {deletionLogs.length === 0 ? (
            <div>No deletion logs found.</div>
          ) : (
            <ul style={{ paddingLeft: 0 }}>
              {deletionLogs.map(log => (
                <li key={log._id} style={{ marginBottom: 16, listStyle: 'none', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                  <span style={{ 
                    color: log.deletionType === 'hard' ? '#dc2626' : '#f59e0b', 
                    fontWeight: 700, 
                    marginRight: 8 
                  }}>
                    [{log.deletionType?.toUpperCase() || 'UNKNOWN'} DELETE]
                  </span>
                  Category: {log.category} | Supplier: {log.supplierName} | Deleted At: {log.deletedAt ? new Date(log.deletedAt).toLocaleString() : 'N/A'} | Deleted By: {log.deletedBy || 'N/A'}<br/>
                  <strong>{log.itemName}</strong> (Code: {log.itemCode})<br/>
                  <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
                    <strong>Change History:</strong>
                    {Array.isArray(log.changeHistory) && log.changeHistory.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {log.changeHistory.map((entry, idx) => (
                          <li key={idx}>
                            {entry.changeType?.toUpperCase() || 'ACTION'} by {entry.changedBy || 'N/A'} on {entry.changedAt ? new Date(entry.changedAt).toLocaleString() : 'N/A'}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ marginLeft: 8 }}>No change history.</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default DeletedProducts; 