import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AddSupplier from './AddSupplier';
import CartForm from './CartForm';
import Discounts from './Discounts';
import PastPayment from './PastPayment';
import RepairService from './RepairService';
import SummaryForm from '../components/SummaryForm';
import PaymentForm from '../components/PaymentForm';
import suppliericon from '../icon/add (1).png';
import '../styles/Supplier.css';
import editicon from '../icon/edit.png';
import deleteicon from '../icon/delete.png';
import cart from '../icon/shopping-cart.png';
import viewicon from '../icon/clipboard.png';
import jobBillIcon from "../icon/bill.png";
import payicon from '../icon/payment.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFile, faFilePdf, faFileExcel, faSearch, faTimes, faChartBar, faWrench, faPercentage } from '@fortawesome/free-solid-svg-icons';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { TbBackground } from 'react-icons/tb';
import SupplierUpdate from './SupplierUpdate';
import Select from 'react-select';

const SupplierList = ({ darkMode }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showPastPaymentModal, setshowPastPaymentModal] = useState(false);
  const [showDiscountModal, setshowDiscountModal] = useState(false);
  const [showRepairServiceModal, setshowRepairServiceModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showItemDetailsModal, setShowItemDetailsModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [itemDetails, setItemDetails] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [products, setProducts] = useState([]);
  const [notification, setNotification] = useState('');
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);

  const [grnReturnTotal, setGrnReturnTotal] = useState(0);
  const [returnStocks, setReturnStocks] = useState({});

  const userRole = localStorage.getItem('role');

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch('https://raxwo-management.onrender.com/api/suppliers', {
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`Failed to fetch suppliers: ${response.statusText}`);
      }
      const data = await response.json();
      setSuppliers(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching suppliers');
      setSuppliers([]);
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('https://raxwo-management.onrender.com/api/products');
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }
      const data = await response.json();
      
      // For supplier functionality, we need to show all products (including deleted ones)
      // because supplier cart items should remain visible even if the product is deleted from main list
      const allProducts = Array.isArray(data) ? data : data.products || [];
      setProducts(allProducts);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching products');
    }
  };

  // ✅ NEW: Fetch per-GRN return stocks for a given GRN number
  const fetchGrnReturnStocks = async (supplierId, grnNumber) => {
    try {
      // 1. Fetch items for this GRN
      const response = await fetch(
        `https://raxwo-management.onrender.com/api/suppliers/${supplierId}/items/grn/${encodeURIComponent(grnNumber)}`
      );
      if (!response.ok) throw new Error('Failed to fetch GRN items');
      
      const items = await response.json();
      if (!Array.isArray(items) || items.length === 0) return { items: [], returnStocks: {}, returnedValue: 0 };

      // 2. Fetch return stock for each item
      const returnStocks = {};
      let returnedValue = 0;

      for (const item of items) {
        if (item.itemCode) {
          try {
            const prodRes = await fetch(`https://raxwo-management.onrender.com/api/products/${encodeURIComponent(item.itemCode)}`);
            if (prodRes.ok) {
              const product = await prodRes.json();
              const returnedQty = product.returnstock || 0;
              // Cap returned qty to not exceed GRN quantity (safety)
              const actualReturned = Math.min(returnedQty, item.quantity || 0);
              returnStocks[item.itemCode] = actualReturned;
              returnedValue += actualReturned * (item.buyingPrice || 0);
            }
          } catch (err) {
            console.warn(`Could not fetch return stock for ${item.itemCode}`);
            returnStocks[item.itemCode] = 0;
          }
        }
      }

      return { items, returnStocks, returnedValue };
    } catch (err) {
      console.error('Error fetching GRN return stocks:', err);
      return { items: [], returnStocks: {}, returnedValue: 0 };
    }
  };

  const refreshProducts = () => {
    fetchProducts();
    setTimeout(() => setNotification(''), 5000);
  };

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setShowEditSupplierModal(true);
    setShowActionMenu(null);
  };

  const token = localStorage.getItem('token');
  
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        const changedBy = localStorage.getItem('username') || localStorage.getItem('cashierName') || 'system';
        const response = await fetch(`https://raxwo-management.onrender.com/api/suppliers/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ changedBy }),
        });
        if (!response.ok) {
          throw new Error('Failed to delete supplier');
        }
        setSuppliers(suppliers.filter((supplier) => supplier._id !== id));
        setShowActionMenu(null);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleCart = (supplier) => {
    setSelectedSupplier(supplier);
    setShowCartModal(true);
    setShowActionMenu(null);
  };

  const handlePastpayment = (supplier) => {
    setSelectedSupplier(supplier);
    setshowPastPaymentModal(true);
    setShowActionMenu(null);
  };

  const handleDiscounts = (supplier) => {
    setSelectedSupplier(supplier);
    setshowDiscountModal(true);
    setShowActionMenu(null);
  };

  const handleRepairService = (supplier) => {
    setSelectedSupplier(supplier);
    setshowRepairServiceModal(true);
    setShowActionMenu(null);
  };

  const handlePay = (supplier) => {
    const grnOptions = getGrnOptionsFromSupplier(supplier, products);
    setSelectedSupplier({ ...supplier, grnOptions }); 
    setShowPaymentModal(true);
    setShowActionMenu(null);
  };

  const handleView = (supplierId) => {
    navigate(`/suppliers/${supplierId}/cart`);
    setShowActionMenu(null);
  };

  const handleItemDetails = () => {
    setShowItemDetailsModal(true);
  };

  const fetchReturnStock = async (itemCode) => {
    try {
      const response = await fetch(`https://raxwo-management.onrender.com/api/products/${encodeURIComponent(itemCode)}`);
      if (!response.ok) {
        console.warn(`Product ${itemCode} not found`);
        return 0;
      }
      const product = await response.json();
      return product.returnstock || 0;
    } catch (err) {
      console.error(`Error fetching return stock for ${itemCode}:`, err);
      return 0;
    }
  };

  const calculateGrnReturnTotal = async (itemsInGrn) => {
    let totalReturned = 0;
    for (const item of itemsInGrn) {
      if (item.itemCode) {
        try {
          const response = await fetch(`https://raxwo-management.onrender.com/api/products/${encodeURIComponent(item.itemCode)}`);
          if (response.ok) {
            const product = await response.json();
            // Add the returnstock for this item
            totalReturned += product.returnstock || 0;
          }
        } catch (err) {
          console.warn(`Could not fetch return stock for ${item.itemCode}`);
        }
      }
    }
    setGrnReturnTotal(totalReturned);
  };

  const fetchItemDetails = async () => {
    if (!selectedSupplier || !selectedItemCode) return;

    setLoading(true);
    setError(null);
    setItemDetails([]);
    setGrnReturnTotal(0); // reset
    setReturnStocks({});
    try {
      const response = await fetch(
        `https://raxwo-management.onrender.com/api/suppliers/${selectedSupplier._id}/items/grn/${encodeURIComponent(selectedItemCode)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch item details from supplier');
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : [];

       setItemDetails(items);

       // ✅ Calculate total returned for this GRN
      if (items.length > 0) {
        calculateGrnReturnTotal(items);
      }

      // ✅ Fetch return stock for each unique itemCode in this GRN
      if (items.length > 0) {
        const stocks = {};
        const uniqueItemCodes = [...new Set(items.map(item => item.itemCode).filter(Boolean))];
        
        for (const code of uniqueItemCodes) {
          stocks[code] = await fetchReturnStock(code);
        }
        setReturnStocks(stocks);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text('Supplier List', 90, 20);
    const tableColumn = ['Supplier Name', 'Business Name', 'Phone Number', 'Address'];
    const tableRows = suppliers.map((supplier) => [
      supplier.supplierName || 'N/A',
      supplier.businessName || 'N/A',
      supplier.phoneNumber || 'N/A',
      supplier.address || 'N/A',
    ]);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 30 });
    doc.save('Supplier_List.pdf');
    setShowReportOptions(false);
  };

  const generateExcel = () => {
    const formattedSuppliers = suppliers.map((supplier) => ({
      'Supplier Name': supplier.supplierName || 'N/A',
      'Business Name': supplier.businessName || 'N/A',
      'Phone Number': supplier.phoneNumber || 'N/A',
      Address: supplier.address || 'N/A',
    }));
    const worksheet = XLSX.utils.json_to_sheet(formattedSuppliers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers');
    XLSX.writeFile(workbook, 'Supplier_List.xlsx');
    setShowReportOptions(false);
  };

  const normalize = str => (str || '').toLowerCase();

  const filteredSuppliers = suppliers.filter(supplier => {
    const query = normalize(searchQuery).trim();
    if (!query) return true;

    // Split query into individual words (e.g., "john tech" → ["john", "tech"])
    const queryWords = query.split(' ').filter(word => word);

    const supplierName = normalize(supplier.supplierName);
    const businessName = normalize(supplier.businessName);
    const phoneNumber = normalize(supplier.phoneNumber);

    const matchesStandard =
      supplierName.includes(query) ||
      businessName.includes(query) ||
      phoneNumber.includes(query);

    // If standard match, include
    if (matchesStandard) return true;

    // Otherwise, check if any item in supplier.items has grnNumber matching query
    if (Array.isArray(supplier.items)) {
      return supplier.items.some(item =>
        normalize(item.grnNumber).includes(query)
      );
    }

    return false;

    // Check if each query word matches *anywhere* in either field
    // return queryWords.every(word =>
    //   supplierName.includes(word) ||
    //   businessName.includes(word) ||
    //   phoneNumber.includes(word)
    // );
  }); 

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const getGrnOptionsFromSupplier = (supplier) => {
    if (!supplier || !Array.isArray(supplier.items)) return [];

    const grnGroups = {};

    // Group items by grnNumber
    supplier.items.forEach(item => {
      if (!item.grnNumber) return; // Skip items without GRN

      if (!grnGroups[item.grnNumber]) {
        grnGroups[item.grnNumber] = {
          grnNumber: item.grnNumber,
          grnDate: item.createdAt, // Use the item's date as GRN date
          totalAmount: 0,
          itemCount: 0,
          items: [] // Keep items for return calculation
        };
      }

      grnGroups[item.grnNumber].totalAmount += (item.buyingPrice || 0) * (item.quantity || 0);
      grnGroups[item.grnNumber].itemCount += item.quantity || 0;
      grnGroups[item.grnNumber].items.push(item);
    });

    // Convert to sorted array (newest first)
    return Object.values(grnGroups)
      .sort((a, b) => new Date(b.grnDate) - new Date(a.grnDate)) // newest first
      .map(grn => {

        // ✅ Calculate returns for this GRN (using global product returnstock)
        let returnedValue = 0;
        grn.items.forEach(item => {
          if (item.itemCode) {
            // Find product returnstock (you'll need products array)
            const product = products.find(p => p.itemCode === item.itemCode);
            if (product) {
              const returnedQty = product.returnstock || 0;
              const actualReturned = Math.min(returnedQty, item.quantity || 0);
              returnedValue += actualReturned * (item.buyingPrice || 0);
            }
          }
        });

        // ✅ Calculate discounts for this GRN
        const grnDiscounts = (supplier.discounts || []).filter(d =>
          String(d.grnNumber) === grn.grnNumber
        );
        const totalDiscounts = grnDiscounts.reduce((sum, d) => sum + (d.discountCharge || 0), 0);

        // ✅ Calculate payable amount
        const payableAmount = Math.max(0, grn.totalAmount - returnedValue - totalDiscounts);

        const formattedDate = new Date(grn.grnDate).toLocaleDateString('en-GB'); // DD/MM/YYYY
        const label = `${grn.grnNumber} | ${formattedDate} | Rs. ${grn.totalAmount.toFixed(2)} | Payable: Rs. ${payableAmount.toFixed(2)}`;
        return {
          value: grn.grnNumber,
          label: label,
          grnDate: grn.grnDate,
          totalAmount: grn.totalAmount,
          payableAmount: payableAmount, // ✅ Include for PaymentForm
          returnedValue: returnedValue,
          totalDiscounts: totalDiscounts
        };
      });
  };

  return (
    <div className={`product-repair-list-container ${darkMode ? "dark" : ""}`}>
      <div className="header-section">
        <h2 className={`product-repair-list-title ${darkMode ? "dark" : ""}`}>Supplier List</h2>
      </div>
      <div className="search-action-container">
        <div className={`search-bar-container ${darkMode ? 'dark' : ''}`}>
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="       Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`product-list-search-bar ${darkMode ? 'dark' : ''}`}
          />
          {searchQuery && (
            <button onClick={handleClearSearch} className="search-clear-btn">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>
        <div className='filter-action-row'>
          <button onClick={() => setShowAddSupplierModal(true)} className="btn-primary">
            <FontAwesomeIcon icon={faPlus} /> Add Supplier
          </button>
          <button onClick={() => setShowSummaryModal(true)} className="btn-summary">
            <FontAwesomeIcon icon={faChartBar} /> Summary
          </button>
          <button onClick={handleItemDetails} className="btn-summary">
            <FontAwesomeIcon icon={faChartBar} /> Item Details
          </button>
          <button onClick={() => setShowReportOptions(true)} className="btn-report">
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
      {showSummaryModal && (
        <SummaryForm
          suppliers={suppliers}
          closeModal={() => setShowSummaryModal(false)}
          darkMode={darkMode}
          fetchGrnReturnStocks={fetchGrnReturnStocks}
        />
      )}
      {showPaymentModal && selectedSupplier && (
        <PaymentForm
          supplier={selectedSupplier}
          fetchGrnReturnStocks={(grnNumber) => 
            fetchGrnReturnStocks(selectedSupplier._id, grnNumber)
          }
          closeModal={() => {
            setShowPaymentModal(false);
            setSelectedSupplier(null);
          }}
          refreshSuppliers={fetchSuppliers}
          darkMode={darkMode}
        />
      )}
      {showItemDetailsModal && (
        <div className="product-summary-modal-overlay-supplier">
          <div className={`product-summary-modal-content-supplier ${darkMode ? 'dark' : ''}`}>
            <div className="product-summary-modal-header">
              <h3 className="product-summary-modal-title">Item Details</h3>
              <button
                onClick={() => {
                  setShowItemDetailsModal(false);
                  setSelectedSupplier(null);     // Clear selected supplier
                  setSelectedItemCode('');       // Clear selected item code
                  setItemDetails([]);            // Clear fetched item details
                  // Optionally: setLoading(false); if you want to reset loading state too
                }}
                className="product-summary-modal-close-icon"
              >
                ✕
              </button>
            </div>
            <div className="item-details-selection">
              <select
                value={selectedSupplier ? selectedSupplier._id : ''}
                onChange={(e) => {
                  const supplier = suppliers.find(s => s._id === e.target.value);
                  setSelectedSupplier(supplier);
                  setSelectedItemCode(''); // Reset item code when supplier changes
                }}
                className={`item-details-select ${darkMode ? 'dark' : ''}`}
              >
                <option value="">Select Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.supplierName}
                  </option>
                ))}
              </select>
              {selectedSupplier ? (
                <Select
                  value={selectedItemCode ? { value: selectedItemCode, label: selectedItemCode } : null}
                  onChange={(selectedOption) => setSelectedItemCode(selectedOption ? selectedOption.value : '')}
                  options={getGrnOptionsFromSupplier(selectedSupplier, products)}
                  placeholder="Select or search GRN..."
                  isClearable
                  isSearchable
                  className={`react-select-container ${darkMode ? 'dark' : ''}`}
                  classNamePrefix="react-select"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      backgroundColor: darkMode ? '#333' : 'white',
                      borderColor: state.isFocused ? (darkMode ? '#6c63ff' : '#007bff') : '#ccc',
                      boxShadow: state.isFocused ? `0 0 0 1px ${darkMode ? '#6c63ff' : '#007bff'}` : 'none',
                      '&:hover': {
                        borderColor: darkMode ? '#6c63ff' : '#007bff',
                      },
                      minHeight: '38px',
                      fontSize: '14px',
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: darkMode ? '#333' : 'white',
                      border: `1px solid ${darkMode ? '#444' : '#ccc'}`,
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                      zIndex: 1000,
                    }),
                    menuList: (base) => ({
                      ...base,
                      maxHeight: '200px',
                      '::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '::-webkit-scrollbar-track': {
                        background: darkMode ? '#2d2d2d' : '#f1f1f1',
                      },
                      '::-webkit-scrollbar-thumb': {
                        background: darkMode ? '#666' : '#ccc',
                        borderRadius: '3px',
                      },
                    }),
                    option: (base, { isFocused, isSelected }) => ({
                      ...base,
                      backgroundColor: isSelected
                        ? (darkMode ? '#6c63ff' : '#007bff')
                        : isFocused
                        ? (darkMode ? '#444' : '#e9ecef')
                        : 'transparent',
                      color: isSelected
                        ? 'white'
                        : darkMode
                        ? 'white'
                        : 'black',
                      ':active': {
                        backgroundColor: darkMode ? '#555' : '#0056b3',
                      },
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: darkMode ? 'white' : 'black',
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: darkMode ? '#aaa' : '#666',
                    }),
                    input: (base) => ({
                      ...base,
                      color: darkMode ? 'white' : 'black',
                    }),
                  }}
                />
              ) : (
                <input
                  type="text"
                  value=""
                  placeholder="Select a supplier first"
                  disabled
                  className={`react-select-placeholder ${darkMode ? 'dark' : ''}`}
                />
              )}
            </div>
            <div className="item-details-selection">
              <button
                onClick={fetchItemDetails}
                className="btn-primary"
                disabled={!selectedSupplier || !selectedItemCode}
              >
                Fetch Details
              </button>
            </div>
            {loading ? (
              <p className="loading">Loading item details...</p>
            ) : itemDetails.length > 0 ? ( 
              <>
                {(() => {
                  // Calculate original total (what was received)
                  const originalTotal = itemDetails.reduce((sum, item) => {
                    return sum + (item.buyingPrice || 0) * (item.quantity || 0);
                  }, 0);

                  // Calculate returned value (using returnStocks)
                  const returnedValue = itemDetails.reduce((sum, item) => {
                    const returnedQty = returnStocks[item.itemCode] || 0;
                    // Cap returned quantity to not exceed original GRN quantity (optional safety)
                    const actualReturned = Math.min(returnedQty, item.quantity || 0);
                    return sum + (item.buyingPrice || 0) * actualReturned;
                  }, 0);

                  // Inside fetchItemDetails, after setting itemDetails
                  const grnDiscounts = (selectedSupplier.discounts || []).filter(d =>
                    String(d.grnNumber) === selectedItemCode
                  );
                  const totalDiscounts = grnDiscounts.reduce((sum, d) => sum + (d.discountCharge || 0), 0);

                  const adjustedTotal = originalTotal - returnedValue - totalDiscounts;
                  
                  return (
                    <>
                      <div className="grn-totals-summary">
                        <div><strong>GRN Total:</strong> Rs. {originalTotal.toFixed(2)}</div>
                        <div><strong>Returned Value:</strong> Rs. {returnedValue.toFixed(2)}</div>
                        <div><strong>Discounts:</strong> Rs. {totalDiscounts.toFixed(2)}</div> {/* ✅ New */}
                        <div><strong>Payable Amount:</strong> Rs. {adjustedTotal.toFixed(2)}</div> {/* ✅ Renamed */}
                      </div>
                  
                      <table className={`product-table-supplierfetch ${darkMode ? 'dark' : ''}`}>
                        <thead>
                          <tr>
                            <th>GRN</th>
                            <th>Item Name</th>
                            <th>Category</th>
                            
                            {/* <th>Selling Price</th> */}
                            <th>Stock</th>
                            {/* <th>Supplier</th> */}
                            <th>Ret.Stock</th>
                            <th>Buying Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemDetails.map((product) => {
                            const returnedQty = returnStocks[product.itemCode] || 0;
                            const netQty = (product.quantity || 0) - returnedQty;
                            return (
                              <tr key={product._id}>
                                <td>{product.grnNumber || 'N/A'}</td>
                                <td className={`text-wrap ${darkMode ? 'dark' : ''}`} title={product.itemName}>{product.itemName}</td>
                                <td>{product.category}</td>
                                
                                {/* <td>Rs. {product.sellingPrice.toFixed(2)}</td> */}
                                <td>{product.quantity}</td>
                                {/* <td>{product.supplierName || 'N/A'}</td> */}
                                <td style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                                  {returnedQty}
                                </td>
                                <td>Rs. {product.buyingPrice.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                          <tr className="summary-total-row">
                            <td><strong>Sub Total</strong></td>
                            <td></td>
                            <td></td>
                            
                            <td>
                              <strong>
                                {itemDetails.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                              </strong>
                            </td>
                            <td>
                              <strong style={{ color: '#e74c3c' }}>
                                {itemDetails.reduce((sum, item) => sum + (returnStocks[item.itemCode] || 0), 0)}
                              </strong>
                            </td>
                            <td>
                              <strong>
                                Rs. {itemDetails
                                  .reduce((total, item) => total + (item.quantity * item.buyingPrice), 0)
                                  .toFixed(2)}
                              </strong>
                            </td>
                            
                          </tr>
                          <tr className="summary-total-row">
                            <td colspan="5">
                              <strong>Total Pay for </strong> 
                              <strong style={{ color: adjustedTotal < 0 ? '#e74c3c' : '#28a745' }}>
                                {itemDetails.reduce((sum, item) => {
                                  const net = (item.quantity || 0) - (returnStocks[item.itemCode] || 0);
                                  return sum + net;
                                }, 0)}
                              </strong>
                              <strong> Items </strong> 
                            </td>
                            
                            <td>
                              <strong>
                                Rs. {adjustedTotal.toFixed(2)}
                              </strong>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </>
                  );  
                })()}
            </>
           ) : (
              <p className="no-products">No items found for the selected supplier and item code.</p>
            )}
          </div>
        </div>
      )}
      {error && <p className="error-message">{error}</p>}
      {loading && !showItemDetailsModal ? (
        <p className="loading">Loading suppliers...</p>
      ) : !suppliers || filteredSuppliers.length === 0 ? (
        <p className="no-products">No suppliers available.</p>
      ) : (
        <table className={`product-table ${darkMode ? 'dark' : ''}`}>
          <thead>
            <tr>
              <th>Supplier Name</th>
              <th>Business Name</th>
              <th>Phone Number</th>
              <th>Address</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.map((supplier) => (
              <tr key={supplier._id}>
                <td>{supplier.supplierName || 'N/A'}</td>
                <td style={{  fontWeight:  'bold'  }}>{supplier.businessName || 'N/A'}</td>
                <td>{supplier.phoneNumber || 'N/A'}</td>
                <td>{supplier.address || 'N/A'}</td>
                <td>
                  <div className="action-container">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setShowActionMenu(showActionMenu === supplier._id ? null : supplier._id);
                      }}
                      className="action-dot-btn"
                    >
                      ⋮
                    </button>
                    {showActionMenu === supplier._id && (
                      <>
                        <div className="action-menu-overlay" onClick={() => setShowActionMenu(null)} />
                        <div className="action-menu">
                          <button onClick={() => handleCart(supplier)} className="p-edit-btn">
                            <div className="action-btn-content">
                              <img src={cart} alt="cart" width="30" height="30" className="p-edit-btn-icon" />
                              <span>Cart</span>
                            </div>
                          </button>
                          <button onClick={() => handleDiscounts(supplier)} className="p-edit-btn">
                            <div className="action-btn-content">
                              <FontAwesomeIcon icon={faPercentage} width="30" height="30" className="p-edit-btn-icon" />
                              <span>Add Discount</span>
                            </div>
                          </button>
                          <button onClick={() => handlePastpayment(supplier)} className="p-edit-btn">
                            <div className="action-btn-content">
                              <img src={jobBillIcon} alt="cart" width="30" height="30" className="p-edit-btn-icon" />
                              <span>Add Past Payment</span>
                            </div>
                          </button>
                          <button onClick={() => handleRepairService(supplier)} className="p-edit-btn">
                            <div className="action-btn-content">
                              <FontAwesomeIcon icon={faWrench} width="30" height="30" className="p-edit-btn-icon" />
                              <span>Add Repair Service</span>
                            </div>
                          </button>
                          
                          <button onClick={() => handleEdit(supplier)} className="p-edit-btn">
                            <div className="action-btn-content">
                              <img src={editicon} alt="edit" width="30" height="30" className="p-edit-btn-icon" />
                              <span>Edit</span>
                            </div>
                          </button>
                          {/* {userRole === 'admin' && (
                            <button onClick={() => handleDelete(supplier._id)} className="p-delete-btn">
                              <div className="action-btn-content">
                                <img src={deleteicon} alt="delete" width="30" height="30" className="p-delete-btn-icon" />
                                <span>Delete</span>
                              </div>
                            </button>
                          )} */}
                          <button onClick={() => handleView(supplier._id)} className="p-view-btn">
                            <div className="action-btn-content">
                              <img src={viewicon} alt="view" width="30" height="30" className="p-view-btn-icon" />
                              <span>View</span>
                            </div>
                          </button>
                          {userRole === 'admin' && (
                            <button onClick={() => handlePay(supplier)} className="p-pay-btn">
                              <div className="action-btn-content">
                                <img src={payicon} alt="pay" width="30" height="30" className="p-pay-btn-icon" />
                                <span>Pay</span>
                              </div>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showAddSupplierModal && (
        <AddSupplier
          supplier={null}
          closeModal={() => {
            setShowAddSupplierModal(false);
            setSelectedSupplier(null);
          }}
          refreshSuppliers={fetchSuppliers}
          darkMode={darkMode}
        />
      )}
      {showEditSupplierModal && selectedSupplier && (
        <SupplierUpdate
          isOpen={showEditSupplierModal}
          onClose={async () => {
            setShowEditSupplierModal(false);
            setSelectedSupplier(null);
            setSearchQuery("");
            await fetchSuppliers();
          }}
          supplierId={selectedSupplier._id}
          refreshSuppliers={() => {}}
          darkMode={darkMode}
        />
      )}
      {showCartModal && selectedSupplier && (
        <CartForm
          supplier={selectedSupplier}
          closeModal={() => {
            setShowCartModal(false);
            setSelectedSupplier(null);
            fetchSuppliers();
            refreshProducts();
          }}
          darkMode={darkMode}
          refreshProducts={refreshProducts}
        />
      )}

      {showPastPaymentModal && selectedSupplier && (
        <PastPayment
          supplier={selectedSupplier}
          closeModal={() => {
            setshowPastPaymentModal(false);
            setSelectedSupplier(null);
            fetchSuppliers();
            refreshProducts();
          }}
          darkMode={darkMode}
          refreshProducts={refreshProducts}
        />
      )}

      {showDiscountModal && selectedSupplier && (
        <Discounts
          supplier={selectedSupplier}
          closeModal={() => {
            setshowDiscountModal(false);
            setSelectedSupplier(null);
            fetchSuppliers();
            refreshProducts();
          }}
          darkMode={darkMode}
          refreshProducts={refreshProducts}
        />
      )}

      {showRepairServiceModal && selectedSupplier && (
        <RepairService
          supplier={selectedSupplier}
          closeModal={() => {
            setshowRepairServiceModal(false);
            setSelectedSupplier(null);
            fetchSuppliers();
            refreshProducts();
          }}
          darkMode={darkMode}
          refreshProducts={refreshProducts}
        />
      )}


      {notification && (
        <div className={`notification ${darkMode ? 'dark' : ''}`}>
          {notification}
        </div>
      )}
    </div>
  );
};

export default SupplierList;