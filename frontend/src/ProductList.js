import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EditProduct from './EditProduct';
import ReturnProductModal from './pages/ReturnProductModal';
import AddProduct from './AddProduct';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Highcharts from 'highcharts';
import 'highcharts/highcharts-3d';
import HighchartsReact from 'highcharts-react-official';
import './Products.css';
import editicon from './icon/edit.png';
import deleteicon from './icon/delete.png';
import returnicon from './icon/product-return.png';
import Barcode from './pages/Barcode';
import barcodeicon from './icon/barcode.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faChartSimple, faFile, faFilePdf, faFileExcel, faSearch, faTimes, faUpload, faSync } from '@fortawesome/free-solid-svg-icons';
import { v4 as uuidv4 } from 'uuid';
import { useMemo } from "react";

//const API_URL = 'https://raxwo-management.onrender.com/api/products';
 const API_URL = 'https://raxwo-management.onrender.com/api/products';
const CLICKED_PRODUCTS_API_URL = 'https://raxwo-management.onrender.com/api/clicked-products';

const ProductList = ({ darkMode }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [excelUploadStatus, setExcelUploadStatus] = useState("");
  const [excelUploadId, setExcelUploadId] = useState(null);
  const [excelUploadFile, setExcelUploadFile] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadedRecordsModalOpen, setUploadedRecordsModalOpen] = useState(false);
  const [uploadedRecords, setUploadedRecords] = useState([]);
  const [uploadedPage, setUploadedPage] = useState(1);
  const [uploadedTotalPages, setUploadedTotalPages] = useState(1);
  const [uploadedLoading, setUploadedLoading] = useState(false);
  const [uploadedError, setUploadedError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const productsPerPage = 20;
  const itemsPerPage = 20;
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const handleClearAll = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Fetch products with backend pagination and filtering
  const fetchProducts = () => {
    setLoading(true);
    setRefreshing(true);
    let url = `https://raxwo-management.onrender.com/api/product-uploads`;
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }
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
            grnNumber:product.grnNumber,
            itemCode: product.itemCode,
            itemName: product.itemName,
            category: product.category,
            stock: product.stock,
            buyingPrice: product.buyingPrice,
            sellingPrice: product.sellingPrice,
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
        // If paginated response
        if (data && data.records) {
          setProducts(availableProducts);
          setTotalPages(data.totalPages || 1);
          setTotalProducts(data.total || availableProducts.length);
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
        setRefreshing(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
        setRefreshing(false);
      });
  };

  // Only fetch once, and refetch on page/search change
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line
  }, []);


  const handleEdit = (product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  const handleReturn = (product) => {
    setSelectedProduct(product);
    setShowReturnModal(true);
  };

  const handleBarcode = (product) => {
    setBarcodeProduct(product);
    setShowBarcodeModal(true);
  };

  const handleAddProductClick = async (product) => {
    // Show confirmation dialog
    const isConfirmed = window.confirm(`Are you sure you want to delete "${product.itemName}"? This action cannot be undone.`);
    
    if (!isConfirmed) {
      return; // User cancelled the deletion
    }
    
    try {
      console.log('Delete clicked for:', product.itemName);
      
      // Store clicked product in localStorage for now
      const clickedProducts = JSON.parse(localStorage.getItem('clickedProducts') || '[]');
      const username = localStorage.getItem('username') || localStorage.getItem('cashierName') || 'system';
      const newClickedProduct = {
        ...product,
        clickedAt: new Date().toISOString(),
        clickedFrom: 'product-list',
        clickedBy: username
      };
      
      // Check if product is already clicked
      const isAlreadyClicked = clickedProducts.some(cp => cp._id === product._id);
      if (!isAlreadyClicked) {
        clickedProducts.push(newClickedProduct);
        localStorage.setItem('clickedProducts', JSON.stringify(clickedProducts));
        console.log('Product added to localStorage:', newClickedProduct);
      }
      
      console.log('Stored clicked products:', clickedProducts);
      
      // Immediately remove the clicked product from the current list
      setProducts(prevProducts => prevProducts.filter(p => p._id !== product._id));
      
      // Show success message
      alert(`${product.itemName} has been deleted and moved to the deleted products page.`);
      
      // Navigate to the add product page with the product data
      console.log('ProductList - Navigating to DeleteProduct with product:', product);
      navigate('/AddProduct', {
        state: {
          product: product,
          clickedAt: new Date().toISOString(),
          clickedFrom: 'product-list',
          darkMode: darkMode
        }
      });
    } catch (err) {
      console.error('Error in handleAddProductClick:', err);
      setError(err.message);
      alert('Error marking product as clicked: ' + err.message);
    }
  };

  const normalize = (str) => str.toLowerCase().replace(/\s+/g, ' ');

  const filteredProductsForModal = searchQuery.trim() === ""
    ? products
    : products.filter(product => {
        const searchableText = (product.itemName + ' ' + product.category + ' ' + product.itemCode).toLowerCase();

        // Split query into words and test each as a whole word or number
        const words = normalize(searchQuery).trim().split(/\s+/);

        return words.every(word => {
          // Create a regex with word boundaries for exact partial matching
          const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          return regex.test(searchableText);
        });
      });

  const sortedAndFilteredProducts = useMemo(() => {
    // Start with filtered products
    // Start with all products or filtered list
    let result = products;

    // Apply search filter only if query exists
    if (searchQuery.trim() !== '') {
      result = products.filter(product => {
        const searchableText = normalize(product.itemName + ' ' + product.category + ' ' + product.itemCode);
        const words = normalize(searchQuery).trim().split(/\s+/);

        return words.every(word => {
          const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (/^\d+$/.test(word)) {
            // Numeric: require word boundaries (exact number match)
            const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
            return regex.test(searchableText);
          } else {
            // Text: allow partial substring match
            const regex = new RegExp(escapedWord, 'i');
            return regex.test(searchableText);
          }
        });
      });
    }

    // Apply low stock filter if checkbox is checked
    if (showLowStockOnly) {
      result = result.filter(product => (product.stock || 0) <= 2);
    }

    // Apply sorting if a column is selected
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let valueA = '';
        let valueB = '';

        switch (sortConfig.key) {
          case 'itemName':
            valueA = a.itemName || '';
            valueB = b.itemName || '';
            break;
          case 'category':
            valueA = a.category || '';
            valueB = b.category || '';
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
          case 'status':
            valueA = a.stock > 0 ? 1 : 0; // In Stock = 1, Out of Stock = 0
            valueB = b.stock > 0 ? 1 : 0;
            break;
          default:
            return 0;
        }

        // Handle numeric vs string comparison
        if (typeof valueA === 'number') {
          return sortConfig.direction === 'asc'
            ? valueA - valueB
            : valueB - valueA;
        } else {
          valueA = String(valueA).toLowerCase();
          valueB = String(valueB).toLowerCase();
          if (valueA < valueB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (valueA > valueB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
      });
    }

    return result;
  }, [products, searchQuery, sortConfig, showLowStockOnly,]);

  const totalProductPages = Math.ceil(sortedAndFilteredProducts.length / productsPerPage);
  const paginatedProductsForModal = sortedAndFilteredProducts.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage);

  // Helper to fetch all products (no pagination)
  // const fetchAllProductsForReport = async (search = '') => {
  //   let url = `${API_URL}`;
  //   if (search) url += `?search=${encodeURIComponent(search)}`;
  //   const response = await fetch(url);
  //   if (!response.ok) throw new Error('Failed to fetch all products for report');
  //   const data = await response.json();
  //   if (data && data.records) return data.records;
  //   if (Array.isArray(data)) return data;
  //   return [];
  // };

  const generatePDF = async () => {
    try {
      // const allProducts = await fetchAllProductsForReport(searchQuery);
      const clickedProducts = JSON.parse(localStorage.getItem('clickedProducts') || '[]');
      const clickedProductIds = clickedProducts.map(cp => cp._id);
      const availableProductsForReport = sortedAndFilteredProducts.filter(product => !clickedProductIds.includes(product._id));
      const doc = new jsPDF();
      doc.text('Product List', 90, 20);
      const tableColumn = ['GRN', 'Item Name', 'Category', 'Buying Price', 'Selling Price', 'Stock', 'Supplier', 'Status', 'Created At'];
      const tableRows = availableProductsForReport.map((product) => [
        product.grnNumber || 'N/A',
        product.itemName,
        product.category,
        `Rs. ${product.buyingPrice}`,
        `Rs. ${product.sellingPrice}`,
        product.stock,
        product.supplierName || 'N/A',
        product.stock > 0 ? 'In Stock' : 'Out of Stock',
        product.createdAt ? new Date(product.createdAt).toLocaleString() : 'N/A',
      ]);
      doc.autoTable({ head: [tableColumn], body: tableRows, startY: 30 });
      doc.save('Product_List.pdf');
      setShowReportOptions(false);
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    }
  };

  const generateExcel = async () => {
    try {
      // const allProducts = await fetchAllProductsForReport(searchQuery);
      const clickedProducts = JSON.parse(localStorage.getItem('clickedProducts') || '[]');
      const clickedProductIds = clickedProducts.map(cp => cp._id);
      const availableProductsForReport = sortedAndFilteredProducts.filter(product => !clickedProductIds.includes(product._id));
      const formattedProducts = availableProductsForReport.map((product) => ({
        'GRN': product.grnNumber || 'N/A',
        'Item Name': product.itemName,
        Category: product.category,
        'Buying Price': `Rs. ${product.buyingPrice}`,
        'Selling Price': `Rs. ${product.sellingPrice}`,
        Stock: product.stock,
        Supplier: product.supplierName || 'N/A',
        Status: product.stock > 0 ? 'In Stock' : 'Out of Stock',
        'Created At': product.createdAt ? new Date(product.createdAt).toLocaleString() : 'N/A',
      }));
      const worksheet = XLSX.utils.json_to_sheet(formattedProducts);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
      XLSX.writeFile(workbook, 'Product_List.xlsx');
      setShowReportOptions(false);
    } catch (err) {
      alert('Failed to generate Excel: ' + err.message);
    }
  };

  const calculateMonthlySummary = () => {
    const monthlyData = {};
    let totalBuyingPrice = 0;

    products.forEach((product) => {
      const date = product.createdAt ? new Date(product.createdAt) : new Date();
      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = 0;
      }
      const productBuyingPrice = product.buyingPrice * product.stock;
      monthlyData[monthYear] += productBuyingPrice;
      totalBuyingPrice += productBuyingPrice;
    });

    const months = Object.keys(monthlyData);
    const prices = months.map((month) => monthlyData[month]);

    return { monthlyData, totalBuyingPrice, months, prices };
  };

  const { monthlyData, totalBuyingPrice, months, prices } = calculateMonthlySummary();

  const chartOptions = {
    chart: {
      type: 'column',
      options3d: {
        enabled: true,
        alpha: 1,
        beta: 0,
        depth: 50,
        viewDistance: 25,
        frame: {
          bottom: { size: 1, color: darkMode ? 'rgba(251, 251, 251, 0.1)' : 'whitesmoke' },
          side: { size: 0 },
          back: { size: 0 },
        },
      },
      backgroundColor: darkMode ? 'rgba(251, 251, 251, 0.1)' : 'whitesmoke',
      borderWidth: 0,
    },
    title: {
      text: 'Monthly Buying Prices',
      style: { color: darkMode ? '#ffffff' : '#000000', fontFamily: "'Inter', sans-serif", fontSize: '18px' },
    },
    xAxis: {
      categories: months,
      labels: {
        style: {
          color: darkMode ? '#ffffff' : '#000000',
          fontFamily: "'Inter', sans-serif",
          fontSize: '14px',
        },
      },
      lineColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(82, 82, 82, 0.2)',
    },
    yAxis: {
      title: { text: null },
      labels: {
        style: {
          color: darkMode ? '#ffffff' : '#000000',
          fontFamily: "'Inter', sans-serif",
          fontSize: '14px',
        },
        formatter: function () {
          return `Rs. ${Highcharts.numberFormat(this.value, 0)}`;
        },
      },
      gridLineColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      lineColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(82, 82, 82, 0.2)',
      lineWidth: 1,
      offset: 0,
    },
    plotOptions: {
      column: {
        depth: 25,
        pointWidth: 20,
        groupPadding: 0.2,
        pointPadding: 0.05,
        colorByPoint: true,
        dataLabels: {
          enabled: true,
          format: 'Rs. {y}',
          style: {
            color: darkMode ? '#ffffff' : '#000000',
            fontFamily: "'Inter', sans-serif",
            fontSize: '12px',
            textOutline: 'none',
          },
        },
      },
    },
    series: [
      {
        name: 'Buying Price',
        data: prices,
        colors: ['#1e90ff', '#ff4040', '#32cd32', '#ffcc00', '#ff69b4', '#8a2be2'],
      },
    ],
    legend: {
      enabled: false,
    },
    credits: { enabled: false },
    tooltip: {
      backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(245, 245, 245, 0.9)',
      style: {
        color: darkMode ? '#ffffff' : '#000000',
        fontFamily: "'Inter', sans-serif",
      },
      formatter: function () {
        return `<b>${this.x}</b>: Rs. ${Highcharts.numberFormat(this.y, 2)}`;
      },
    },
  };

  // Replace filteredProducts and paginatedProducts with products from backend
  // Use totalProducts and totalPages for pagination and count

  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  // New Excel upload handler (no validation, just upload with unique ID)
  const handleSimpleExcelUpload = async (file) => {
    if (!file) return;
    setExcelUploadStatus("Uploading...");
    const uploadId = uuidv4();
    setExcelUploadId(uploadId);
    setExcelUploadFile(file);
    try {
      // Read the Excel file and assign a unique ID to each record
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      console.log("Excel parsed data:", jsonData); // DEBUG: Log parsed Excel data
      // Assign a unique ID to each record
      const recordsWithId = jsonData.map(row => ({ ...row, _id: uuidv4() }));
      // Send to backend (as JSON array)
      const response = await fetch(`${API_URL}/bulk-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: recordsWithId, uploadId, uploadedBy: localStorage.getItem('username') || 'system' })
      });
      if (!response.ok) {
        const errorData = await response.json();
        setExcelUploadStatus('Upload failed: ' + (errorData.message || 'Unknown error'));
        return;
      }
      setExcelUploadStatus('Upload successful!');
      setTimeout(() => {
        setExcelUploadStatus('');
        fetchProducts();
      }, 2000);
    } catch (err) {
      setExcelUploadStatus('Upload failed: ' + err.message);
    }
  };

  // File input handler for new upload
  const handleSimpleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleSimpleExcelUpload(file);
    }
    event.target.value = '';
  };

  const handleUploadExcel = async () => {
    if (!uploadFile) return;
    setUploadStatus('Uploading...');
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('uploadedBy', localStorage.getItem('username') || 'system');
      // Optionally, add a unique uploadId if needed
      // formData.append('uploadId', uuidv4());
    
      const response = await fetch('https://raxwo-management.onrender.com/api/product-uploads/bulk-upload',
 {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (!response.ok) {
        setUploadStatus('Upload failed: ' + (result.message || 'Unknown error'));
      } else {
        setUploadStatus('Upload successful! ' + result.count + ' records uploaded.' + (result.flagged ? ` (${result.flagged} flagged)` : ''));
        setUploadFile(null);
        setTimeout(() => {
          setUploadStatus('');
          setUploadModalOpen(false);
        }, 2000);
      }
    } catch (err) {
      setUploadStatus('Upload failed: ' + err.message);
    }
  };

  const fetchUploadedRecords = async (page = 1) => {
    setUploadedLoading(true);
    setUploadedError('');
    try {
      const res = await fetch(`https://raxwo-management.onrender.com/api/product-uploads?page=${page}&limit=20`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch uploaded records');
      setUploadedRecords(data.records || []);
      setUploadedPage(data.page || 1);
      setUploadedTotalPages(data.totalPages || 1);
    } catch (err) {
      setUploadedError(err.message);
    } finally {
      setUploadedLoading(false);
    }
  };

  const handleOpenUploadedRecords = () => {
    setUploadedRecordsModalOpen(true);
    fetchUploadedRecords(1);
  };

  const handleExportAllUploaded = async () => {
    try {
      const res = await fetch('https://raxwo-management.onrender.com/api/product-uploads/export-all');
      if (!res.ok) throw new Error('Failed to export records');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'uploaded_products.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  const handleSort = (key) => {
  setSortConfig((prevConfig) => {
    // If clicking the same column, toggle direction
    const direction =
      prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc';
    return { key, direction };
  });
};

  return (
    <div className={`product-repair-list-container ${darkMode ? "dark" : ""}`}>
      <div className="header-section">
        <h2 className={`product-repair-list-title ${darkMode ? "dark" : ""}`}>Product Stock</h2>
      </div>
      <div className="search-action-container">
        <div className={`search-bar-container ${darkMode ? 'dark' : ''}`}>
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="       Search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className={`product-list-search-bar ${darkMode ? 'dark' : ''}`}
          />
          {searchQuery && (
            <button onClick={handleClearSearch} className={`search-clear-btn ${darkMode ? 'dark' : ''}`}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>
        <div className='filter-action-row' style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: 14, color: '#666', marginRight: 13 }}>
            Products: {totalProducts}
          </span>

          {/* Low Stock Filter Checkbox */}
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 14, color: '#666', marginRight: 13 }}>
            Show Low Stock (≤ 2) 
          
            <span style={{ fontSize: 14, color: '#666', marginLeft: 8, marginTop: 8 }}>
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
              />
            </span>
          
          </span>

          {/* <button onClick={handleClearAll} className="btn-primary" style={{ background: '#dc3545', color: '#fff' }}>Clear All</button> */}
          <button onClick={() => setSummaryModalOpen(true)} className="btn-summary">
            <FontAwesomeIcon icon={faChartSimple} /> Summary
          </button>
          <button onClick={() => setShowReportOptions(true)} className="btn-report">
            <FontAwesomeIcon icon={faFile} /> Reports
          </button>
          <button 
            onClick={() => setUploadModalOpen(true)}
            className="btn-primary"
            style={{ background: '#28a745' }}
            title="Bulk Upload Excel (separate system)"
          >
            <FontAwesomeIcon icon={faUpload} /> Upload Excel
          </button>
          {/* <button
            onClick={handleOpenUploadedRecords}
            className="btn-primary"
            style={{ background: '#333' }}
            title="View Uploaded Records (separate system)"
          >
            View Uploaded Records
          </button> */}
        </div>
        {/* <div style={{ 
          fontSize: '12px', 
          color: '#666', 
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          border: '1px solid #e9ecef'
        }} title="Products with supplier names will be automatically added to supplier carts">
          💡 <strong>Tip:</strong> Include 'Supplier' column in your Excel file to automatically add products to supplier carts. Use "Check Missing" to find products that aren't visible in the current list.
        </div> */}
      </div>
      {/* {excelUploadStatus && (
        <div style={{ margin: '10px 0', color: excelUploadStatus.includes('failed') ? 'red' : 'green' }}>
          {excelUploadStatus}
        </div>
      )} */}
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
      {/* {uploadSuccess && (
          <div style={{
            backgroundColor: '#d4edda',
            color: '#155724',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
            border: '1px solid #c3e6cb',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FontAwesomeIcon icon={faTimes} style={{ color: '#155724' }} />
            <span><strong>Success!</strong> Excel upload completed. All products from Excel have been added to the product list. All fields are optional - missing fields will be filled with default values.</span>
          </div>
        )} */}
      {error && <p className="error-message">{error}</p>}
      {loading ? (
        <p className="loading">Loading products...</p>
      ) : totalProducts === 0 ? (
        <p className="no-products">No products available.</p>
      ) : (
        <>
          <table className={`product-table ${darkMode ? 'dark' : ''}`}>
            <thead>
              <tr>
                {/* <th>GRN</th> */}
                <th onClick={() => handleSort('itemName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Item Name
                  {sortConfig.key === 'itemName' && (
                    <span style={{ marginLeft: '8px' }}>
                      {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('category')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Category
                  {sortConfig.key === 'category' && (
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
                {/* <th>Supplier</th> */}
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Status
                  {sortConfig.key === 'status' && (
                    <span style={{ marginLeft: '8px' }}>
                      {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                    </span>
                  )}
                </th>
                {/* <th>Created At</th>
                <th>Added Back</th> */}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProductsForModal.map((product, idx) => (
                  <tr key={product._id || product.itemCode || idx} style={product.source === 'uploaded' ? { background: '#f7f7f7' } : {}}>
                    {/* <td>{product.itemCode || 'N/A'}</td> */}
                    <td>{product.itemName}</td>
                    <td>{product.category}</td>
                    <td>Rs. {Number(product.buyingPrice).toFixed(2)}</td>
                    <td>Rs. {Number(product.sellingPrice).toFixed(2)}</td>
                    <td>{product.stock}</td>
                    {/* <td>{product.supplierName || 'N/A'}</td> */}
                    <td>{product.stock > 0 ? 'In Stock' : 'Out of Stock'}</td>
                    {/* <td>{product.createdAt ? new Date(product.createdAt).toLocaleString() : 'N/A'}</td>
                    <td>{product.addedBackAt ? (
                      <div>
                        <div>{new Date(product.addedBackAt).toLocaleString()}</div>
                        <div style={{ fontSize: '0.8em', color: '#666' }}>
                          by {product.addedBackBy}
                        </div>
                      </div>
                    ) : (
                      'N/A'
                    )}</td> */}
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
                              {/* <button onClick={() => handleReturn(product)} className="p-return-btn">
                                <div className="action-btn-content">
                                  <img src={returnicon} alt="return" width="30" height="30" className="p-return-btn-icon" />
                                  <span>Return</span>
                                </div>
                              </button> */}
                              <button onClick={() => handleBarcode(product)} className="p-barcode-btn">
                                <div className="action-btn-content">
                                  <img src={barcodeicon} alt="barcode" width="30" height="30" className="p-barcode-btn-icon" />
                                  <span>Barcode</span>
                                </div>
                              </button>
                              <button 
                                onClick={() => handleAddProductClick(product)}
                                className="p-delete-btn" 
                                style={{ textDecoration: 'none', display: 'block', width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}
                              >
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
        </>
      )}
      {/* Pagination controls below the table */}
      {totalProductPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '16px 0', gap: 10 }}>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
          <span>Page {currentPage} of {totalProductPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalProductPages, p + 1))} disabled={currentPage === totalProductPages}>Next</button>
        </div>
      )}
      {showModal && selectedProduct && (
        <EditProduct
          product={selectedProduct}
          closeModal={() => {
            setShowModal(false);
            fetchProducts();
          }}
          darkMode={darkMode}
          showGRN={false}
        />
      )}
      {showReturnModal && selectedProduct && (
        <ReturnProductModal
          product={selectedProduct}
          closeModal={() => setShowReturnModal(false)}
          darkMode={darkMode}
        />
      )}
      {showAddModal && (
        <AddProduct
          closeModal={() => {
            setShowAddModal(false);
            fetchProducts();
          }}
          darkMode={darkMode}
        />
      )}
      {showBarcodeModal && barcodeProduct && (
        <Barcode
          itemCode={barcodeProduct.itemCode}
          itemName={barcodeProduct.itemName}
          sellingPrice={barcodeProduct.sellingPrice}
          darkMode={darkMode}
          onClose={() => setShowBarcodeModal(false)}
        />
      )}
      {summaryModalOpen && (
        <div className="product-summary-modal-overlay">
          <div className={`product-summary-modal-content ${darkMode ? 'dark' : ''}`}>
            <div className="product-summary-modal-header">
              <h3 className="product-summary-modal-title">Product Buying Price Summary</h3>
              <button
                onClick={() => setSummaryModalOpen(false)}
                className="product-summary-modal-close-icon"
              >
                ✕
              </button>
            </div>
            <div className="product-summary-content">
              <div className="product-summary-card">
                <div className="product-summary-icon product-summary-total-icon">💸</div>
                <div className="product-summary-text">
                  <h4>Total Buying Price</h4>
                  <p>Rs. {totalBuyingPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="product-summary-chart-container">
              <HighchartsReact highcharts={Highcharts} options={chartOptions} />
            </div>
          </div>
        </div>
      )}
      {uploadModalOpen && (
        <div className="modal-overlay" onClick={() => setUploadModalOpen(false)}>
          <div className={`modal-content ${darkMode ? 'dark' : ''}`} onClick={e => e.stopPropagation()} style={{ minWidth: 350, maxWidth: 400 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Bulk Product Upload (Excel)</h3>
              <button onClick={() => setUploadModalOpen(false)} className="modal-close-icon">×</button>
            </div>
            <div className="modal-body">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={e => setUploadFile(e.target.files[0])}
                style={{ marginBottom: 12 }}
              />
              <button
                className="btn-primary"
                style={{ width: '100%' }}
                disabled={!uploadFile}
                onClick={handleUploadExcel}
              >
                Upload
              </button>
              {uploadStatus && <div style={{ marginTop: 10, color: uploadStatus.includes('failed') ? 'red' : 'green' }}>{uploadStatus}</div>}
              <div style={{ fontSize: 12, color: '#666', marginTop: 10 }}>
                This feature uploads to a separate system and does not affect the main product list.
              </div>
            </div>
          </div>
        </div>
      )}
      {uploadedRecordsModalOpen && (
        <div className="modal-overlay" onClick={() => setUploadedRecordsModalOpen(false)}>
          <div className={`modal-content ${darkMode ? 'dark' : ''}`} onClick={e => e.stopPropagation()} style={{ minWidth: 700, maxWidth: 900 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Uploaded Product Records</h3>
              <button onClick={() => setUploadedRecordsModalOpen(false)} className="modal-close-icon">×</button>
            </div>
            <div className="modal-body">
              <button className="btn-primary" style={{ marginBottom: 10 }} onClick={handleExportAllUploaded}>
                Export All as Excel
              </button>
              {uploadedLoading ? (
                <div>Loading...</div>
              ) : uploadedError ? (
                <div style={{ color: 'red' }}>{uploadedError}</div>
              ) : (
                <>
                  <table className="product-table" style={{ fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Item Name</th>
                        <th>Item Code</th>
                        <th>Category</th>
                        <th>Buying Price</th>
                        <th>Selling Price</th>
                        <th>Stock</th>
                        <th>Supplier</th>
                        <th>Flags</th>
                        <th>Uploaded By</th>
                        <th>Uploaded At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadedRecords.length === 0 ? (
                        <tr><td colSpan={11} style={{ textAlign: 'center' }}>No records</td></tr>
                      ) : uploadedRecords.map((rec, idx) => {
                        const d = rec.data || {};
                        return (
                          <tr key={rec._id || idx}>
                            <td>{(uploadedPage - 1) * 20 + idx + 1}</td>
                            <td>{d['Item Name'] || d['itemName'] || d['ItemName'] || ''}</td>
                            <td>{d['Item Code'] || d['itemCode'] || d['ItemCode'] || ''}</td>
                            <td>{d['Category'] || d['category'] || ''}</td>
                            <td>{d['Buying Price'] || d['buyingPrice'] || ''}</td>
                            <td>{d['Selling Price'] || d['sellingPrice'] || ''}</td>
                            <td>{d['Stock'] || d['stock'] || ''}</td>
                            <td>{d['Supplier'] || d['supplierName'] || ''}</td>
                            <td>{(rec.flags || []).join(', ')}</td>
                            <td>{rec.uploadedBy || ''}</td>
                            <td>{rec.uploadedAt ? new Date(rec.uploadedAt).toLocaleString() : ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 10, gap: 10 }}>
                    <button disabled={uploadedPage <= 1} onClick={() => fetchUploadedRecords(uploadedPage - 1)}>&lt; Prev</button>
                    <span>Page {uploadedPage} of {uploadedTotalPages}</span>
                    <button disabled={uploadedPage >= uploadedTotalPages} onClick={() => fetchUploadedRecords(uploadedPage + 1)}>Next &gt;</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;