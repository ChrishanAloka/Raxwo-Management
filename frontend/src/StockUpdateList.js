import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import "./StockUpdateList.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faChartSimple, faFile, faFilePdf, faFileExcel, faSearch, faTimes, faRefresh } from '@fortawesome/free-solid-svg-icons';
import edticon from "./icon/edit.png";
import deleteicon from "./icon/delete.png";


const API_URL = "https://raxwo-manage-backend-production.up.railway.app/api/products";
const CLICKED_PRODUCTS_API_URL = 'https://raxwo-manage-backend-production.up.railway.app/api/clicked-products';

const StockUpdateList = ({ darkMode }) => {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const itemsPerPage = 20;

  // Fetch products with backend pagination and filtering
  const fetchProducts = async (page = 1, search = "") => {
    setLoading(true);
    setError("");
    let url = `${API_URL}?page=${page}&limit=${itemsPerPage}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      if (data && data.records) {
        setProducts(data.records);
        setTotalPages(data.totalPages || 1);
        setTotalProducts(data.total || data.records.length);
      } else if (Array.isArray(data)) {
        setProducts(data);
        setTotalPages(1);
        setTotalProducts(data.length);
      } else {
        setProducts([]);
        setTotalPages(1);
        setTotalProducts(0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to fetch all products (no pagination)
  const fetchAllProductsForReport = async (search = '') => {
    let url = `${API_URL}`;
    if (search) url += `?search=${encodeURIComponent(search)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch all products for report');
    const data = await response.json();
    if (data && data.records) return data.records;
    if (Array.isArray(data)) return data;
    return [];
  };

  const generatePDF = async () => {
    try {
      const allProducts = await fetchAllProductsForReport(searchTerm);
      const clickedProducts = JSON.parse(localStorage.getItem('clickedProducts') || '[]');
      const clickedProductIds = clickedProducts.map(cp => cp._id);
      const availableProductsForReport = allProducts.filter(product => !clickedProductIds.includes(product._id));
      // Group by category
      const groupedByCategoryForReport = availableProductsForReport.reduce((acc, product) => {
        const category = product.category || "Uncategorized";
        if (!acc[category]) acc[category] = [];
        acc[category].push(product);
        return acc;
      }, {});
      const sortedCategoriesForReport = Object.keys(groupedByCategoryForReport).sort();
      const doc = new jsPDF();
      doc.text("Stock Update List", 14, 15);
      let yPos = 20;
      sortedCategoriesForReport.forEach((category) => {
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text(category, 14, yPos);
        yPos += 10;
        autoTable(doc, {
          startY: yPos,
          head: [[
            "GRN",
            "ITEM NAME",
            "OLD STOCK",
            "NEW STOCK",
            "OLD BUYING PRICE",
            "NEW BUYING PRICE",
            "OLD SELLING PRICE",
            "NEW SELLING PRICE",
          ]],
          body: groupedByCategoryForReport[category].map((product) => [
            product.itemCode,
            product.itemName,
            product.oldStock || 0,
            product.stock,
            product.oldBuyingPrice || 0,
            product.buyingPrice,
            product.oldSellingPrice || 0,
            product.sellingPrice,
          ]),
        });
        yPos = doc.lastAutoTable.finalY + 15;
      });
      doc.save("Stock_Update_List.pdf");
      setShowReportOptions(false);
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    }
  };

  const generateExcel = async () => {
    try {
      const allProducts = await fetchAllProductsForReport(searchTerm);
      const clickedProducts = JSON.parse(localStorage.getItem('clickedProducts') || '[]');
      const clickedProductIds = clickedProducts.map(cp => cp._id);
      const availableProductsForReport = allProducts.filter(product => !clickedProductIds.includes(product._id));
      // Group by category
      const groupedByCategoryForReport = availableProductsForReport.reduce((acc, product) => {
        const category = product.category || "Uncategorized";
        if (!acc[category]) acc[category] = [];
        acc[category].push(product);
        return acc;
      }, {});
      const sortedCategoriesForReport = Object.keys(groupedByCategoryForReport).sort();
      const workbook = XLSX.utils.book_new();
      sortedCategoriesForReport.forEach((category) => {
        const categoryProducts = groupedByCategoryForReport[category];
        const worksheet = XLSX.utils.json_to_sheet(
          categoryProducts.map((product) => ({
            "GRN": product.itemCode,
            "ITEM NAME": product.itemName,
            "OLD STOCK": product.oldStock || 0,
            "NEW STOCK": product.stock,
            "OLD BUYING PRICE": product.oldBuyingPrice || 0,
            "NEW BUYING PRICE": product.buyingPrice,
            "OLD SELLING PRICE": product.oldSellingPrice || 0,
            "NEW SELLING PRICE": product.sellingPrice,
          }))
        );
        XLSX.utils.book_append_sheet(workbook, worksheet, category.substring(0, 31));
      });
      const summaryWorksheet = XLSX.utils.json_to_sheet(
        availableProductsForReport.map((product) => ({
          "GRN": product.itemCode,
          "ITEM NAME": product.itemName,
          "CATEGORY": product.category,
          "OLD STOCK": product.oldStock || 0,
          "NEW STOCK": product.stock,
          "OLD BUYING PRICE": product.oldBuyingPrice || 0,
          "NEW BUYING PRICE": product.buyingPrice,
          "OLD SELLING PRICE": product.oldSellingPrice || 0,
          "NEW SELLING PRICE": product.sellingPrice,
        }))
      );
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "All Products");
      XLSX.writeFile(workbook, "Stock_Update_List.xlsx");
      setShowReportOptions(false);
    } catch (err) {
      alert('Failed to generate Excel: ' + err.message);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    fetchProducts(currentPage, searchTerm);
  };

  const handleEdit = (product) => {
    navigate("/StockUpdate", { 
      state: { 
        darkMode,
        editProduct: product,
        isEditing: true
      } 
    });
    setShowActionMenu(null);
  };

  const handleAddProduct = (product) => {
    // Show confirmation dialog
    const isConfirmed = window.confirm(`Are you sure you want to delete "${product.itemName}"? This action cannot be undone.`);
    
    if (!isConfirmed) {
      return; // User cancelled the deletion
    }
    
    console.log('Delete clicked for:', product);
    
    // Store clicked product in localStorage
    const clickedProducts = JSON.parse(localStorage.getItem('clickedProducts') || '[]');
        const username = localStorage.getItem('username') || localStorage.getItem('cashierName') || 'system';
    const newClickedProduct = {
      ...product,
      clickedAt: new Date().toISOString(),
      clickedFrom: 'stock-management',
      clickedBy: username
    };
    
    // Check if product is already clicked
    const isAlreadyClicked = clickedProducts.some(cp => cp._id === product._id);
    if (!isAlreadyClicked) {
      clickedProducts.push(newClickedProduct);
      localStorage.setItem('clickedProducts', JSON.stringify(clickedProducts));
      console.log('Product added to localStorage:', newClickedProduct);
    }
    
    // Immediately remove the clicked product from the current list
    setProducts(prevProducts => prevProducts.filter(p => p._id !== product._id));
    
    // Show success message
    alert(`${product.itemName} has been deleted and moved to the deleted products page.`);
    
    // Navigate to AddProduct page with product data
    console.log('StockUpdateList - Navigating to DeleteProduct with product:', product);
    navigate('/AddProduct', {
      state: {
        product: product,
        clickedAt: newClickedProduct.clickedAt,
        clickedFrom: 'stock-management',
        darkMode: darkMode
      }
    });
    
    setShowActionMenu(null);
  };

  // const handleDelete = async (productId) => {
  //   if (window.confirm("Are you sure you want to inactivate this stock record?")) {
  //     try {
  //       const username = localStorage.getItem('username') || localStorage.getItem('cashierName') || 'system';
  //       const response = await fetch(`${API_URL}/inactivate/${productId}`, {
  //         method: 'PUT',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({ username })
  //       });
  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.message || 'Failed to inactivate stock record');
  //     }
  //     setProducts(products.filter(product => product._id !== productId));
  //     alert('Stock record moved to inactive!');
  //     setShowActionMenu(null);
  //   } catch (error) {
  //     alert('Failed to inactivate stock record. Please try again.');
  //   }
  //   }
  // };

  // const handleToggleVisibility = async (productId) => {
  //   const product = products.find(p => p._id === productId);
  //   const action = product.visible ? 'hide' : 'make visible';
    
  //   if (window.confirm(`Are you sure you want to ${action} this stock record?`)) {
  //     try {
  //       const username = localStorage.getItem('username') || localStorage.getItem('cashierName') || 'system';
  //       const response = await fetch(`${API_URL}/toggle-visibility/${productId}`, {
  //         method: 'PUT',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({ username })
  //       });
        
  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.message || 'Failed to toggle stock record visibility');
  //     }
        
  //     // Remove the product from the local state since it's now hidden
  //     setProducts(products.filter(product => product._id !== productId));
        
  //     // Show success message
  //     alert(`Stock record ${action} successfully!`);
  //     setShowActionMenu(null);
  //   } catch (error) {
  //     alert('Failed to toggle stock record visibility. Please try again.');
  //   }
  //   }
  // };

  const handleClearAll = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  const groupedByCategory = products.reduce((acc, product) => {
    const category = product.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {});

  const sortedCategories = Object.keys(groupedByCategory).sort();

  return (
    <div className={`product-repair-list-container ${darkMode ? "dark" : ""}`}>
      
      <div className="header-section">
        

        <h2 className={`product-repair-list-title ${darkMode ? "dark" : ""}`}>
          Stock Update List
        </h2>
        {/* Product count moved to action row below */}
      </div>
      
      {/* Helpful message about cart functionality */}
      <div className={`info-message ${darkMode ? "dark" : ""}`}>
        <p>💡 <strong>Tip:</strong> Items added to supplier carts will automatically appear here. Use the "Refresh" button to see the latest items.</p>
      </div>
      
      <div className="search-action-container">
        <div className={`search-bar-container ${darkMode ? "dark" : ""}`}>
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="       Search Item Name"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={`product-list-search-bar ${darkMode ? "dark" : ""}`}
          />
          {searchTerm && (
            <button onClick={handleClearSearch} className="search-clear-btn">
              ✕
            </button>
          )}
        </div>
        <div className='filter-action-row' style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: 14, color: '#666', marginRight: 8 }}>
            Products: {totalProducts}
          </span>
          {/* <button onClick={handleClearAll} className="btn-primary" style={{ background: '#dc3545', color: '#fff' }}>Clear All</button> */}
          {/* <button
          onClick={() => navigate("/StockUpdate", { state: { darkMode } })}
          className={`btn-primary ${darkMode ? "dark" : ""}`}
        >
          <FontAwesomeIcon icon={faPlus} /> Add Stock
        </button> */}
        {/* <button
          onClick={handleRefresh}
          className={`btn-primary ${darkMode ? "dark" : ""}`}
          title="Refresh Stock List"
        >
          <FontAwesomeIcon icon={faRefresh} /> Refresh
        </button> */}
        <button
          onClick={() => setShowReportOptions(true)}
          className={`btn-report ${darkMode ? "dark" : ""}`}
        >
          <FontAwesomeIcon icon={faFile} /> Reports
        </button>
        </div>
      </div>
      {showReportOptions && (
        <div className="report-modal-overlay" onClick={() => setShowReportOptions(false)}>
          <div className={`report-modal-content ${darkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="report-modal-header">
              <h3 style={{
                textAlign: 'center',
                flex: 1,
                width: '100%',
                margin: 0,
                fontWeight: 700,
                fontSize: '1.2rem',
                letterSpacing: '0.01em',
              }}>Select Report Type</h3>
              <button
                onClick={() => setShowReportOptions(false)}
                className="report-modal-close-icon"
              >
                ×
              </button>
            </div>
            <div className="report-modal-buttons">
              <button onClick={generateExcel} className="report-btn black">
                <FontAwesomeIcon icon={faFileExcel} style={{marginRight: 8}} /> Excel
              </button>
              <button onClick={generatePDF} className="report-btn black">
                <FontAwesomeIcon icon={faFilePdf} style={{marginRight: 8}} /> PDF
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <p className="error-message">{error}</p>}
      {loading ? (
        <p className="loading">Loading...</p>
      ) : products.length === 0 ? (
        <p className="no-results">No matching results found.</p>
      ) : (
        <div className="stock-update-categories-container">
          {sortedCategories.map((category) => (
            <div key={category} className={`category-section ${darkMode ? "dark" : ""}`} >
              <h3 className={`category-header ${darkMode ? "dark" : ""}`}>{category}</h3>
              <div className="stock-update-table-container">
                <table className={`stock-update-table ${darkMode ? "dark" : ""}`}>
                  <thead>
                    <tr>
                      <th>GRN</th>
                      <th>Item Name</th>
                      {/* <th>Old Stock</th> */}
                      <th>New Stock</th>
                      {/* <th>Old Buying</th> */}
                      <th>New Buying</th>
                      {/* <th>Old Selling</th> */}
                      <th>New Selling</th>
                      <th>Added Back</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, idx) => (
                      <tr key={product._id || product.itemCode || idx} style={product.source === 'uploaded' ? { background: '#f7f7f7' } : {}}>
                        <td>{product.itemCode}</td>
                        <td>{product.itemName}</td>
                        {/* <td>{product.oldStock || 0}</td> */}
                        <td>{product.stock}</td>
                        {/* <td>{product.oldBuyingPrice || 0}</td> */}
                        <td>{product.buyingPrice}</td>
                        {/* <td>{product.oldSellingPrice || 0}</td> */}
                        <td>{product.sellingPrice}</td>
                        <td>
                          {product.addedBackAt ? (
                            <div>
                              <div>{new Date(product.addedBackAt).toLocaleString()}</div>
                              <div style={{ fontSize: '0.8em', color: '#666' }}>
                                by {product.addedBackBy}
                              </div>
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td>
                          <div className="action-container">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setShowActionMenu(showActionMenu === product._id ? null : product._id);
                              }}
                              className="action-dot-btn"
                            >
                              ⋮
                            </button>
                            {showActionMenu === product._id && (
                              <>
                                <div className="action-menu-overlay" onClick={() => setShowActionMenu(null)} />
                                <div className="action-menu">
                                  <button onClick={() => handleEdit(product)} className="p-edit-btn">
                                    <div className="action-btn-content">
                                      <img src={edticon} alt="edit" width="30" height="30" className="p-edit-btn-icon" />
                                      <span>Edit</span>
                                    </div>
                                  </button>
                                  <button onClick={() => handleAddProduct(product)} className="p-delete-btn">
                                    <div className="action-btn-content">
                                      <img src={deleteicon} alt="delete" width="30" height="30" className="p-delete-btn-icon" />
                                      <span>Delete</span>
                                    </div>
                                  </button>
                                  {/* <button onClick={() => handleToggleVisibility(product._id)} className="p-delete-btn">
                                    <div className="action-btn-content">
                                      <img src={deleteicon} alt="delete" width="30" height="30" className="p-delete-btn-icon" />
                                      <span>{product.visible ? 'Hide' : 'Make Visible'}</span>
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
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Pagination controls below the table */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '16px 0', gap: 10 }}>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
          <span>Page {currentPage} of {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
        </div>
      )}
    </div>
  );
};

export default StockUpdateList;