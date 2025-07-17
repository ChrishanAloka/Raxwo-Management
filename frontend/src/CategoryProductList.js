import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import "./Products.css";
import editicon from './icon/edit.png';
import deleteicon from './icon/delete.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile, faFilePdf, faFileExcel, faSearch } from '@fortawesome/free-solid-svg-icons';
import EditProduct from './EditProduct';

const API_URL = "https://raxwo-manage-backend-production.up.railway.app/api/products";
const itemsPerPage = 20;

const CategoryProductList = ({ darkMode }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Paginated fetch for display
  const fetchProducts = (page = 1, search = "") => {
    setLoading(true);
    setError("");
    let url = `${API_URL}?page=${page}&limit=${itemsPerPage}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
        return response.json();
      })
      .then((data) => {
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
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts(currentPage, searchQuery);
    // eslint-disable-next-line
  }, [currentPage, searchQuery]);

  // Group products by category (for current page)
  const groupedByCategory = products.reduce((acc, product) => {
    const category = product.category || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {});
  const sortedCategories = Object.keys(groupedByCategory).sort();

  // Fetch all products for report
  const fetchAllProductsForReport = async (search = "") => {
    let url = `${API_URL}`;
    if (search) url += `?search=${encodeURIComponent(search)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch all products for report');
    const data = await response.json();
    if (data && data.records) return data.records;
    if (Array.isArray(data)) return data;
    return [];
  };

  // Report generation
  const generatePDF = async () => {
    try {
      const allProducts = await fetchAllProductsForReport(searchQuery);
      const grouped = allProducts.reduce((acc, product) => {
        const category = product.category || "Uncategorized";
        if (!acc[category]) acc[category] = [];
        acc[category].push(product);
        return acc;
      }, {});
      const sorted = Object.keys(grouped).sort();
      const doc = new jsPDF();
      doc.text("Stock Update List", 14, 15);
      let yPos = 20;
      sorted.forEach((category) => {
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text(category, 14, yPos);
        yPos += 10;
        autoTable(doc, {
          startY: yPos,
          head: [[
            "GRN",
            "Item Name",
            "Buying Price",
            "Selling Price",
            "Stock",
            "Created At",
          ]],
          body: grouped[category].map((product) => [
            product.itemCode,
            product.itemName,
            product.buyingPrice,
            product.sellingPrice,
            product.stock,
            product.createdAt ? new Date(product.createdAt).toLocaleString() : "",
          ]),
        });
        yPos = doc.lastAutoTable.finalY + 15;
      });
      doc.save("Category_Product_List.pdf");
      setShowReportOptions(false);
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    }
  };

  const generateExcel = async () => {
    try {
      const allProducts = await fetchAllProductsForReport(searchQuery);
      const grouped = allProducts.reduce((acc, product) => {
        const category = product.category || "Uncategorized";
        if (!acc[category]) acc[category] = [];
        acc[category].push(product);
        return acc;
      }, {});
      const sorted = Object.keys(grouped).sort();
      const workbook = XLSX.utils.book_new();
      sorted.forEach((category) => {
        const categoryProducts = grouped[category];
        const worksheet = XLSX.utils.json_to_sheet(
          categoryProducts.map((product) => ({
            "GRN": product.itemCode,
            "Item Name": product.itemName,
            "Buying Price": product.buyingPrice,
            "Selling Price": product.sellingPrice,
            "Stock": product.stock,
            "Created At": product.createdAt ? new Date(product.createdAt).toLocaleString() : "",
          }))
        );
        XLSX.utils.book_append_sheet(workbook, worksheet, category.substring(0, 31));
      });
      XLSX.writeFile(workbook, "Category_Product_List.xlsx");
      setShowReportOptions(false);
    } catch (err) {
      alert('Failed to generate Excel: ' + err.message);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Action handlers (dummy for now)
  const handleEdit = (product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };
  const handleDelete = (product) => {
    alert(`Delete product: ${product.itemName}`);
  };

  return (
    <div className={`product-list-container ${darkMode ? "dark" : ""}`}>  
      <div className="header-section">
        <h2 className={`product-list-title ${darkMode ? "dark" : ""}`}>Stock Update List</h2>
      </div>
      <div className="search-action-container">
        <div className={`search-bar-container ${darkMode ? "dark" : ""}`}>
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="       Search Item Name"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className={`product-list-search-bar ${darkMode ? "dark" : ""}`}
          />
          {searchQuery && (
            <button onClick={handleClearSearch} className="search-clear-btn">
              ✕
            </button>
          )}
        </div>
        <div className='filter-action-row' style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: 14, color: '#666', marginRight: 8 }}>
            Products: {totalProducts}
          </span>
          <button
            onClick={() => setShowReportOptions(true)}
            className={`btn-report ${darkMode ? "dark" : ""}`}
          >
            <FontAwesomeIcon icon={faFile} /> Report
          </button>
        </div>
      </div>
      {showReportOptions && (
        <div className="report-modal-overlay" onClick={() => setShowReportOptions(false)}>
          <div className={`report-modal-content ${darkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="report-modal-header">
              <h3 style={{ textAlign: 'center', flex: 1, width: '100%', margin: 0, fontWeight: 700, fontSize: '1.2rem', letterSpacing: '0.01em' }}>Download Report</h3>
              <button onClick={() => setShowReportOptions(false)} className="report-modal-close-icon">×</button>
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
      {showEditModal && selectedProduct && (
        <EditProduct
          product={selectedProduct}
          closeModal={() => {
            setShowEditModal(false);
            setSelectedProduct(null);
            fetchProducts(currentPage, searchQuery);
          }}
          darkMode={darkMode}
          showGRN={false}
        />
      )}
      {error && <p className="error-message">{error}</p>}
      {loading ? (
        <p className="loading">Loading...</p>
      ) : products.length === 0 ? (
        <p className="no-results">No products found.</p>
      ) : (
        <div className="category-products-container">
          {sortedCategories.map((category) => (
            <div key={category} className={`category-section ${darkMode ? "dark" : ""}`} >
              <h3 className={`category-header ${darkMode ? "dark" : ""}`}>{category}</h3>
              <div className="product-table-container">
                <table className={`product-table ${darkMode ? "dark" : ""}`}>
                  <thead>
                    <tr>
                      <th>GRN</th>
                      <th>Item Name</th>
                      <th>Buying Price</th>
                      <th>Selling Price</th>
                      <th>Stock</th>
                      <th>Created At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedByCategory[category].map((product, idx) => (
                      <tr key={product._id || product.itemCode || idx}>
                        <td>{product.itemCode}</td>
                        <td>{product.itemName}</td>
                        <td>{product.buyingPrice}</td>
                        <td>{product.sellingPrice}</td>
                        <td>{product.stock}</td>
                        <td>{product.createdAt ? new Date(product.createdAt).toLocaleString() : ""}</td>
                        <td>
                          <div className="action-container">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setShowActionMenu(showActionMenu === (product._id || product.itemCode || idx) ? null : (product._id || product.itemCode || idx));
                              }}
                              className="action-dot-btn"
                            >
                              ⋮
                            </button>
                            {showActionMenu === (product._id || product.itemCode || idx) && (
                              <>
                                <div className="action-menu-overlay" onClick={() => setShowActionMenu(null)} />
                                <div className="action-menu">
                                  <button onClick={() => handleEdit(product)} className="p-edit-btn">
                                    <div className="action-btn-content">
                                      <img src={editicon} alt="edit" width="30" height="30" className="p-edit-btn-icon" />
                                      <span>Edit</span>
                                    </div>
                                  </button>
                                  <button onClick={() => handleDelete(product)} className="p-delete-btn">
                                    <div className="action-btn-content">
                                      <img src={deleteicon} alt="delete" width="30" height="30" className="p-delete-btn-icon" />
                                      <span>Delete</span>
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

export default CategoryProductList; 