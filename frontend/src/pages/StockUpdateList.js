import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import "../styles/StockUpdateList.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faFile, faSearch, faFileExcel, faFilePdf, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";

const API_URL = "https://raxwo-manage-backend-production.up.railway.app/api/products";

const StockUpdateList = ({ darkMode }) => {
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

  // Fetch products on mount and when page/search changes
  useEffect(() => {
    fetchProducts(currentPage, searchTerm);
    // eslint-disable-next-line
  }, [currentPage, searchTerm]);

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text("Stock Update List", 14, 15);

    let yPos = 20;

    sortedCategories.forEach((category) => {
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(category, 14, yPos);
      yPos += 10;

      autoTable(doc, {
        startY: yPos,
        head: [
          [
            "GRN",
            "ITEM NAME",
            "OLD STOCK",
            "NEW STOCK",
            "OLD BUYING PRICE",
            "NEW BUYING PRICE",
            "OLD SELLING PRICE",
            "NEW SELLING PRICE",
          ],
        ],
        body: groupedByCategory[category].map((product) => [
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
  };

  const generateExcel = () => {
    const workbook = XLSX.utils.book_new();

    sortedCategories.forEach((category) => {
      const categoryProducts = groupedByCategory[category];

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
      products.map((product) => ({
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
  };

  const normalize = str => (str || '').toLowerCase().replace(/\s+/g, '');

  // Remove old filtering logic (filteredProducts, groupedByCategory, sortedCategories)
  // Instead, group products by category after fetching
  const groupedByCategory = products.reduce((acc, product) => {
    const category = product.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {});
  const sortedCategories = Object.keys(groupedByCategory).sort();

  const handleClearSearch = () => {
    setSearchTerm("");
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

  const handleDelete = async (productId) => {
    if (window.confirm("Are you sure you want to inactivate this stock record?")) {
      try {
        const username = localStorage.getItem('username') || localStorage.getItem('cashierName') || 'system';
        const response = await fetch(`${API_URL}/inactivate/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to inactivate stock record');
        }
        setProducts(products.filter(product => product._id !== productId));
        alert('Stock record moved to inactive!');
        setShowActionMenu(null);
      } catch (error) {
        alert('Failed to inactivate stock record. Please try again.');
      }
    }
  };

  const handleToggleVisibility = async (productId) => {
    const product = products.find(p => p._id === productId);
    const action = product.visible ? 'hide' : 'make visible';
    
    if (window.confirm(`Are you sure you want to ${action} this stock record?`)) {
      try {
        const username = localStorage.getItem('username') || localStorage.getItem('cashierName') || 'system';
        const response = await fetch(`${API_URL}/toggle-visibility/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to toggle stock record visibility');
        }
        
        // Remove the product from the local state since it's now hidden
        setProducts(products.filter(product => product._id !== productId));
        
        // Show success message
        alert(`Stock record ${action} successfully!`);
        setShowActionMenu(null);
      } catch (error) {
        alert('Failed to toggle stock record visibility. Please try again.');
      }
    }
  };

  return (
    <div className={`product-list-container ${darkMode ? "dark" : ""}`}>
      <div className="header-section">
        <h2 className={`product-list-title ${darkMode ? "dark" : ""}`}>
          STOCK UPDATE LIST
        </h2>
      </div>
      <div className="search-action-container">
        <div className={`search-bar-container ${darkMode ? "dark" : ""}`}>
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="       Search Item Name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`product-list-search-bar ${darkMode ? "dark" : ""}`}
          />
          {searchTerm && (
            <button onClick={handleClearSearch} className="search-clear-btn">
              ✕
            </button>
          )}
        </div>
        <button
          onClick={() => navigate("/StockUpdate", { state: { darkMode } })}
          className="btn-primary"
        >
          <FontAwesomeIcon icon={faPlus} /> Add Stock Update
        </button>
        <button
          onClick={() => setShowReportOptions(true)}
          className="btn-report"
        >
          <FontAwesomeIcon icon={faFile} /> Reports
        </button>
      </div>
      {showReportOptions && (
        <div className="report-modal-overlay" onClick={() => setShowReportOptions(false)}>
          <div className={`report-modal-content ${darkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="report-modal-header">
              <h3 className="report-modal-title">Select Report Type</h3>
              <button
                onClick={() => setShowReportOptions(false)}
                className="report-modal-close-icon"
              >
                ✕
              </button>
            </div>
            <div className="report-modal-buttons">
              <button
                onClick={generateExcel}
                className="btn-report-e"
                style={{ background: 'green' }}
              >
                <FontAwesomeIcon icon={faFileExcel} className="report-btn-icon" /> Excel
              </button>
              <button
                onClick={generatePDF}
                className="btn-report-p"
                style={{ background: 'red' }}
              >
                <FontAwesomeIcon icon={faFilePdf} className="report-btn-icon" /> PDF
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
                      <th>Old Stock</th>
                      <th>New Stock</th>
                      <th>Old Buying</th>
                      <th>New Buying</th>
                      <th>Old Selling</th>
                      <th>New Selling</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedByCategory[category].map((product) => (
                      <tr key={product._id}>
                        <td>{product.itemCode}</td>
                        <td>{product.itemName}</td>
                        <td className="old-value">{product.oldStock || 0}</td>
                        <td className="new-value">{product.stock}</td>
                        <td className="old-value">{product.oldBuyingPrice || 0}</td>
                        <td className="new-value">{product.buyingPrice}</td>
                        <td className="old-value">{product.oldSellingPrice || 0}</td>
                        <td className="new-value">{product.sellingPrice}</td>
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
                                <div className={`action-menu ${darkMode ? 'dark' : ''}`}>
                                  <button onClick={() => handleEdit(product)} className="p-edit-btn">
                                    <div className="action-btn-content">
                                      <FontAwesomeIcon icon={faEdit} className="p-edit-btn-icon" />
                                      <span>✏️ EDIT STOCK RECORD</span>
                                    </div>
                                  </button>
                                  <button onClick={() => handleToggleVisibility(product._id)} className="p-delete-btn">
                                    <div className="action-btn-content">
                                      <FontAwesomeIcon icon={faTrash} className="p-delete-btn-icon" />
                                      <span>{product.visible ? 'Hide' : 'Make Visible'}</span>
                                    </div>
                                  </button>
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