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

const REPAIRS_API_URL = 'https://raxwo-management.onrender.com/api/productsRepair';
const PAYMENTS_API_URL = 'https://raxwo-management.onrender.com/api/payments';
const PAYMENTS_API_URLwithItemcode = 'https://raxwo-management.onrender.com/api/payments/with-itemcodes';

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
  const [hideLowStockOnly, setHideLowStockOnly] = useState(false);
  const [show0StockOnly, setShow0StockOnly] = useState(false);
  const [hide0StockOnly, setHide0StockOnly] = useState(false);

  const [trackItemData, setTrackItemData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);  

  const [usedQuantities, setUsedQuantities] = useState({});
  const [usageLoading, setUsageLoading] = useState(false);

  const [supplierQuantities, setSupplierQuantities] = useState({});
  const [supplierLoading, setSupplierLoading] = useState(false);

  // Get all unique categories from products
  const allCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const [categorySearch, setCategorySearch] = useState('');
  const categoryFilterRef = useRef(null);

  const userRole = localStorage.getItem('role');
  
  const filteredCategoriesForSearch = categorySearch.trim() === ''
  ? allCategories
  : allCategories.filter(cat =>
      cat.toLowerCase().includes(categorySearch.toLowerCase().trim())
    );

  const handleClearAll = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  const token = localStorage.getItem('token');

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
            Supplier:product.Supplier,
            createdAt: product.createdAt,
            addedBackAt: product.addedBackAt,
            returnstock: product.returnstock,
            damagedstock: product.damagedstock
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

  useEffect(() => {
    if (products.length > 0) {
      loadAllUsage();
      loadSupplierQuantities();
    }
  }, [products]);

  // Replace your current `calculateUsedQuantityForItem` and `loadAllUsage` with this:

  const loadAllUsage = async () => {
    setUsageLoading(true);
    const usageMap = {};

    try {
      // 1. Fetch ALL repairs once
      const repairsRes = await fetch(REPAIRS_API_URL);
      const repairsList = repairsRes.ok ? await repairsRes.json() : [];

      // 2. Fetch ALL payments with itemCode once
      const paymentsRes = await fetch(PAYMENTS_API_URLwithItemcode);
      const allPayments = paymentsRes.ok ? await paymentsRes.json() : [];

      // 3. Aggregate usage from repairs (used + returns)
      repairsList.forEach(repair => {
        // Used in repairs
        (repair.repairCart || []).forEach(item => {
          if (item.itemCode) {
            usageMap[item.itemCode] = (usageMap[item.itemCode] || 0) + (item.quantity || 0);
          }
        });
        // Returns from repairs (subtract)
        // (repair.returnCart || []).forEach(item => {
        //   if (item.itemCode) {
        //     usageMap[item.itemCode] = (usageMap[item.itemCode] || 0) - (item.quantity || 0);
        //   }
        // });
      });

      // 4. Aggregate usage from payments
      allPayments.forEach(payment => {
        (payment.items || []).forEach(item => {
          if (item.itemCode) {
            // Only count if it's a sale (not a return)
            // In your /with-itemcodes, `quantity` is the sold amount
            usageMap[item.itemCode] = (usageMap[item.itemCode] || 0) + (item.quantity || 0) - (item.retquantity || 0);
          }
        });
      });

      allPayments.forEach(payment => {
        (payment.items || []).forEach(item => {
          if (item.itemCode) {
            // Only count if it's a sale (not a return)
            // In your /with-itemcodes, `quantity` is the sold amount
            usageMap[item.itemCode] = (usageMap[item.itemCode] || 0) + (item.givenQty || 0);
          }
        });
      });

      // 5. Save to state
      setUsedQuantities(usageMap);
    } catch (err) {
      console.error('Failed to load usage data:', err);
      setUsedQuantities({});
    } finally {
      setUsageLoading(false);
    }
  };

  const loadSupplierQuantities = async () => {
    setSupplierLoading(true);
    const supplierQtyMap = {};

    try {
      const res = await fetch('https://raxwo-management.onrender.com/api/suppliers');
      if (!res.ok) throw new Error('Failed to fetch suppliers');
      const suppliers = await res.json();

      // Loop through all suppliers and their carts
      suppliers.forEach(supplier => {
        (supplier.items || []).forEach(item => {
          if (item.itemCode && item.quantity != null) {
            supplierQtyMap[item.itemCode] = (supplierQtyMap[item.itemCode] || 0) + item.quantity;
          }
        });
      });

      setSupplierQuantities(supplierQtyMap);
    } catch (err) {
      console.error('Error loading supplier quantities:', err);
      setSupplierQuantities({});
    } finally {
      setSupplierLoading(false);
    }
  };


  const formatTrackDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
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

      // --- Fetch Repairs ---
      const repairsRes = await fetch(REPAIRS_API_URL);
      if (!repairsRes.ok) throw new Error("Failed to fetch repair data");
      const repairsList = await repairsRes.json();

      const paymentRes = await fetch(PAYMENTS_API_URLwithItemcode);
      if (!paymentRes.ok) throw new Error("Failed to fetch payment data");
      const paymentList = await paymentRes.json();

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
            date: formatTrackDate(repair.createdAt),
          };
        });

      const repairsReturned = repairsList
        .filter((repair) =>
          repair.returnCart?.some((cartItem) => cartItem.itemCode === itemCode)
        )
        .map((repair) => {
          const cartItem = repair.returnCart.find((i) => i.itemCode === itemCode);
          return {
            type: "Repair Return",
            invoiceNo: repair.repairInvoice || "N/A",
            customerName: repair.customerName || "Unknown",
            quantity: cartItem?.quantity || 0,
            date: repair.createdAt ? formatTrackDate(repair.createdAt) : "N/A",
          };
        });

        const payments = paymentList
        .filter((repair) =>
          repair.items?.some((cartItem) => cartItem.itemCode === itemCode)
        )
        .map((repair) => {
          const cartItem = repair.items.find((i) => i.itemCode === itemCode);
          return {

            type: "Payment",
            invoiceNo: repair.invoiceNumber || "N/A",
            customerName: repair.customerName || "Unknown",
            quantity: cartItem?.quantity || 0,
            retquantity: cartItem?.retquantity || 0,
            givenQty: cartItem?.givenQty || 0,
            retalert: repair.returnAlert || 0,
            date: repair.createdAt ? formatTrackDate(repair.createdAt) : "N/A",
          };
        });

      // --- Fetch Payments ---
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
        date: formatTrackDate(item.date)
      }));

      // Combine and sort by date (newest first)
      const usageRecords = [...repairsUsed, ...repairsReturned, ...payments].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      setTrackItemData({
        itemCode,
        itemName,
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

  // const handleAddProductClick = async (product) => {
  //   // Show confirmation dialog
  //   const isConfirmed = window.confirm(`Are you sure you want to delete "${product.itemName}"? This action cannot be undone.`);
    
  //   if (!isConfirmed) {
  //     return; // User cancelled the deletion
  //   }
    
  //   try {
  //     console.log('Delete clicked for:', product.itemName);
      
  //     // Store clicked product in localStorage for now
  //     const clickedProducts = JSON.parse(localStorage.getItem('clickedProducts') || '[]');
  //     const username = localStorage.getItem('username') || localStorage.getItem('cashierName') || 'system';
  //     const newClickedProduct = {
  //       ...product,
  //       clickedAt: new Date().toISOString(),
  //       clickedFrom: 'product-list',
  //       clickedBy: username
  //     };
      
  //     // Check if product is already clicked
  //     const isAlreadyClicked = clickedProducts.some(cp => cp._id === product._id);
  //     if (!isAlreadyClicked) {
  //       clickedProducts.push(newClickedProduct);
  //       localStorage.setItem('clickedProducts', JSON.stringify(clickedProducts));
  //       console.log('Product added to localStorage:', newClickedProduct);
  //     }
      
  //     console.log('Stored clicked products:', clickedProducts);
      
  //     // Immediately remove the clicked product from the current list
  //     setProducts(prevProducts => prevProducts.filter(p => p._id !== product._id));
      
  //     // Show success message
  //     alert(`${product.itemName} has been deleted and moved to the deleted products page.`);
      
  //     // Navigate to the add product page with the product data
  //     console.log('ProductList - Navigating to DeleteProduct with product:', product);
  //     navigate('/AddProduct', {
  //       state: {
  //         product: product,
  //         clickedAt: new Date().toISOString(),
  //         clickedFrom: 'product-list',
  //         darkMode: darkMode
  //       }
  //     });
  //   } catch (err) {
  //     console.error('Error in handleAddProductClick:', err);
  //     setError(err.message);
  //     alert('Error marking product as clicked: ' + err.message);
  //   }
  // };

  const handleAddProductClick = async (product) => {
  // Confirm deletion
  const isConfirmed = window.confirm(`Are you sure you want to delete "${product.itemName}"? This will hide it from the product list.`);
  if (!isConfirmed) return;

  try {
    console.log('Deleting product:', product.itemName);

    const username = localStorage.getItem('username') || 
                     localStorage.getItem('cashierName') || 
                     'system';

    // 🚀 Send request to backend to soft-delete
    const response = await fetch(`${API_URL}/${product._id}/deleteProduct`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ deletedBy: username })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to delete product');
    }

    console.log('Product soft-deleted:', result.product);

    // ✅ Remove from UI
    setProducts(prev => prev.filter(p => p._id !== product._id));

    // ✅ Optional: Save to localStorage for history (used in AddProduct page)
    // const clickedProducts = JSON.parse(localStorage.getItem('clickedProducts') || '[]');
    // const alreadyExists = clickedProducts.some(cp => cp._id === product._id);

    // if (!alreadyExists) {
    //   const newClickedProduct = {
    //     ...product,
    //     clickedAt: new Date().toISOString(),
    //     clickedFrom: 'product-list',
    //     clickedBy: username,
    //     deletedAt: new Date().toISOString() // sync with backend
    //   };
    //   clickedProducts.push(newClickedProduct);
    //   localStorage.setItem('clickedProducts', JSON.stringify(clickedProducts));
    // }

    // ✅ Show success message
    alert(`${product.itemName} has been deleted and hidden from the product list.`);

    // ✅ Navigate to deleted products page
    navigate('/AddProduct', {
      // state: {
      //   product: product,
      //   clickedAt: new Date().toISOString(),
      //   clickedFrom: 'product-list',
      //   darkMode: darkMode
      // }
    });

  } catch (err) {
    console.error('Error deleting product:', err);
    alert(`Error: ${err.message}`);
  }
};

  const normalize = (str) => str.toLowerCase().replace(/\s+/g, ' ');

  // const filteredProductsForModal = searchQuery.trim() === ""
  //   ? products
  //   : products.filter(product => {
  //       const searchableText = (product.grnNumber + ' ' + product.itemName + ' ' + product.category + ' ' + product.itemCode).toLowerCase();

  //       // Split query into words and test each as a whole word or number
  //       const words = normalize(searchQuery).trim().split(/\s+/);

  //       return words.every(word => {
  //         // Create a regex with word boundaries for exact partial matching
  //         const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  //         return regex.test(searchableText);
  //       });
  //     });
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

  const sortedAndFilteredProducts = useMemo(() => {
    // Start with filtered products
    // Start with all products or filtered list
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
        const name = (product.itemName + product.grnNumber + product.category + product.Supplier).toLowerCase()
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
        const name = (product.itemName + product.grnNumber + product.category + product.Supplier).toLowerCase()
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

    // Apply sorting if a column is selected
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let valueA = '';
        let valueB = '';

        switch (sortConfig.key) {
          case 'grn':
            valueA = a.itemName || '';
            valueB = b.itemName || '';
            break;
          case 'itemName':
            valueA = a.itemName || '';
            valueB = b.itemName || '';
            break;
          case 'category':
            valueA = a.category || '';
            valueB = b.category || '';
            break;
          case 'buyingPrice':
            valueA = a.returnstock || 0;
            valueB = b.returnstock || 0;
            break;
          case 'sellingPrice':
            valueA = a.damagedstock || 0;
            valueB = b.damagedstock || 0;
            break;
          case 'stock':
            valueA = a.stock || 0;
            valueB = b.stock || 0;
            break;
          case 'status':
            valueA = a.stock > 0 ? 1 : 0; // In Stock = 1, Out of Stock = 0
            valueB = b.stock > 0 ? 1 : 0;
            break;
          case 'supplier':
            valueA = a.Supplier || 0;
            valueB = b.Supplier || 0;
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
  }, [products, searchQuery, sortConfig, showLowStockOnly, show0StockOnly, hide0StockOnly, hideLowStockOnly, selectedCategories]);

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
    const token = localStorage.getItem('token');
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
        headers: { 'Content-Type': 'application/json',"Authorization": `Bearer ${token}` },
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
        headers: {  "Authorization": `Bearer ${token}` },
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
          {(!searchQuery) ? <FontAwesomeIcon icon={faSearch} className="search-icon" /> : <></> }
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
      </div>
      <div className="search-action-container">  
        {/* Category Filter */}
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
          <span style={{ fontSize: 14, color: '#666', marginRight: 8 }}>
            Products: {totalProducts}
          </span>
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
            <colgroup>
              <col style={{ width: '8%' }} />   {/* Date */}
              <col style={{ width: '30%' }} />  {/* Item Name ← main focus */}
              <col style={{ width: '16%' }} />  {/* Payment Method ← treated as "category" */}
              <col style={{ width: '10%' }} />   {/* Time */}
              <col style={{ width: '10%' }} />  {/* Invoice No. */}
              
              <col style={{ width: '8%' }} />  {/* Payment Method ← treated as "category" */}
              <col style={{ width: '10%' }} />  {/* Cashier Name */}
              <col style={{ width: '8%' }} />   {/* Discount */}
            </colgroup>
            <thead>
              <tr>
                {/* <th>GRN</th> */}
                <th onClick={() => handleSort('grn')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Grn
                  {sortConfig.key === 'grn' && (
                    <span style={{ marginLeft: '8px' }}>
                      {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('itemName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Item Name
                  {sortConfig.key === 'itemName' && (
                    <span style={{ marginLeft: '8px' }}>
                      {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('category')} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  Category
                  {sortConfig.key === 'category' && (
                    <span style={{ marginLeft: '8px' }}>
                      {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('buyingPrice')} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'normal', wordBreak: 'break-word'  }}>
                  Returned
                  {sortConfig.key === 'buyingPrice' && (
                    <span style={{ marginLeft: '8px' }}>
                      {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('sellingPrice')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Damaged
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
                <th>Real Balance</th>
                <th>Used</th>
                <th>Supplier Qty</th>
                {/* <th>Supplier</th> */}
                {/* <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Status
                  {sortConfig.key === 'status' && (
                    <span style={{ marginLeft: '8px' }}>
                      {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                    </span>
                  )}
                </th> */}
                <th onClick={() => handleSort('supplier')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Supplier
                  {sortConfig.key === 'supplier' && (
                    <span style={{ marginLeft: '8px' }}>
                      {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                    </span>
                  )}
                </th>
                <th>Date</th>
                {/* <th>Created At</th>
                <th>Added Back</th> */}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProductsForModal.map((product, idx) => (
                  <tr key={product._id || product.itemCode || idx} style={product.source === 'uploaded' ? { background: '#f7f7f7' } : {}}>
                    {/* <td>{product.itemCode || 'N/A'}</td> */}
                    <td>
                      <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight:  'bold'  }}>
                        {product.grnNumber} 
                      </span>
                    </td>
                    <td>
                      <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight:  'bold' , whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {product.itemName} 
                      </span>
                    </td>
                    <td>
                      <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight: 'bold' , whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {product.category} 
                      </span>
                    </td>
                    <td>
                      <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight:  'bold'  }}>
                        {(product.returnstock)} 
                      </span>
                    </td>
                    <td>
                      <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight:  'bold'  }}>
                        {(product.damagedstock)} 
                      </span>
                    </td>
                    <td>
                      <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight: 'bold'  }}>
                        {product.stock}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight: 'bold'  }}>
                        {((supplierQuantities[product.itemCode]||0) - (usedQuantities[product.itemCode]||0) - (product.returnstock||0) - (product.damagedstock||0))} 
                      </span>
                    </td>
                    <td>
                      {usageLoading ? (
                        <span>⋯</span>
                      ) : usedQuantities[product.itemCode] !== undefined ? (
                        <span style={{ color: product.stock <= 2 ? (product.stock === 0 ? 'red' : '#2957F0') : 'black', fontWeight: 'bold' }}>
                          {usedQuantities[product.itemCode]}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {supplierLoading ? (
                        <span>⋯</span>
                      ) : supplierQuantities[product.itemCode] !== undefined ? (
                        <span style={{ color: '#1e90ff', fontWeight: 'bold' }}>
                          {supplierQuantities[product.itemCode]}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    {/* <td>{product.supplierName || 'N/A'}</td> */}
                    {/* <td>
                      <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight: 'bold' }}>
                        {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td> */}
                    <td>
                      <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight: 'bold' }}>
                        {product.Supplier === 'Unknown' ? 'SYSTEM' : product.Supplier }
                      </span>
                    </td>
                    <td>{product.createdAt ? new Date(product.createdAt).toLocaleString() : 'N/A'}</td>
                    {/* <td>{product.addedBackAt ? (
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
                              <button
                                onClick={() => {
                                  setShowActionMenu(null);
                                  handleTrackItem(product);
                                }}
                                className="p-track-btn"
                              >
                                <div className="action-btn-content">
                                  <span style={{ fontSize: '18px', marginRight: '8px' }}>🔍</span>
                                  <span>Track Usage</span>
                                </div>
                              </button>
                              {/* <button onClick={() => handleReturn(product)} className="p-return-btn">
                                <div className="action-btn-content">
                                  <img src={returnicon} alt="return" width="30" height="30" className="p-return-btn-icon" />
                                  <span>Return</span>
                                </div>
                              </button> */}
                              {/* <button onClick={() => handleBarcode(product)} className="p-barcode-btn">
                                <div className="action-btn-content">
                                  <img src={barcodeicon} alt="barcode" width="30" height="30" className="p-barcode-btn-icon" />
                                  <span>Barcode</span>
                                </div>
                              </button> */}
                              {userRole === 'admin' && (
                                <>
                                  <button onClick={() => handleEdit(product)} className="p-edit-btn">
                                    <div className="action-btn-content">
                                      <img src={editicon} alt="edit" width="30" height="30" className="p-edit-btn-icon" />
                                      <span>Edit</span>
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
                                </>
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
                      <td>{record.retquantity > 0 ? 
                            record.givenQty > 0 ? 
                              `${record.quantity} (Given ${record.givenQty} / Returned: ${record.retquantity})` 
                              : `${record.quantity} (Returned: ${record.retquantity})` 
                            : record.type === "Repair Return" ? 
                              `${record.quantity} (Returned: ${record.quantity})` 
                              :`${record.quantity}`}
                      </td>
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