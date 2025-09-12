import React, { useState, useEffect, useMemo, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import "./Products.css";
import editicon from './icon/edit.png';
import viewicon from './icon/clipboard.png'; 
import deleteicon from './icon/delete.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile, faFilePdf, faFileExcel, faSearch } from '@fortawesome/free-solid-svg-icons';
import EditProduct from './EditProduct';

const API_URL = "https://raxwo-management.onrender.com/api/products";
const itemsPerPage = 20;

const PRODUCT_API_URL = 'https://raxwo-management.onrender.com/api/products';

const REPAIRS_API_URL = 'https://raxwo-management.onrender.com/api/productsRepair';
const PAYMENTS_API_URL = 'https://raxwo-management.onrender.com/api/payments';

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
  const productsPerPage = 20;
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [hideLowStockOnly, setHideLowStockOnly] = useState(false);
  const [show0StockOnly, setShow0StockOnly] = useState(false);
  const [hide0StockOnly, setHide0StockOnly] = useState(false);
  
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);  

  const [trackItemData, setTrackItemData] = useState(null);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Get all unique categories from products
  const allCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const [categorySearch, setCategorySearch] = useState('');
  const categoryFilterRef = useRef(null);
  
    const filteredCategoriesForSearch = categorySearch.trim() === ''
    ? allCategories
    : allCategories.filter(cat =>
        cat.toLowerCase().includes(categorySearch.toLowerCase().trim())
      );
  

  // Paginated fetch for display
  const fetchProducts = () => {
    setLoading(true);
    setError("");
    let url = `https://raxwo-management.onrender.com/api/product-uploads`;
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
        return response.json();
      })
      .then((data) => {

        const rawProducts = Array.isArray(data.records)
          ? data.records
          : data && typeof data === "object" && "records" in data
            ? data.records
            : [];

        const normalizedProducts = rawProducts.map((product) => {
          const dataObj = product.data || {};
          return {
            _id: product._id,
            grnNumber: product.grnNumber,
            itemCode: product.itemCode,
            itemName: product.itemName,
            category: product.category,
            stock: product.stock,
            buyingPrice: product.buyingPrice,
            sellingPrice: product.sellingPrice,
            supplier: product.Supplier,
            createdAt: product.createdAt,
            addedBackAt: product.addedBackAt
            // Add other fields as needed
          };
        });

        const clickedProducts = JSON.parse(localStorage.getItem("clickedProducts") || "[]");
        const clickedProductIds = clickedProducts.map((cp) => cp._id);

        const availableProducts = normalizedProducts.filter(
          (product) =>
            !product.clickedForAdd && !clickedProductIds.includes(product._id)
        );

        if (data && data.records) {
          setProducts(availableProducts);
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
    fetchProducts();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (categoryFilterRef.current && !categoryFilterRef.current.contains(event.target)) {
        setShowCategoryFilter(false);
        setCategorySearch(''); // Optional: reset search when closing
      }
    }

    // Only attach listener if the filter is open
    if (showCategoryFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategoryFilter]);

  const normalize = (str) => str.toLowerCase().replace(/\s+/g, ' ');

  function fuzzyIncludes(haystack, needle) {

  
    // Remove non-alphanumeric and split needle into chars
    const cleanHaystack = Array.from(haystack);
    const cleanNeedle = Array.from(needle);

    // console.log("Search query", cleanHaystack, cleanNeedle);

    let j = 0; // pointer in haystack
    for (let i = 0; i < cleanNeedle.length; i++) {
      const char = cleanNeedle[i];
      let found = false;
      while (j < cleanHaystack.length) {
        if (cleanHaystack[j] === char) {
          found = true;
          j++;
          break;
        }
        j++;
      }
      if (!found) return false;
    }
    return true;
  }

  // const filteredProductsForModal = searchQuery.trim() === ""
  //   ? products
  //   : products.filter(product => {
  //       const searchableText = (product.itemName + ' ' + product.category + ' ' + product.itemCode).toLowerCase();

  //       // Split query into words and test each as a whole word or number
  //       const words = normalize(searchQuery).trim().split(/\s+/);

  //       return words.every(word => {
  //         // Create a regex with word boundaries for exact partial matching
  //         const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  //         return regex.test(searchableText);
  //       });
  //     });

  const sortedAndFilteredProducts = useMemo(() => {
    
    let result = products;

    // Apply search filter only if query exists
    if (searchQuery.trim() !== '') {
      // result = products.filter(product => {
      //   const searchableText = normalize(product.grnNumber + ' ' + product.itemName + ' ' + product.category + ' ' + product.itemCode);
      //   const words = normalize(searchQuery).trim().split(/\s+/);

      //   return words.every(word => {
      //     const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      //     if (/^\d+$/.test(word)) {
      //       // Numeric: require word boundaries (exact number match)
      //       const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
      //       return regex.test(searchableText);
      //     } else {
      //       // Text: allow partial substring match
      //       const regex = new RegExp(escapedWord, 'i');
      //       return regex.test(searchableText);
      //     }
      //   });
      // });
      let subresult1 = products.filter(product => {
        const name = (product.grnNumber  + product.itemName).toLowerCase()
        .trim()
        .replace(/\s+/g, '');
        

        // Split query into meaningful words, remove empty
        const queryWords = searchQuery
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '');
        // .replace(/[^a-z0-9\s]/g, '') // Remove punctuation
        // .split(/\s+/)
        // .filter(Boolean);

        // If no valid words, show all
        if (queryWords.length === 0) return true;

        // console.log("Search query", queryWords);

        return name.includes(queryWords);
      }).sort((a, b) => a.itemName.localeCompare(b.itemName));

      let subresult2 = products.filter(product => {
        const name = (product.grnNumber  + product.itemName).toLowerCase()
        .trim()
        .replace(/\s+/g, '');
        

        // Split query into meaningful words, remove empty
        const queryWords = searchQuery
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '');
        // .replace(/[^a-z0-9\s]/g, '') // Remove punctuation
        // .split(/\s+/)
        // .filter(Boolean);

        // If no valid words, show all
        if (queryWords.length === 0) return true;

        // console.log("Search query", queryWords);
        
        return fuzzyIncludes(name, queryWords);
      }).sort((a, b) => a.itemName.localeCompare(b.itemName));

      if (subresult1.length === 0) {
        result = subresult2;
      }
      else{
        result = subresult1;
      }
    }

    if (selectedCategories.size > 0) {
      result = result.filter(product =>
        selectedCategories.has(product.category)
      );
    }

    // Apply low stock filter if checkbox is checked
    if (showLowStockOnly) {
      result = result.filter(product => (product.stock || 0) <= 2 );
    }

    if (hideLowStockOnly) {
      result = result.filter(product => (product.stock || 0) > 2 );
    }

    if (show0StockOnly) {
      result = result.filter(product => (product.stock || 0) === 0);
    }

    if (hide0StockOnly) {
      result = result.filter(product => (product.stock || 0) !== 0);
    }

    else{
      result = result;
      
    }

    // Apply sorting
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let valueA = '';
        let valueB = '';

        switch (sortConfig.key) {
          case 'grnNumber':
            valueA = a.grnNumber || '';
            valueB = b.grnNumber || '';
            break;
          case 'itemName':
            valueA = a.itemName || '';
            valueB = b.itemName || '';
            break;
          case 'buyingPrice':
            valueA = a.buyingPrice || 0;
            valueB = b.buyingPrice || 0;
            break;
          case 'sellingPrice':
            valueA = a.sellingPrice || 0;
            valueB = b.sellingPrice || 0;
            break;
          case 'stock':
            valueA = a.stock || 0;
            valueB = b.stock || 0;
            break;
          default:
            return 0;
        }

        // Numeric comparison
        if (typeof valueA === 'number') {
          return sortConfig.direction === 'asc' ? valueA - valueB : valueB - valueA;
        }

        // String comparison
        valueA = String(valueA).toLowerCase();
        valueB = String(valueB).toLowerCase();
        if (valueA < valueB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [products, searchQuery, sortConfig, showLowStockOnly, show0StockOnly, hide0StockOnly, hideLowStockOnly, selectedCategories]);

  const totalProductPages = Math.ceil(sortedAndFilteredProducts.length / productsPerPage);
  const paginatedProductsForModal = sortedAndFilteredProducts.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage);

  // Group products by category (for current page)
  const groupedByCategory = paginatedProductsForModal.reduce((acc, product) => {
    const category = product.supplier === "Unknown" ?  `${product.category}` : `${product.category}`;
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {});
  const sortedCategories = Object.keys(groupedByCategory).sort(products.category);

  // Fetch all products for report
  // const fetchAllProductsForReport = async (search = "") => {
  //   let url = `${API_URL}`;
  //   if (search) url += `?search=${encodeURIComponent(search)}`;
  //   const response = await fetch(url);
  //   if (!response.ok) throw new Error('Failed to fetch all products for report');
  //   const data = await response.json();
  //   if (data && data.records) return data.records;
  //   if (Array.isArray(data)) return data;
  //   return [];
  // };

  // Report generation
  const generatePDF = async () => {
    try {
      // const allProducts = await fetchAllProductsForReport(searchQuery);
      const grouped = sortedAndFilteredProducts.reduce((acc, product) => {
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
            product.grnNumber,
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
      // const allProducts = await fetchAllProductsForReport(searchQuery);
      const grouped = sortedAndFilteredProducts.reduce((acc, product) => {
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
            "GRN": product.grnNumber,
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
      console.log("Found ", repairsUsed);
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
      const usageRecords = [...repairsUsed, ...formattedPaymentsUsed].sort(
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

  // Action handlers (dummy for now)
  const handleEdit = (product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };
  const handleDelete = (product) => {
    alert(`Delete product: ${product.itemName}`);
  };

  const handleSort = (key) => {
  setSortConfig((prevConfig) => {
    const direction =
      prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc';
    return { key, direction };
  });
};

  return (
    <div className={`product-list-container ${darkMode ? "dark" : ""}`}>  
      <div className="header-section">
        <h2 className={`product-list-title ${darkMode ? "dark" : ""}`}>Stock Update List</h2>
      </div>
      <div className="search-action-container">
        <div className={`search-bar-container ${darkMode ? "dark" : ""}`}>
          {(!searchQuery) ? <FontAwesomeIcon icon={faSearch} className="search-icon" /> : <></> }
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
          {/* Low Stock Filter Checkbox */}
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 14, color: '#666', marginRight: 4 }}>
            Show Low Stock
          
            <span style={{ fontSize: 14, color: '#666', marginLeft: 8, marginTop: 8, marginRight: 8 }}>
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => {setShowLowStockOnly(e.target.checked); setHideLowStockOnly(false);}}
              />
            </span>

            Hide Low Stock

            <span style={{ fontSize: 14, color: '#666', marginLeft: 8, marginTop: 8 }}>
              <input
                type="checkbox"
                checked={hideLowStockOnly}
                onChange={(e) => {setHideLowStockOnly(e.target.checked); setShowLowStockOnly(false);}}
              />
            </span>
          
          </span>
          <span>/</span>
          {/* Low Stock Filter Checkbox */}
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 14, color: '#666', marginRight: 8 }}>
            Show 0 Stock 
          
            <span style={{ fontSize: 14, color: '#666', marginLeft: 8, marginTop: 8, marginRight: 8 }}>
              <input
                type="checkbox"
                checked={show0StockOnly}
                onChange={(e) => {setShow0StockOnly(e.target.checked); setHide0StockOnly(false);}}
              />
            </span>

            Hide 0 Stock 
          
            <span style={{ fontSize: 14, color: '#666', marginLeft: 8, marginTop: 8 }}>
              <input
                type="checkbox"
                checked={hide0StockOnly}
                onChange={(e) => {setHide0StockOnly(e.target.checked); setShow0StockOnly(false);}}
              />
            </span>
          
          </span>
          <button
            onClick={() => setShowReportOptions(true)}
            className={`btn-report ${darkMode ? "dark" : ""}`}
          >
            <FontAwesomeIcon icon={faFile} /> Report
          </button>
        </div>
      </div>
      <div className="search-action-container">
        <div className="category-filter-container" style={{ marginTop: '12px' }} ref={categoryFilterRef} >
          {/* Filter Button to Expand/Collapse */}
          <button
            type="button"
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            style={{
              background: darkMode ? '#334155' : '#e2e8f0',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              color: darkMode ? '#e2e8f0' : '#1e293b',
              width: 'fit-content',
            }}
          >
            <span>{showCategoryFilter ? '🔽' : '▶️'}</span>
            <span>
              Filter by Category {selectedCategories.size > 0 && `(${selectedCategories.size})`}
            </span>
          </button>

          {/* Category Filter Panel (Visible when toggled) */}
          {showCategoryFilter && (
            <div
              style={{
                marginTop: '10px',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: darkMode ? '#1a1a1a' : '#f8fafc',
                border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                boxShadow: darkMode ? '0 2px 4px rgba(0, 0, 0, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              {/* Search Inside Categories */}
              <input
                type="text"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  marginBottom: '12px',
                  border: `1px solid ${darkMode ? '#475569' : '#cbd5e1'}`,
                  borderRadius: '6px',
                  backgroundColor: darkMode ? '#2d3748' : '#fff',
                  color: darkMode ? '#e2e8f0' : '#1e293b',
                  fontSize: '14px',
                }}
              />

              {/* Select All / Clear Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    const filtered = filteredCategoriesForSearch;
                    setSelectedCategories(new Set([...selectedCategories, ...filtered]));
                  }}
                  style={{
                    fontSize: '12px',
                    padding: '6px 10px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Select All Shown
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategories(new Set())}
                  style={{
                    fontSize: '12px',
                    padding: '6px 10px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Clear All
                </button>
              </div>

              {/* Category Checkboxes Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: '10px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {filteredCategoriesForSearch.length === 0 ? (
                  <span
                    style={{
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      color: darkMode ? '#94a3b8' : '#64748b',
                      fontStyle: 'italic',
                      fontSize: '13px',
                      padding: '8px 0',
                    }}
                  >
                    No matching categories
                  </span>
                ) : (
                  filteredCategoriesForSearch.map((category) => (
                    <label
                      key={category}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: darkMode ? '#e2e8f0' : '#1e293b',
                        padding: '6px',
                        borderRadius: '4px',
                        border: selectedCategories.has(category)
                          ? '2px solid #1abc9c'
                          : `1px solid ${darkMode ? '#475569' : '#cbd5e1'}`,
                        backgroundColor: selectedCategories.has(category)
                          ? darkMode ? '#0f302a' : '#e7faf3'
                          : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.has(category)}
                        onChange={(e) => {
                          const newSet = new Set(selectedCategories);
                          if (e.target.checked) {
                            newSet.add(category);
                          } else {
                            newSet.delete(category);
                          }
                          setSelectedCategories(newSet);
                        }}
                        style={{ accentColor: '#1abc9c' }}
                      />
                      {category}
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
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
      {/* TRACK ITEM MODAL */}
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
                      <td>{record.quantity}</td>
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
      {showEditModal && selectedProduct && (
        <EditProduct
          product={selectedProduct}
          closeModal={() => {
            setShowEditModal(false);
            setSelectedProduct(null);
            fetchProducts();
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
                      <th onClick={() => handleSort('grnNumber')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        GRN
                        {sortConfig.key === 'grnNumber' && (
                          <span style={{ marginLeft: '8px' }}>
                            {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                          </span>
                        )}
                      </th>
                      {/* <th>
                        Item Code
                      </th> */}
                      <th onClick={() => handleSort('itemName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Item Name
                        {sortConfig.key === 'itemName' && (
                          <span style={{ marginLeft: '8px' }}>
                            {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                          </span>
                        )}
                      </th>
                      <th onClick={() => handleSort('buyingPrice')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Buying Price
                        {sortConfig.key === 'buyingPrice' && (
                          <span style={{ marginLeft: '8px' }}>
                            {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                          </span>
                        )}
                      </th>
                      <th onClick={() => handleSort('sellingPrice')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Selling Price
                        {sortConfig.key === 'sellingPrice' && (
                          <span style={{ marginLeft: '8px' }}>
                            {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                          </span>
                        )}
                      </th>
                      <th onClick={() => handleSort('stock')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Stock
                        {sortConfig.key === 'stock' && (
                          <span style={{ marginLeft: '8px' }}>
                            {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                          </span>
                        )}
                      </th>
                      <th>
                        Supplier
                      </th>
                      {/* <th>Created At</th> */}
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedByCategory[category].map((product, idx) => (
                      <tr key={product._id || product.itemCode || idx}>
                        <td>
                          <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight:  'bold'  }}>
                            {product.grnNumber} 
                          </span>
                        </td>
                        {/* <td>
                          <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight:  'bold'  }}>
                            {product.itemCode} 
                          </span>
                        </td> */}
                        <td>
                          <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight:  'bold'  }}>
                            {product.itemName} 
                          </span>
                        </td>
                        <td>
                          <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight:  'bold'  }}>
                            {product.buyingPrice}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight:  'bold'  }}>
                            {product.sellingPrice}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight:  'bold'  }}>
                            {product.stock}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight:  'bold'  }}>
                            {product.supplier === 'Unknown' ? 'SYSTEM' : product.supplier }
                          </span>
                        </td>
                        {/* <td>{product.createdAt ? new Date(product.createdAt).toLocaleString() : ""}</td> */}
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
                                  <button onClick={() => {
                                    setShowActionMenu(null);
                                    handleTrackItem(product);
                                  }} className="p-track-btn">
                                    <div className="action-btn-content">
                                      <img src={viewicon} alt="track" width="30" height="30" className="p-track-btn-icon" />
                                      <span>Track Usage</span>
                                    </div>
                                  </button>
                                  <button onClick={() => handleEdit(product)} className="p-edit-btn">
                                    <div className="action-btn-content">
                                      <img src={editicon} alt="edit" width="30" height="30" className="p-edit-btn-icon" />
                                      <span>Edit</span>
                                    </div>
                                  </button>
                                  {/* <button onClick={() => handleDelete(product)} className="p-delete-btn">
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
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Pagination controls below the table */}
      {totalProductPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '16px 0', gap: 10 }}>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
          <span>Page {currentPage} of {totalProductPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalProductPages, p + 1))} disabled={currentPage === totalProductPages}>Next</button>
        </div>
      )}
    </div>
  );
};

export default CategoryProductList; 