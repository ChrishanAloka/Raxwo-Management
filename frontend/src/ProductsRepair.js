import React, { useState, useEffect } from "react";
import EditProductRepair from "./EditProductRepair";
import AddProductRepair from "./AddProductRepair";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import "./ProductRepairList.css";
import "./TechnicianReviewModal.css"; // Add this line
import pdficon from "./icon/pdf.png";
import excelicon from "./icon/excle.png";
import refreshicon from "./icon/refresh.png";
import repairicon from "./icon/repair.png";
import paymenticon from "./icon/payment.png";
import jobBillIcon from "./icon/bill.png";
import deleteicon from "./icon/delete.png";
import edticon from "./icon/edit.png";
import viewicon from "./icon/statistics.png";
import selecticon from "./icon/sucess.png";
import { useMemo } from "react";


import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile, faFilePdf, faFileExcel, faSearch, faPlus, faTimes, faHistory } from '@fortawesome/free-solid-svg-icons';
import ChangeHistory from './components/ChangeHistory';


const API_URL = "https://raxwo-management.onrender.com/api/productsRepair";
const PRODUCT_API_URL = "https://raxwo-management.onrender.com/api/product-uploads";
const JOB_API = 'https://raxwo-management.onrender.com/api/productsRepair';

// Add flattenLogs function directly here:
function flattenLogs(data, entityType, entityIdField, entityNameField) {
  return data.flatMap(entity =>
    (entity.changeHistory || []).map(log => ({
      ...log,
      entityType,
      entityId: entity[entityIdField],
      entityName: entity[entityNameField] || entity[entityIdField] || '',
      repairInvoice: entity.repairInvoice || entity.repairCode || 'N/A',
      customerName: entity.customerName || 'N/A',
      deviceType: entity.deviceType || entity.itemName || 'N/A',
    }))
  );
}

const ProductRepairList = ({ darkMode }) => {
  const [repairs, setRepairs] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [returnFormData, setReturnFormData] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ serviceName: "", discountAmount: 0, description: "" });
  const [additionalServices, setAdditionalServices] = useState([]);
  const [newAdditionalService, setNewAdditionalService] = useState({ serviceName: "", serviceAmount: 0, description: "" });
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReviewRepair, setSelectedReviewRepair] = useState(null);
  const [technicianReview, setTechnicianReview] = useState("");
  const [showCashierChangesModal, setShowCashierChangesModal] = useState(false);
  const [cashierChanges, setCashierChanges] = useState({});
  const [showAllStatusesInline, setShowAllStatusesInline] = useState(false);

  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [tempSellingPrice, setTempSellingPrice] = useState('');

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  // State for filtering and pagination
  const [currentStatusFilter, setCurrentStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [productPage, setProductPage] = useState(1);
  const productsPerPage = 10;

  const [repairPage, setRepairPage] = useState(1);
  const repairsPerPage = 10;

  const handleClearAllProducts = () => {
    setProductSearchQuery('');
    setProductPage(1);
  };
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });


  const normalize = (str) => str.toLowerCase().replace(/\s+/g, ' ');

  const filteredProductsForModal = productSearchQuery.trim() === ""
    ? products
    : products.filter(product => {
        const searchableText = normalize(product.itemName + ' ' + product.category + ' ' + product.itemCode);
        const words = normalize(productSearchQuery).trim().split(/\s+/);

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
  // console.log("Current product search query:", productSearchQuery);
  // console.log("Current products in state:", products);  
  // console.log("Filtered products for modal:", filteredProductsForModal);
  const totalProductPages = Math.ceil(filteredProductsForModal.length / productsPerPage);
  const paginatedProductsForModal = filteredProductsForModal.slice((productPage - 1) * productsPerPage, productPage * productsPerPage);

  // Filter and pagination logic
  const statusFilters = ["All", "Pending", "In Progress", "Completed", "Cancelled"];
  const isRepairPaid = (repair) => {
    if (!repair.additionalServices || repair.additionalServices.length === 0) return true;
    return repair.additionalServices.every(service => service.isPaid);
  };

  const filteredRepairs = useMemo(() => {
    const normalize = (str) => String(str || '').toLowerCase().trim();
    const query = normalize(searchTerm);
    const queryWords = query ? query.split(' ').filter(Boolean) : [];

    return repairs.filter((repair) => {
      // ✅ 1. Status Filter: Skip if not "All" and doesn't match
      if (currentStatusFilter !== 'All' && repair.repairStatus !== currentStatusFilter) {
        return false;
      }

      // ✅ 2. If no search term, show the repair (status already passed)
      if (queryWords.length === 0) return true;

      // ✅ 3. Build searchable text from relevant fields
      const searchableText = [
        repair.repairInvoice,
        repair.repairCode,
        repair.customerName,
        repair.customerPhone,
        repair.deviceType,
        repair.itemName,
        repair.issueDescription,
        repair.serialNumber,
        repair.repairStatus
      ]
        .filter(Boolean) // Remove null/undefined
        .map(normalize)
        .join(' ');

      // ✅ 4. Match ALL words in any field (e.g., "john" and "077")
      return queryWords.every(word => searchableText.includes(word));
    });
  }, [repairs, searchTerm, currentStatusFilter]);
    
  const sortedAndFilteredRepairs = useMemo(() => {
    // Start with filtered repairs (your existing filtering logic)
    let result = filteredRepairs;

    // Apply sorting only if a column is selected
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let valueA = '';
        let valueB = '';

        // Extract values based on column key
        switch (sortConfig.key) {
          case 'repairInvoice':
            valueA = a.repairInvoice || a.repairCode || '';
            valueB = b.repairInvoice || b.repairCode || '';
            break;
          case 'customerName':
            valueA = a.customerName || '';
            valueB = b.customerName || '';
            break;
          case 'customerPhone':
            valueA = a.customerPhone || '';
            valueB = b.customerPhone || '';
            break;
          case 'deviceType':
            valueA = a.deviceType || a.itemName || '';
            valueB = b.deviceType || b.itemName || '';
            break;
          case 'serialNumber':
            valueA = a.serialNumber || '';
            valueB = b.serialNumber || '';
            break;
          case 'issueDescription':
            valueA = a.issueDescription || '';
            valueB = b.issueDescription || '';
            break;
          case 'repairStatus':
            valueA = a.repairStatus || '';
            valueB = b.repairStatus || '';
            break;
          default:
            return 0;
        }

        // Case-insensitive string comparison
        valueA = String(valueA).toLowerCase();
        valueB = String(valueB).toLowerCase();

        if (valueA < valueB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [filteredRepairs, sortConfig]);
    // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedAndFilteredRepairs;
  const totalPages = Math.ceil(sortedAndFilteredRepairs.length / itemsPerPage);

  const totalRepairPages = Math.ceil(sortedAndFilteredRepairs.length / repairsPerPage);
  const paginatedRepairsForModal = sortedAndFilteredRepairs.slice((repairPage - 1) * repairsPerPage, repairPage * repairsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0); // Scroll to top when changing pages
  };
  

  const fetchRepairs = () => {
    setLoading(true);
    fetch(API_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
        return response.json();
      })
      .then((data) => {
        // console.log("Raw API response repairs:", data);

        const repairData = Array.isArray(data) ? data : data.repairs || [];

        // Ensure all repair records have repairCart, totalRepairCost, and changeHistory
        const processedRepairData = repairData.map(repair => {
          // console.log("Processing repair:", repair.repairInvoice || repair.repairCode);
          // console.log("Change history before processing:", repair.changeHistory);
        
          const processedChangeHistory = Array.isArray(repair.changeHistory)
            ? repair.changeHistory.map(change => ({
                ...change,
                changedAt: change.changedAt || new Date().toISOString(),
                changedBy: change.changedBy || 'System',
                field: change.field || 'Unknown Field',
                oldValue: change.oldValue !== undefined ? change.oldValue : 'N/A',
                newValue: change.newValue !== undefined ? change.newValue : 'N/A',
                changeType: change.changeType || 'UPDATE'
              }))
            : [];
        
          return {
            ...repair,
            repairCart: repair.repairCart || [],
            totalRepairCost: repair.totalRepairCost || 0,
            technicianReview: repair.technicianReview || "",
            changeHistory: processedChangeHistory,
            repairStatus: repair.repairStatus && statusFilters.includes(repair.repairStatus) 
              ? repair.repairStatus 
              : "Pending" // Default to "Pending" if status is invalid
          };
        });
        // console.log("Processed repair data:", processedRepairData);
        setRepairs(processedRepairData);
        setLoading(false);
        if (processedRepairData.length === 0) {
          setError("No repair records found in the database.");
        }
      })
      .catch((err) => {
        // console.error("Fetch repairs error:", err);
        setError(err.message);
        setLoading(false);
      });
  };

  const fetchProducts = () => {
    fetch(PRODUCT_API_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
        return response.json();
      })
      .then((data) => {
        // console.log("Raw API response:", data);

        // Step 1: Extract the product list from the correct field
        const rawProducts = Array.isArray(data.records)
          ? data.records
          : data && typeof data === "object" && "records" in data
            ? data.records
            : [];

        // console.log("Raw products from API:", rawProducts);

        // Step 2: Normalize the product data
        const normalizedProducts = rawProducts.map((product) => {
          const dataObj = product.data || {};
          return {
            _id: product._id,
            itemCode: product.itemCode,
            itemName: product.itemName,
            category: product.category,
            stock:product.stock,
            // Add other fields as needed
          };
        });

        // Step 3: Filter out already selected products
        const clickedProducts = JSON.parse(localStorage.getItem("clickedProducts") || "[]");
        const clickedProductIds = clickedProducts.map((cp) => cp._id);

        const availableProducts = normalizedProducts.filter(
          (product) =>
            !product.clickedForAdd && !clickedProductIds.includes(product._id)
        );

        // Step 4: Update state
        setProducts(availableProducts);
      })
      .catch((err) => {
        // console.error("Fetch products error:", err);
        setError(err.message);
      });
  };

  useEffect(() => {
    // Make jsPDF available globally so popup windows can access it
    window.jspdf = { jsPDF };
    fetchRepairs();
    fetchProducts();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Clear error messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleDelete = async (id) => {
    const userRole = localStorage.getItem("role");
    if (userRole !== "admin") {
      setError("Only admins can delete repair records.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this repair record?")) {
      try {
        const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Failed to delete repair record");
        setRepairs(repairs.filter((repair) => repair._id !== id));
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleEdit = (repair) => {
    // Add detailed logging to debug the repair data

    // console.log("Selected repair for edit:", repair);
    // console.log("Repair cart:", repair.repairCart);
    // console.log("Total repair cost:", repair.totalRepairCost);

    // Make sure we're passing the complete repair object
    setSelectedRepair({
      ...repair,
      repairCart: repair.repairCart || [],
      totalRepairCost: repair.totalRepairCost || 0
    });
    setShowEditModal(true);
  };

  const handleView = (repair) => {
    setSelectedRepair(repair);
    setDiscount(0); // Reset discount when opening view modal
    setServices(repair.services || []); // Load existing services
    setNewService({ serviceName: "", discountAmount: 0, description: "" }); // Reset new service form
    setAdditionalServices(repair.additionalServices || []); // Load existing additional services
    setNewAdditionalService({ serviceName: "", serviceAmount: 0, description: "" }); // Reset new additional service form
    setShowViewModal(true);
  };

  const handleSelectProducts = (repair) => {
    setSelectedRepair(repair);
    setSelectedProducts([]);
    setShowSelectModal(true);
    fetchProducts();
  };

  const handleProductSelection = (product) => {
    // console.log("Selected product:", product);

    // Ensure supplierName and itemName are valid
    let supplierName = product.supplierName && product.supplierName.trim() !== ''
      ? product.supplierName
      : "Default Supplier";
    let itemName = product.itemName && product.itemName.trim() !== ''
      ? product.itemName
      : product.deviceType || "Default Item";

    // console.log(`Using supplierName: ${supplierName}, itemName: ${itemName} for product ${product.itemCode}`);

    const sellingPrice = product.sellingPrice || 0; // Use DB selling price as default

    const existing = selectedProducts.find((p) => p.itemCode === product.itemCode);
    if (existing) {
      setSelectedProducts(
        selectedProducts.map((p) =>
          p.itemCode === product.itemCode ? {
            ...p,
            quantity: p.quantity + 1,
            supplierName: supplierName,
            itemName: itemName,
            cost: (p.sellingPrice || sellingPrice) * (p.quantity + 1),
            buyingPrice: product.buyingPrice,
          } : p
        )
      );
    } else {
      setSelectedProducts([...selectedProducts, {
        itemCode: product.itemCode,
        itemName: itemName,
        category: product.category,
        quantity: 1,
        supplierName: supplierName,
        sellingPrice, // 👈 Initialize with product's selling price
        cost: sellingPrice,
        buyingPrice: product.buyingPrice
      }]);
    }
  };

  const handleRemoveProduct = (index) => {
    // Create a copy of the selectedProducts array
    const updatedProducts = [...selectedProducts];
    // Remove the product at the specified index
    updatedProducts.splice(index, 1);
    // Update the state with the new array
    setSelectedProducts(updatedProducts);
  };

  const handleUpdateQuantity = (index, change) => {
    // Create a copy of the selectedProducts array
    const updatedProducts = [...selectedProducts];
    // Get the current product
    const product = updatedProducts[index];
    // Calculate the new quantity (ensure it's at least 1)
    const newQuantity = Math.max(1, product.quantity + change);
    // Update the product's quantity
    updatedProducts[index] = { ...product, quantity: newQuantity };
    // Update the state with the new array
    const sellingPrice = product.sellingPrice || 0;

    const buyingPrice = product.buyingPrice || 0;

    updatedProducts[index] = {
    ...product,
    quantity: newQuantity,
    cost: sellingPrice * newQuantity,
    buyingPrice: buyingPrice * newQuantity,
  };

    setSelectedProducts(updatedProducts);
  };

  const handleReturnProduct = (repair) => {
    setSelectedRepair(repair);
    // Initialize return form data with cart items
    setReturnFormData(
      repair.repairCart.map((item) => ({
        itemCode: item.itemCode,
        itemName: item.itemName,
        category: item.category,
        quantity: 0,
        maxQuantity: item.quantity,
      }))
    );
    setShowReturnModal(true);
  };

  const handleReturnFormChange = (itemCode, value) => {
    const quantity = Math.max(0, Math.min(parseInt(value) || 0, returnFormData.find((item) => item.itemCode === itemCode).maxQuantity));
    setReturnFormData(
      returnFormData.map((item) =>
        item.itemCode === itemCode ? { ...item, quantity } : item
      )
    );
  };

  const handleReturnSubmit = async () => {
    try {
      // Get the products that have a quantity greater than 0
      const returnProducts = returnFormData
        .filter((item) => item.quantity > 0)
        .map((item) => {
          // Always set a valid supplierName for returned products
          const cartItem = selectedRepair.repairCart.find(cartItem => cartItem.itemCode === item.itemCode);

          // Ensure supplierName is a valid non-empty string
          let supplierName = "Default Supplier";
          if (cartItem?.supplierName && typeof cartItem.supplierName === 'string' && cartItem.supplierName.trim() !== '') {
            supplierName = cartItem.supplierName;
          }

          // console.log(`Setting supplierName for returned product ${item.itemCode}: ${supplierName}`);

          return {
            itemCode: item.itemCode,
            quantity: item.quantity,
            supplierName: supplierName
          };
        });

      if (returnProducts.length === 0) {
        setError("Please select at least one product to return with a valid quantity.");
        return;
      }

      // console.log("Sending returnProducts with supplierName:", returnProducts);

      // Show loading message
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/return-cart/${selectedRepair._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnProducts }),
      });

      // Parse response even if it's an error, to get the error message
      const responseData = await response.json();

      if (!response.ok) {
        // console.error("Server error response:", responseData);
        throw new Error(responseData.message || "Failed to return products");
      }

      // console.log("Updated repair after return:", responseData);
      setRepairs(repairs.map((r) => (r._id === responseData._id ? responseData : r)));
      setShowReturnModal(false);
      setReturnFormData([]);
      fetchRepairs();
      fetchProducts();
      setMessage("Products returned successfully!");
    } catch (err) {
      // console.error("Error returning products:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCart = async () => {
    const changedBy = localStorage.getItem('username') || 'system';
    try {
      if (selectedProducts.length === 0) {
        setError("No products selected. Please select at least one product.");
        return;
      }

      // 🔍 Validation: Check if any product is missing sellingPrice
      const invalidProducts = selectedProducts.filter(
        (p) => p.sellingPrice == null || isNaN(p.sellingPrice) || p.sellingPrice <= 0
      );

      if (invalidProducts.length > 0) {
        setError("Please enter a valid selling price (greater than 0) for all selected products.");
        
        // Optional: Focus or highlight first invalid product
        const firstInvalidIndex = selectedProducts.indexOf(invalidProducts[0]);
        const input = document.querySelectorAll(`.selling-price-input`)[firstInvalidIndex];
        if (input) input.focus();

        return;
      }

      // ✅ All validations passed — proceed with update
      setLoading(true);
      setError("");

      // Ensure all selected products have a valid supplierName
      const productsWithSupplier = selectedProducts.map(product => {
        // Always set supplierName to ensure it's present and valid
        let supplierName = "Default Supplier";
        if (product.supplierName && typeof product.supplierName === 'string' && product.supplierName.trim() !== '') {
          supplierName = product.supplierName;
        }

        // console.log(`Ensuring product ${product.itemCode} has supplierName: ${supplierName}`);
        return {
          ...product,
          supplierName: supplierName
        };
      });


      const response = await fetch(`${API_URL}/update-cart/${selectedRepair._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedProducts: productsWithSupplier, changedBy }),
      });

      // Parse response even if it's an error, to get the error message
      const responseData = await response.json();

      if (!response.ok) {
        console.error("Server error response:", responseData);
        throw new Error(responseData.message || "Failed to update cart");
      }

      // console.log("Updated repair from server:", responseData);
      setRepairs(repairs.map((r) => (r._id === responseData._id ? responseData : r)));
      setShowSelectModal(false);
      setSelectedProducts([]);
      fetchRepairs();
      fetchProducts();
      setMessage("Cart updated successfully!");
    } catch (err) {
      console.error("Error updating cart:", err);

      // Provide more detailed error message
      let errorMessage = err.message;
      if (errorMessage.includes("supplierName")) {
        errorMessage = "Error with supplier name. Using default supplier name.";

        // Try again with explicit default supplier names
        try {
          const fixedProducts = selectedProducts.map(product => ({
            ...product,
            supplierName: "Default Supplier"
          }));

          // console.log("Retrying with fixed supplier names:", fixedProducts);

          const retryResponse = await fetch(`${API_URL}/update-cart/${selectedRepair._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ selectedProducts: fixedProducts, changedBy }),
          });

          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            // console.log("Retry successful:", retryData);
            setRepairs(repairs.map((r) => (r._id === retryData._id ? retryData : r)));
            setShowSelectModal(false);
            setSelectedProducts([]);
            fetchRepairs();
            fetchProducts();
            setMessage("Cart updated successfully after retry!");
            setLoading(false);
            return;
          } else {
            const retryError = await retryResponse.json();
            // console.error("Retry failed:", retryError);
            errorMessage += " Retry also failed.";
          }
        } catch (retryErr) {
          // console.error("Error during retry:", retryErr);
          errorMessage += " Retry also failed.";
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const handleDecreaseCartQuantity = async (index) => {
    try {
      setLoading(true);
      setError("");

      // Get the current repair cart
      const updatedCart = [...selectedRepair.repairCart];
      const item = updatedCart[index];

      // Ensure the item exists and has a valid quantity
      if (!item || item.quantity <= 0) {
        setError("Invalid item or quantity.");
        return;
      }

      // Decrease quantity or remove item if quantity becomes zero
      if (item.quantity > 1) {
        updatedCart[index] = { ...item, quantity: item.quantity - 1 };
      } else {
        updatedCart.splice(index, 1);
      }

      // Calculate new cart total
      const newCartTotal = updatedCart.reduce((total, cartItem) => total + (cartItem.cost || 0), 0);
      const totalAdditionalServicesAmount = selectedRepair.totalAdditionalServicesAmount || 0;
      const finalAmount = newCartTotal + (selectedRepair.repairCost || 0) - (selectedRepair.totalDiscountAmount || 0) + totalAdditionalServicesAmount;
      const removeditem = item.itemCode;

      // Update the server with the new cart
      const response = await fetch(`${API_URL}/${selectedRepair._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairCart: updatedCart,
          totalRepairCost: newCartTotal,
          finalAmount: finalAmount,
          removeditem: removeditem,
          removedqty: 1,

        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update cart quantity");
      }

      const updatedRepair = await response.json();
      // console.log("Updated repair after decreasing quantity:", updatedRepair);

      // Update local state
      setRepairs(repairs.map((r) => (r._id === updatedRepair._id ? updatedRepair : r)));
      setSelectedRepair(updatedRepair);
      setMessage("Cart quantity updated successfully!");
    } catch (err) {
      // console.error("Error decreasing cart quantity:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePayment = async () => {
    try {
      // ✅ CHECK: Ensure a payment method is selected
      if (!selectedRepair.paymentMethod || selectedRepair.paymentMethod.trim() === "") {
        setError("Please select a payment method before completing the payment.");
        return; // Prevent further execution
      }

      // Check if there are any unpaid additional services
      const hasUnpaidServices = selectedRepair.additionalServices &&
        selectedRepair.additionalServices.some(service => !service.isPaid);

      if (hasUnpaidServices) {
        if (!window.confirm("There are unpaid additional services. Do you still want to mark the repair as completed?")) {
          return;
        }
      }

      const response = await fetch(`${API_URL}/${selectedRepair._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repairStatus: "Completed" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update repair status");
      }

      const updatedRepair = await response.json();
      // console.log("Repair status updated to Completed:", updatedRepair);
      setRepairs(repairs.map((r) => (r._id === updatedRepair._id ? updatedRepair : r)));
      setShowViewModal(false);
      fetchRepairs();
      setMessage("Repair marked as completed successfully!");
    } catch (err) {
      console.error("Error completing payment:", err);
      setError(err.message);
    }
  };

  // Handle changes to the new service form
  const handleNewServiceChange = (e) => {
    const { name, value } = e.target;
    setNewService({
      ...newService,
      [name]: name === "discountAmount" ? parseFloat(value) || 0 : value
    });
  };
    // Apply all service discounts
    const handleApplyServiceDiscounts = async () => {
      try {
        if (services.length === 0) {
          setError("No services added. Please add at least one service with a discount.");
          return;
        }
  
        // Calculate total discount amount
        const totalDiscountAmount = services.reduce((total, service) => total + service.discountAmount, 0);
  
        // Calculate cart total and base total
        const cartTotal = selectedRepair.repairCart.reduce((total, item) => total + item.cost, 0);
        const baseTotal = cartTotal + (selectedRepair.repairCost || 0);
  
        // Ensure discount doesn't exceed total cost
        if (totalDiscountAmount > baseTotal) {
          setError("Total discount cannot exceed the total repair cost.");
          return;
        }
  
        // Calculate new total repair cost
        const updatedTotalRepairCost = baseTotal - totalDiscountAmount;
  
        // Calculate final amount (including additional services)
        const totalAdditionalServicesAmount = selectedRepair.totalAdditionalServicesAmount || 0;
        const finalAmount = updatedTotalRepairCost + totalAdditionalServicesAmount;
  
        // console.log("Applying service discounts:", services);
        // console.log("Total discount amount:", totalDiscountAmount);
        // console.log("New total repair cost:", updatedTotalRepairCost);
        // console.log("Final amount (including additional services):", finalAmount);
  
        const response = await fetch(`${API_URL}/${selectedRepair._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            services: services,
            totalDiscountAmount: totalDiscountAmount,
            totalRepairCost: updatedTotalRepairCost,
            finalAmount: finalAmount
          }),
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to apply service discounts");
        }
  
        const updatedRepair = await response.json();
        // console.log("Updated repair with service discounts:", updatedRepair);
        setRepairs(repairs.map((r) => (r._id === updatedRepair._id ? updatedRepair : r)));
        setSelectedRepair(updatedRepair);
        setMessage("Service discounts applied successfully!");
      } catch (err) {
        console.error("Error applying service discounts:", err);
        setError(err.message);
      }
    };
  
  
  // Add a new service to the list
  const handleAddService = async () => {
    if (!newService.serviceName.trim()) {
      setError("Service name is required");
      return;
    }
  
    if (isNaN(newService.discountAmount) || newService.discountAmount < 0) {
      setError("Discount amount must be a positive number");
      return;
    }
  
    try {
      const updatedServices = [...services, { ...newService }];
      setServices(updatedServices);
      setNewService({ serviceName: "", discountAmount: 0, description: "" });
  
      const cartTotal = selectedRepair.repairCart.reduce((total, item) => total + Math.max(0, parseFloat(item.cost || 0)), 0);
      const baseTotal = cartTotal + Math.max(0, parseFloat(selectedRepair.repairCost || 0));
      const totalDiscountAmount = updatedServices.reduce((total, service) => total + Math.max(0, parseFloat(service.discountAmount || 0)), 0);
      const totalAdditionalServicesAmount = parseFloat(selectedRepair.totalAdditionalServicesAmount || 0); 
      const updatedTotalRepairCost = Math.max(0, baseTotal - totalDiscountAmount); 
      const finalAmount = updatedTotalRepairCost + totalAdditionalServicesAmount;
      // console.log("Calculation details:", { cartTotal, repairCost: selectedRepair.repairCost, totalDiscountAmount, totalAdditionalServicesAmount, updatedTotalRepairCost, finalAmount });
      const response = await fetch(`${API_URL}/${selectedRepair._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: updatedServices,
          totalDiscountAmount,
          totalRepairCost: updatedTotalRepairCost,
          finalAmount
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to apply service");
      }
  
      const updatedRepair = await response.json();
      setSelectedRepair(updatedRepair);
      setRepairs(repairs.map(r => (r._id === updatedRepair._id ? updatedRepair : r)));
      setMessage("Service added and totals updated successfully!");
    } catch (err) {
      console.error("Error adding service:", err);
      setError(err.message);
    }
  };
    const handleRemoveService = async (index) => {
    try {
      const updatedServices = [...services];
      updatedServices.splice(index, 1);
      setServices(updatedServices);
  
      const totalDiscountAmount = updatedServices.reduce((total, service) => total + service.discountAmount, 0);
      const cartTotal = selectedRepair.repairCart.reduce((total, item) => total + item.cost, 0);
      const baseTotal = cartTotal + (selectedRepair.repairCost || 0);
      const updatedTotalRepairCost = baseTotal - totalDiscountAmount;
      const totalAdditionalServicesAmount = selectedRepair.totalAdditionalServicesAmount || 0;
      const finalAmount = updatedTotalRepairCost + totalAdditionalServicesAmount;
  
      const response = await fetch(`${API_URL}/${selectedRepair._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: updatedServices,
          totalDiscountAmount,
          totalRepairCost: updatedTotalRepairCost,
          finalAmount,
        }),
      });
  
      if (!response.ok) throw new Error("Failed to update after removing service");
  
      const updatedRepair = await response.json();
      setSelectedRepair(updatedRepair);
      setRepairs(repairs.map(r => (r._id === updatedRepair._id ? updatedRepair : r)));
      setMessage("Service removed and totals updated.");
    } catch (err) {
      setError(err.message);
    }
  };
  
  // Handle changes to the new additional service form
  const handleNewAdditionalServiceChange = (e) => {
    const { name, value } = e.target;
    setNewAdditionalService({
      ...newAdditionalService,
      [name]: name === "serviceAmount" ? parseFloat(value) || 0 : value
    });
  };

  // Add a new additional service
  const handleAddAdditionalService = async () => {
    if (!newAdditionalService.serviceName.trim()) {
      setError("Service name is required");
      return;
    }

    if (isNaN(newAdditionalService.serviceAmount) || newAdditionalService.serviceAmount <= 0) {
      setError("Service amount must be a positive number");
      return;
    }

    try {
      setLoading(true); // Show loading indicator
      setError(""); // Clear any previous errors

      // Create a clean service object with proper number conversion
      const serviceToAdd = {
        serviceName: newAdditionalService.serviceName.trim(),
        serviceAmount: parseFloat(newAdditionalService.serviceAmount),
        description: newAdditionalService.description ? newAdditionalService.description.trim() : ""
      };

      // console.log("Sending additional service data:", serviceToAdd);

      const response = await fetch(`${API_URL}/add-service/${selectedRepair._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          additionalService: serviceToAdd
        }),
      });

      // First check if response is ok before trying to parse it
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            throw new Error(errorData.message || `Server error: ${response.status}`);
          } catch (jsonError) {
            // If JSON parsing fails, use the status text
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
          }
        } else {
          // For non-JSON error responses
          const errorText = await response.text();
          console.error("Server error response:", errorText);
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }

      // If we get here, the response is ok, so try to parse the JSON
      try {
        const responseData = await response.json();
        // console.log("Added additional service:", responseData);

        // Update the UI with the new data
        setRepairs(repairs.map((r) => (r._id === responseData._id ? responseData : r)));
        setSelectedRepair(responseData);
        setAdditionalServices(responseData.additionalServices || []);
        setNewAdditionalService({ serviceName: "", serviceAmount: 0, description: "" }); // Reset form
        setMessage("Additional service added successfully!");
      } catch (jsonError) {
        console.error("Error parsing successful response:", jsonError);
        throw new Error("Server returned an invalid response format. The service may have been added, please refresh the page.");
      }
    } catch (err) {
      console.error("Error adding additional service:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false); // Hide loading indicator
    }
  };

  // Pay for a specific additional service
  const handlePayAdditionalService = async (index) => {
    try {
      setLoading(true); // Show loading indicator
      setError(""); // Clear any previous errors

      // console.log("Marking service as paid, index:", index);

      const response = await fetch(`${API_URL}/pay-service/${selectedRepair._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceIndex: index
        }),
      });

      // First check if response is ok before trying to parse it
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            throw new Error(errorData.message || `Server error: ${response.status}`);
          } catch (jsonError) {
            // If JSON parsing fails, use the status text
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
          }
        } else {
          // For non-JSON error responses
          const errorText = await response.text();
          console.error("Server error response:", errorText);
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }

      // If we get here, the response is ok, so try to parse the JSON
      try {
        const responseData = await response.json();
        // console.log("Marked service as paid:", responseData);

        // Update the UI with the new data
        setRepairs(repairs.map((r) => (r._id === responseData._id ? responseData : r)));
        setSelectedRepair(responseData);
        setAdditionalServices(responseData.additionalServices || []);
        setMessage("Service marked as paid!");
      } catch (jsonError) {
        console.error("Error parsing successful response:", jsonError);
        throw new Error("Server returned an invalid response format. The service may have been marked as paid, please refresh the page.");
      }
    } catch (err) {
      console.error("Error marking service as paid:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false); // Hide loading indicator
    }
  };

  const handleApplyDiscount = async () => {
    try {
      const discountAmount = parseFloat(discount);
      if (totalDiscountAmount > baseTotal) {
        setError("Total discount cannot exceed the base repair cost.");
        return;
      }  
      const updatedServices = [
        ...services,
        {
          serviceName: "Quick Discount",
          discountAmount,
          description: "Quick discount applied"
        }
      ];
  
      const totalDiscountAmount = updatedServices.reduce((total, service) => total + service.discountAmount, 0);
      const cartTotal = selectedRepair.repairCart.reduce((total, item) => total + item.cost, 0);
      const baseTotal = cartTotal + (selectedRepair.repairCost || 0);
      const updatedTotalRepairCost = baseTotal - totalDiscountAmount;
      const totalAdditionalServicesAmount = selectedRepair.additionalServices
      ? selectedRepair.additionalServices.reduce((total, service) => total + (service.isPaid ? 0 : parseFloat(service.serviceAmount || 0)), 0)
      : 0;
    const finalAmount = updatedTotalRepairCost + totalAdditionalServicesAmount;  
      const response = await fetch(`${API_URL}/${selectedRepair._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: updatedServices,
          totalDiscountAmount,
          totalRepairCost: updatedTotalRepairCost,
          finalAmount
        }),
      });
  
      if (!response.ok) throw new Error("Failed to apply discount");
  
      const updatedRepair = await response.json();
      setSelectedRepair(updatedRepair);
      setRepairs(repairs.map((r) => (r._id === updatedRepair._id ? updatedRepair : r)));
      setServices(updatedRepair.services || []);
      setDiscount(0);
      setMessage("Discount applied and totals updated.");
    } catch (err) {
      setError(err.message);
    }
  };
    
  const calculateCartTotal = (cart) => {
    if (!cart || !Array.isArray(cart)) return "0.00";
    return cart
      .reduce((total, item) => total + Math.max(0, parseFloat(item.cost || 0)), 0)
      .toFixed(2);
  };
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text("Job List", 90, 20);
    const tableColumn = [
      "Job Number",
      "Customer Name",
      "Mobile",
      "Device",
      "IMEI/Serial No",
      "Issue Description",
      "Checking Charge",
      "Status",
      "Cart Total",
      "Total Repair Cost",
      "Final Amount",
    ];
    const tableRows = repairs.map((repair) => [
      repair.repairInvoice || repair.repairCode,
      repair.customerName,
      repair.customerPhone || "N/A",
      repair.deviceType || repair.itemName,
      repair.serialNumber || "N/A",
      repair.issueDescription,
      `Rs. ${repair.checkingCharge || 0}`,
      repair.repairStatus,
      `Rs. ${calculateCartTotal(repair.repairCart)}`,
      `Rs. ${repair.totalRepairCost || 0}`,
      `Rs. ${repair.finalAmount || repair.totalRepairCost || 0}`,
    ]);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 30 });
    doc.save("Repair_List.pdf");
  };

  const generateExcel = () => {
    const formattedRepairs = repairs.map((repair) => ({
      "Job Number": repair.repairInvoice || repair.repairCode,
      "Customer Name": repair.customerName,
      "Mobile": repair.customerPhone || "N/A",
      "Device": repair.deviceType || repair.itemName,
      "IMEI/Serial No": repair.serialNumber || "N/A",
      "Issue Description": repair.issueDescription,
      "Status": repair.repairStatus,
      "Cart Total": `Rs. ${calculateCartTotal(repair.repairCart)}`,
      "Total Repair Cost": `Rs. ${repair.totalRepairCost || 0}`,
      "Final Amount": `Rs. ${repair.finalAmount || repair.totalRepairCost || 0}`,
    }));
    const worksheet = XLSX.utils.json_to_sheet(formattedRepairs);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Repairs");
    XLSX.writeFile(workbook, "Repair_List.xlsx");
  };

  const generateBill = (repair) => {
    const isPaid = isRepairPaid(repair);
    const unpaidServices = repair.additionalServices?.filter(service => !service.isPaid) || [];
    const unpaidServicesAmount = unpaidServices.reduce((total, s) => total + Math.max(0, parseFloat(s.serviceAmount || 0)), 0).toFixed(2);
    const baseRepairCost = parseFloat(repair.totalRepairCost || 0).toFixed(2);
    const actualUnpaidTotal = isPaid ? 0 : parseFloat(baseRepairCost) + parseFloat(unpaidServicesAmount);

    const billWindow = window.open("", "_blank");
    billWindow.document.write(`
      <html>
        <head>
          <title>Repair Bill</title>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              padding: 0;
            }
            .bill-container {
              max-width: 800px;
              margin: 0 auto;
              background-color: white;
              padding: 20px;
              border: 1px solid #ddd;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #333;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            .details, .totals {
              margin-bottom: 20px;
            }
            .details p, .totals p {
              margin: 5px 0;
              font-size: 14px;
            }
            .details strong, .totals strong {
              display: inline-block;
              width: 150px;
              color: #333;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
              color: #333;
            }
            .totals {
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
            .totals p {
              font-weight: bold;
            }
            .btn-group {
              text-align: center;
              margin: 20px 0;
            }
            .print-btn, .download-btn {
              margin: 0 10px;
              padding: 10px 20px;
              font-size: 16px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              color: white;
              text-decoration: none;
            }
            .print-btn {
              background-color: #28a745;
            }
            .print-btn:hover {
              background-color: #218838;
            }
            .download-btn {
              background-color: #007bff;
            }
            .download-btn:hover {
              background-color: #0056b3;
            }
            @media print {
              .btn-group {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="bill-container">
            <div class="header">
              <h1>Repair Bill</h1>
              <p>EXXPLAN Repair Services</p>
              <p>456 123 Repair Lane, Tech City, TC 45678</p>
              <p>Phone: (555) 123-4567 | Email: support@exxplan.com</p>
            </div>
            <div class="details">
              <p><strong>Job Number:</strong> ${repair.repairInvoice || repair.repairCode}</p>
              <p><strong>Customer:</strong> ${repair.customerName}</p>
              <p><strong>Phone:</strong> ${repair.customerPhone}</p>
              <p><strong>Device:</strong> ${repair.deviceType || repair.itemName}</p>
              <p><strong>Issue:</strong> ${repair.issueDescription}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                ${repair.repairCart
                  .map(
                    (item) => `
                      <tr>
                        <td>${item.itemName}</td>
                        <td>${item.category}</td>
                        <td>${item.quantity}</td>
                        <td>Rs. ${item.cost}</td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
            <div class="details">
              <p><strong>Product Description :</strong> ${repair.cartDescription}</p>
            </div>
            <div class="totals">
              <p><strong>Cart Total:</strong> Rs. ${calculateCartTotal(repair.repairCart)}</p>
              ${repair.services && repair.services.length > 0 ? `
              <div class="discounts">
                <p><strong>Discounts:</strong></p>
                <ul style="list-style-type: none; padding-left: 20px; margin: 5px 0;">
                  ${repair.services.map(service => `
                    <li>${service.serviceName}: Rs. ${service.discountAmount} ${service.description ? `(${service.description})` : ''}</li>
                  `).join('')}
                </ul>
                <p><strong>Total Discount:</strong> Rs. ${repair.totalDiscountAmount || 0}</p>
              </div>
              ` : ''}
              <p><strong>Total Repair Cost:</strong> Rs. ${repair.totalRepairCost || 0}</p>
              ${repair.additionalServices && repair.additionalServices.length > 0 ? `
              <div class="additional-services">
                <p><strong>Additional Services:</strong></p>
                <ul style="list-style-type: none; padding-left: 20px; margin: 5px 0;">
                  ${repair.additionalServices.map(service => `
                    <li>${service.serviceName}: Rs. ${service.serviceAmount} ${service.description ? `(${service.description})` : ''}${repair.repairStatus !== "Pending" ? service.isPaid ? ' <span style="color: green;">[PAID]</span>' : ' <span style="color: red;">[UNPAID]</span>' : ''}</li>
                  `).join('')}
                </ul>
                <p><strong>Total Additional Services:</strong> Rs. ${repair.totalAdditionalServicesAmount || 0}</p>
              </div>
              ` : ''}
              <p style="font-size: 16px; font-weight: bold; color: ${isPaid ? 'green' : 'red'}; border-top: 1px solid #ccc; padding-top: 10px;">
                ${isPaid ? '✅ TO BE PAID TOTAL' : '❌ UNPAID TOTAL'}: Rs. ${repair.finalAmount || repair.totalRepairCost || 0}
              </p>
            </div>

            <!-- Buttons -->
            <div class="btn-group">
              <button class="print-btn" onclick="window.print()">Print Bill</button>
              <button class="download-btn" onclick="downloadPDF()">Download PDF</button>
            </div>
          </div>

          <script type="text/javascript">
            function downloadPDF() {
              const { jsPDF } = window.jspdf;
              const element = document.querySelector('.bill-container');
              html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
              }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                  orientation: 'portrait',
                  unit: 'mm',
                  format: 'a4'
                });
                const imgProps = pdf.getImageProperties(imgData);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save('Repair_Bill_${repair.repairInvoice || repair.repairCode}.pdf');
              });
            }
          </script>
        </body>
      </html>
    `);
    billWindow.document.close();
  };

  const generateJobBill = (repair) => {
    const isPaid = isRepairPaid(repair);
    const unpaidServices = repair.additionalServices?.filter(service => !service.isPaid) || [];
    const unpaidServicesAmount = unpaidServices.reduce(
      (total, s) => total + Math.max(0, parseFloat(s.serviceAmount || 0)),
      0
    ).toFixed(2);

    const baseRepairCost = parseFloat(repair.totalRepairCost || 0).toFixed(2);
    const finalAmount = isPaid ? 0 : (parseFloat(baseRepairCost) + parseFloat(unpaidServicesAmount)).toFixed(2);

    const issueDate = new Date().toLocaleDateString('en-GB');
    const issueTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Job Sheet - ${repair.repairInvoice || repair.repairCode}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        <style>
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-btn-container {
              display: none !important;
            }
            body, .container {
              margin: 0;
              padding: 0;
              box-shadow: none;
            }
            .container {
              width: 210mm;
              height: 297mm;
            }
            @page {
              size: A4;
              margin: 0;
            }
          }

          @page {
            size: A4;
            margin: 0;
          }
          body {
            font-family: 'Helvetica', sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
            color: #000;
            box-sizing: border-box;
          }
          .container {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 15mm;
            position: relative;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            background: white;
          }
          .header {
            background-color: #f0f0f0 !important;
            padding: 10px 0;
            text-align: center;
            border-bottom: 1px solid #000;
          }
          .company-name {
            font-size: 18px;
            font-weight: bold;
            margin: 0;
          }
          .tagline {
            font-size: 10px;
            margin: 3px 0;
          }
          .contact-info {
            text-align: right;
            margin: 10px 0 0 0;
            font-size: 12px;
            color: #666;
          }
          .job-title {
            font-size: 14px;
            font-weight: bold;
            margin: 10px 0;
          }
          .job-details {
            font-size: 10px;
            color: #666;
            line-height: 1.6;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            font-size: 9px;
          }
          th, td {
            border: 1px solid #000;
            padding: 6px;
            text-align: left;
          }
          th {
            background-color: #f0f0f0 !important;
            font-weight: bold;
          }
          .terms-section {
            margin: 15px 0;
            font-size: 8px;
            color: #666;
            line-height: 1.4;
          }
          .terms-title {
            font-weight: bold;
            margin-bottom: 5px;
          }
          .notes-section {
            margin: 15px 0;
            font-size: 10px;
          }
          .notes-title {
            font-weight: bold;
          }
          .signature-area {
            margin: 30px 0;
            display: flex;
            justify-content: space-between;
          }
          .signature-line {
            width: 70%;
            border-top: 1px dashed #000;
            margin-top: 15px;
            height: 0;
          }
          .signature-label {
            text-align: center;
            font-size: 8px;
            margin-top: 3px;
          }
          .footer {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 30mm;
            background-color: #e6f0fa !important;
            z-index: -1;
          }
          .print-btn-container {
            text-align: center;
            margin: 20px 0;
          }
          .print-btn, .download-btn {
            margin: 0 10px;
            padding: 10px 20px;
            font-size: 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            color: white;
            text-decoration: none;
          }
          .download-btn {
            background-color: #007bff;
          }
          .download-btn:hover {
            background-color: #0056b3;
          }
          .print-btn {
            background-color: #28a745;
          }
          .print-btn:hover {
            background-color: #218838;
          }
        </style>
      </head>
      <body>

        <div class="container">
          <div class="header">
            <h1 class="company-name">EXXPLAN Repair Services</h1>
            <p class="tagline">Your Trusted Repair Partner</p>
          </div>

          <div class="contact-info">
            EXXPLAN Repair Services Pvt Ltd<br>
            No 422, Thimbirigasyaya Road, Colombo 05<br>
            (+94)77 2025 330
          </div>

          <div class="job-title">JOB SHEET</div>
          <div class="job-details">
            SERVICE JOB NO: ${repair.repairInvoice || repair.repairCode || 'REP14'}<br>
            DATE: ${issueDate}<br>
            TIME: ${issueTime}
          </div>

          <table>
            <thead>
              <tr>
                <th>Customer Name:</th>
                <th>Device:</th>
                <th>IMEI/SN:</th>
                <th>Contact Number:</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${repair.customerName || 'test test'}</td>
                <td>${repair.deviceType || repair.itemName || 'test dev'}</td>
                <td>${repair.serialNumber || 'S300'}</td>
                <td>${repair.customerPhone || '0774096667'}</td>
              </tr>
            </tbody>
          </table>

          <table>
            <thead>
              <tr>
                <th>Device Issue/Issues</th>
                <th>Checking Charge</th>
                <th>Estimation Value (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${repair.issueDescription || 'Battery failure'}</td>
                <td>Rs. ${repair.checkingCharge || '2000'}</td>
                <td>Rs. ${repair.estimationValue || '5'}</td>
              </tr>
            </tbody>
          </table>

          <div class="terms-section">
            <div class="terms-title">TERMS & CONDITIONS FOR THE REPAIR OF DEVICES</div>
            <div>
              ${[
                "1. The customer should receive a job sheet when an unit is handed over for repairs to EXXPLAN Repair Services Pvt Ltd and the contents filled in should be verified by the customer.",
                "2. The customer should produce the original job sheet at the time of collecting the unit. EXXPLAN Repair Services Pvt Ltd reserves the right to refuse to return upon non-availability of the original job sheet.",
                "3. Units repaired by EXXPLAN Repair Services Pvt Ltd are warranted for a period of 1(one) month from the date of collection of the unit by the customer.",
                "4. EXXPLAN Repair Services Pvt Ltd ensures that all units are repaired within 7(seven) from the date of the damaged unit has been handed over.",
                "5. The customer should collect the repaired unit within 14(Fourteen) days and if the unit is beyond repair our team will keep you informed and make necessary arrangements to collect the same.",
                "6. EXXPLAN Repair Services Pvt Ltd will not be responsible or liable for any units not collected within days from the date of the job sheet issued.",
                "7. EXXPLAN Repair Services Pvt Ltd will not be responsible for any damage or breakdown incurred during the process of repairing the unit.",
                "8. The customer is deemed to accept all Terms & Conditions mentioned in the job sheet."
              ].map(term => `<p style="margin: 3px 0;">${term}</p>`).join('')}
            </div>
          </div>

          <div class="notes-section">
            <div class="notes-title">Additional Notes</div>
            <div style="height: 60px; border: 1px dashed #000; padding: 5px; font-size: 9px; color: #777;">
              <!-- Empty space for user notes -->
            </div>
          </div>

          <div class="signature-area">
            <div style="width: 45%;">
              <div class="signature-line"></div>
              <div class="signature-label">Customer Signature</div>
            </div>
            <div style="width: 45%;">
              <div class="signature-line"></div>
              <div class="signature-label">Authorized Signature</div>
            </div>
          </div>

          <div class="footer"></div>
        </div>

        <div class="print-btn-container">
          <button class="print-btn" onclick="window.print()">Print Job Sheet</button>
          <button class="download-btn" onclick="downloadPDF()">Download PDF</button>
        </div>

        <script type="text/javascript">
          function downloadPDF() {
            const { jsPDF } = window.jspdf;
            const element = document.querySelector('.container');
            html2canvas(element, {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff'
            }).then(canvas => {
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
              });
              const imgProps = pdf.getImageProperties(imgData);
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
              pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
              pdf.save('JobSheet_${repair.repairInvoice || repair.repairCode}.pdf');
            });
          }
        </script>

      </body>
      </html>
    `;

    const billWindow = window.open('', '_blank');
    billWindow.document.write(htmlContent);
    billWindow.document.close();
  };

  // const filteredRepairs = repairs.filter((repair) =>
  //   (repair.repairInvoice || repair.repairCode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
  //   (repair.customerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
  //   (repair.customerPhone || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
  //   (repair.deviceType || repair.itemName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
  //   (repair.issueDescription || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
  //   (repair.serialNumber || "").toLowerCase().includes(searchQuery.toLowerCase())
  // );

  const filteredProducts = products.filter((product) =>
    product.itemCode.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    product.itemName.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  // Add this function after the other handler functions
  const handleAddReview = async (repair) => {
    // console.log("Opening review modal for repair:", repair);
    setSelectedReviewRepair(repair);
    setTechnicianReview(repair.technicianReview || "");
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    try {
      setLoading(true);
      setError("");

      // Get the current user's name from localStorage
      const username = localStorage.getItem('username') || 'System';

      // Create a change history entry for the review
      const changeEntry = {
        changedAt: new Date().toISOString(),
        changedBy: username,
        field: 'technicianReview',
        oldValue: selectedReviewRepair.technicianReview || 'No review',
        newValue: technicianReview,
        changeType: 'UPDATE'
      };

      const requestBody = {
        technicianReview: technicianReview,
        changeHistory: [...(selectedReviewRepair.changeHistory || []), changeEntry],
        changedBy: username
      };

      const response = await fetch(`${API_URL}/${selectedReviewRepair._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Review update failed:", errorData);
        throw new Error(errorData.message || "Failed to update review");
      }

      const updatedRepair = await response.json();
      // console.log("Review update successful:", updatedRepair);

      // Update the repairs list with the new review
      setRepairs(prevRepairs => {
        const newRepairs = prevRepairs.map(r =>
          r._id === updatedRepair._id ? { ...updatedRepair } : r
        );
        return newRepairs;
      });

      // Update the selected repair if it's currently being viewed
      if (selectedRepair && selectedRepair._id === updatedRepair._id) {
        setSelectedRepair(updatedRepair);
      }

      setShowReviewModal(false);
      setMessage("Technician review updated successfully!");

      // Fetch repairs again to ensure all data is consistent
      await fetchRepairs();

    } catch (err) {
      console.error("Error updating review:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderReview = (repair) => {
    // console.log("Rendering review for repair:", {
    //   id: repair._id,
    //   review: repair.technicianReview
    // });

    if (repair.technicianReview && repair.technicianReview.trim() !== "") {
      return (
        <div className="review-text" title={repair.technicianReview}>
          <div className="review-preview">
            {repair.technicianReview.length > 50
              ? repair.technicianReview.substring(0, 50) + "..."
              : repair.technicianReview}
          </div>
          <div className="review-tooltip">
            {repair.technicianReview}
          </div>
        </div>
      );
    }
    return <span className="no-review">No review</span>;
  };

  // Modify the status update handler
  const handleStatusUpdate = async (newStatus) => {
    try {
      setLoading(true);
      setError("");

      // Get the current user's name from localStorage
      const username = localStorage.getItem('username') || 'System';

      // Create a change history entry
      const changeEntry = {
        changedAt: new Date().toISOString(),
        changedBy: username,
        field: 'repairStatus',
        oldValue: selectedRepair.repairStatus,
        newValue: newStatus,
        changeType: 'UPDATE'
      };

      const response = await fetch(`${API_URL}/${selectedRepair._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          repairStatus: newStatus,
          changedBy: username,
          changeHistory: [...(selectedRepair.changeHistory || []), changeEntry]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Status update failed:", errorData);
        throw new Error(errorData.message || "Failed to update status");
      }

      const updatedRepair = await response.json();
      // console.log("Status update successful:", updatedRepair);

      // Update both the repairs list and selected repair
      setRepairs(prevRepairs => {
        const updatedRepairs = prevRepairs.map(r =>
          r._id === updatedRepair._id ? updatedRepair : r
        );
        // console.log("Updated repairs list:", updatedRepairs);
        return updatedRepairs;
      });

      setSelectedRepair(prevRepair => {
        const updated = { ...prevRepair, ...updatedRepair };
        // console.log("Updated selected repair:", updated);
        return updated;
      });

      setMessage("Repair status updated successfully!");
    } catch (err) {
      console.error("Error updating repair status:", err);
      setError(err.message || "Failed to update repair status");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignItem = async (itemCode, technicianName) => {
    try {
      setError("");
      setLoading(true);

      // Find the current repair
      const repair = selectedRepair;

      // Update repairCart with new assignment
      const updatedCart = repair.repairCart.map(item =>
        item.itemCode === itemCode
          ? { ...item, assignedTo: technicianName }
          : item
      );

      // Create change history entry
      const username = localStorage.getItem('username') || 'System';
      const changeEntry = {
        changedAt: new Date().toISOString(),
        changedBy: username,
        field: `assignItem_${itemCode}`,
        oldValue: repair.repairCart.find(i => i.itemCode === itemCode)?.assignedTo || "Unassigned",
        newValue: technicianName || "Unassigned",
        changeType: "UPDATE"
      };

      // Send PATCH request
      const response = await fetch(`${API_URL}/${repair._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          repairCart: updatedCart,
          changeHistory: [...(repair.changeHistory || []), changeEntry]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update assignment");
      }

      const updatedRepair = await response.json();

      // Update local state
      setSelectedRepair(updatedRepair);
      setRepairs(repairs.map(r => (r._id === updatedRepair._id ? updatedRepair : r)));

      setMessage(`Assigned item ${itemCode} to ${technicianName || "Unassigned"}`);
    } catch (err) {
      console.error("Error assigning item:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSellingPrice = async (itemCode, newPrice) => {
    if (isNaN(newPrice) || newPrice < 0) {
      setError("Please enter a valid selling price.");
      return;
    }

    const updatedCart = selectedRepair.repairCart.map(item =>
      item.itemCode === itemCode
        ? {
            ...item,
            sellingPrice: newPrice,
            cost: newPrice * item.quantity,
          }
        : item
    );

    const cartTotal = updatedCart.reduce((sum, item) => sum + item.cost, 0);
    const baseTotal = cartTotal + (selectedRepair.repairCost || 0);
    const totalDiscountAmount = services.reduce((sum, s) => sum + s.discountAmount, 0);
    const totalAdditionalServicesAmount = selectedRepair.totalAdditionalServicesAmount || 0;
    const finalAmount = baseTotal - totalDiscountAmount + totalAdditionalServicesAmount;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/${selectedRepair._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repairCart: updatedCart,
          totalRepairCost: cartTotal,
          finalAmount,
        }),
      });

      if (!response.ok) throw new Error("Failed to update selling price");

      const updatedRepair = await response.json();

      // Update local state
      setSelectedRepair(updatedRepair);
      setRepairs(repairs.map(r => (r._id === updatedRepair._id ? updatedRepair : r)));
      setMessage("Selling price updated successfully!");
    } catch (err) {
      console.error("Error updating selling price:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
 

  // Add this function to handle cashier changes view
  const handleViewCashierChanges = async () => {
    try {
      const jobsRes = await fetch(JOB_API);
      const jobs = await jobsRes.json();
      const jobLogs = flattenLogs(Array.isArray(jobs) ? jobs : jobs.jobs || [], 'job', 'repairInvoice', 'customerName');
      // Group changes by cashier
      const changesByCashier = jobLogs.reduce((acc, change) => {
        const cashier = change.changedBy || 'System';
        if (!acc[cashier]) {
          acc[cashier] = [];
        }
        acc[cashier].push({
          ...change,
          timestamp: new Date(change.changedAt).toLocaleString(),
          field: change.field || 'Unknown Field',
          oldValue: change.oldValue !== undefined ? change.oldValue : 'N/A',
          newValue: change.newValue !== undefined ? change.newValue : 'N/A',
          changeType: change.changeType || 'UPDATE',
        });
        return acc;
      }, {});
      // Sort changes within each cashier group by date (newest first)
      Object.keys(changesByCashier).forEach(cashier => {
        changesByCashier[cashier].sort((a, b) =>
          new Date(b.changedAt) - new Date(a.changedAt)
        );
      });
      setCashierChanges(changesByCashier);
      setShowCashierChangesModal(true);
      fetchRepairs(); // Refresh local repairs state to ensure UI is up-to-date
    } catch (err) {
      setCashierChanges({});
      setShowCashierChangesModal(true);
    }
  };


  const handleSort = (key) => {
  setSortConfig((prevConfig) => {
    const direction =
      prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc';
    return { key, direction };
  });
};

  return (

    <div className={`product-repair-list-container ${darkMode ? "dark" : ""}`}>
      
      <div className="header-section">
        

        <h2 className={`product-repair-list-title ${darkMode ? "dark" : ""}`}>
          Job List
        </h2>
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
              setRepairPage(1);
            }}
            className={`product-list-search-bar ${darkMode ? "dark" : ""}`}
          />
          {searchTerm && (
            <button onClick={handleClearSearch} className="search-clear-btn">
              ✕
            </button>
          )}
        </div>
          <div className="filter-action-row">
        <div className="status-filter-dropdown" style={{
          display: 'flex',
          justifyContent: 'center',
          margin: '20px 0',
          flexWrap: 'wrap'
        }}>
          <select
            value={currentStatusFilter}
            onChange={e => {
              setCurrentStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            className={`status-filter-select ${darkMode ? 'dark' : ''}`}
              style={{
                padding: '10px 20px',
                borderRadius: '5px',
                border: 'none',
              backgroundColor: darkMode ? '#4a5568' : '#e2e8f0',
              color: darkMode ? '#e2e8f0' : '#2d3748',
                fontWeight: '500',
              fontSize: '16px',
              minWidth: '180px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none',
              marginRight: '10px'
            }}
          >
            {statusFilters.map((status) => (
              <option key={status} value={status}>
              {status} ({repairs.filter(r => status === "All" || r.repairStatus === status).length})
              </option>
          ))}
          </select>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <FontAwesomeIcon icon={faPlus} /> Add Repair
        </button>
        <button onClick={() => setShowReportOptions(true)} className="btn-report">
          <FontAwesomeIcon icon={faFile} /> Reports
        </button>
          </div>
        {localStorage.getItem('role') === 'admin' && (
          <button
            onClick={handleViewCashierChanges}
            className={`view-history-btn ${darkMode ? 'dark' : ''}`}
          >
            <FontAwesomeIcon icon={faHistory} /> &nbsp; View Changes
          </button>
        )}
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
                <FontAwesomeIcon icon={faFilePdf} style={{marginRight: 8}} /> Pdf
              </button>
            </div>
          </div>
        </div>
      )}







      {error && (<p className="error-message">{error}</p>)}
      {message && <p className="success-message">{message}</p>}
      {loading ? (
  <p className="loading">Loading repairs...</p>
) : filteredRepairs.length === 0 ? (
  <p className="no-repairs">No repair records available.</p>
) : currentStatusFilter === "All" ? (
  statusFilters
    .filter(status => status !== "All")
    .map(status => {
      const repairsByStatus = currentItems.filter(r => r.repairStatus === status);
      const totalrepairsByStatusPages = Math.ceil(repairsByStatus.length / repairsPerPage);
      const paginatedrepairsByStatusForModal = repairsByStatus.slice((repairPage - 1) * repairsPerPage, repairPage * repairsPerPage);
      if (repairsByStatus.length === 0) return null;
      return (
        <div key={status} style={{ marginBottom: '40px' }}>
          
          <h3 style={{ textAlign: "left", color: darkMode ? "#e2e8f0" : "#2d3748", marginBottom: '10px' }}>
            {status} ({repairsByStatus.length})
          </h3>
          <div className="table-responsive">

          <table className={`repair-table ${darkMode ? "dark" : ""}`}>
            <thead>
              <tr>
                <th onClick={() => handleSort('repairInvoice')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Job Number
                  {sortConfig.key === 'repairInvoice' && (
                    <span style={{ marginLeft: '8px' }}>
                      {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('customerName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Customer Name
                  {sortConfig.key === 'customerName' && (
                    <span style={{ marginLeft: '8px' }}>
                      {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('customerPhone')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Mobile
                  {sortConfig.key === 'customerPhone' && (
                    <span style={{ marginLeft: '8px' }}>
                      {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('deviceType')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Device
                  {sortConfig.key === 'deviceType' && (
                    <span style={{ marginLeft: '8px' }}>
                      {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('serialNumber')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  IMEI/Serial No
                  {sortConfig.key === 'serialNumber' && (
                    <span style={{ marginLeft: '8px' }}>
                      {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('issueDescription')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Issue Description
                  {sortConfig.key === 'issueDescription' && (
                    <span style={{ marginLeft: '8px' }}>
                      {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('repairStatus')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Status
                  {sortConfig.key === 'repairStatus' && (
                    <span style={{ marginLeft: '8px' }}>
                      {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                    </span>
                  )}
                </th>
                <th>Action</th>
                <th>Technician Review</th>
              </tr>
            </thead>
            <tbody>
              {paginatedrepairsByStatusForModal.map((repair) => (
                <tr key={repair._id}>
                  <td data-label="Job Number">{repair.repairInvoice || repair.repairCode}</td>
                  <td data-label="Customer Name">{repair.customerName}</td>
                  <td data-label="Mobile">{repair.customerPhone || "N/A"}</td>
                  <td data-label="Device">{repair.deviceType || repair.itemName}</td>
                  <td data-label="IMEI/Serial No">{repair.serialNumber || "N/A"}</td>
                  <td data-label="Issue Description">{repair.issueDescription}</td>
                  <td data-label="Status">{repair.repairStatus}</td>
                  <td data-label="Action">
                  <div className="action-container">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setShowActionMenu(showActionMenu === repair._id ? null : repair._id);
                      }}
                      className="action-dot-btn"
                    >
                      ⋮
                    </button>
                    {showActionMenu === repair._id && (
                      <>
                        <div className="action-menu-overlay" onClick={() => setShowActionMenu(null)} />
                        <div className="action-menu">
                          <button onClick={() => handleView(repair)} className="view-btn">
                            <div className="action-btn-content">
                              <img src={viewicon} alt="view" width="20" height="20" className="p-view-btn-icon" />
                              <span>View</span>
                            </div>
                          </button>
                          {repair.repairStatus !== "Completed" && (
                            <button onClick={() => handleSelectProducts(repair)} className="select-btn">
                              <div className="action-btn-content">
                                <img src={selecticon} alt="select" width="20" height="20" className="p-select-btn-icon" />
                                <span>Select</span>
                              </div>
                            </button>
                          )}
                          <button onClick={() => handleEdit(repair)} className="p-edit-btn">
                            <div className="action-btn-content">
                              <img src={edticon} alt="edit" width="30" height="30" className="p-edit-btn-icon" />
                              <span>Edit</span>
                            </div>
                          </button>
                          <button onClick={() => handleDelete(repair._id)} className="p-delete-btn">
                            <div className="action-btn-content">
                              <img src={deleteicon} alt="delete" width="30" height="30" className="p-delete-btn-icon" />
                              <span>Delete</span>
                            </div>
                          </button>
                          <button onClick={() => generateBill(repair)} className="p-bill-btn">
                            <div className="action-btn-content">
                              <img src={paymenticon} alt="bill" width="30" height="30" className="p-bill-btn-icon" />
                              <span>Bill</span>
                            </div>
                          </button>
                          <button onClick={() => generateJobBill(repair)} className="p-job-bill-btn">
                            <div className="action-btn-content">
                              <img src={jobBillIcon} alt="job bill" width="30" height="30" className="p-job-bill-btn-icon" />
                              <span>Job Bill</span>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
                  <td data-label="Technician Review">
                  <div className="review-container">
                    {localStorage.getItem('role') !== 'admin' && (
                      <span>{repair.technicianReview || 'No review added yet'}</span>
                    )}
                    {localStorage.getItem('role') === 'admin' && (
                      <button
                        onClick={() => handleAddReview(repair)}
                        className={`review-btn ${darkMode ? "dark" : ""}`}
                      >
                        {repair.technicianReview ? "Review" : "Add Review"}
                      </button>
                    )}
                  </div>
                </td>
                 </tr>
              ))}
            </tbody>
          </table>
          </div>
          {/* Pagination controls below the table */}
          {totalrepairsByStatusPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '16px 0', gap: 10 }}>
              <button onClick={() => setRepairPage(p => Math.max(1, p - 1))} disabled={repairPage === 1}>Prev</button>
              <span>Page {repairPage} of {totalrepairsByStatusPages}</span>
              <button onClick={() => setRepairPage(p => Math.min(totalrepairsByStatusPages, p + 1))} disabled={repairPage === totalrepairsByStatusPages}>Next</button>
            </div>
          )}
        </div>
      );
    })
) : (
  <div className="table-responsive">

  <table className={`repair-table ${darkMode ? "dark" : ""}`}>
    <thead>
      <tr>
        <th onClick={() => handleSort('repairInvoice')} style={{ cursor: 'pointer', userSelect: 'none' }}>
          Job Number
          {sortConfig.key === 'repairInvoice' && (
            <span style={{ marginLeft: '8px' }}>
              {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
            </span>
          )}
        </th>
        <th onClick={() => handleSort('customerName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Customer Name
                  {sortConfig.key === 'customerName' && (
                    <span style={{ marginLeft: '8px' }}>
                      {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
                    </span>
                  )}
                </th>
        <th onClick={() => handleSort('customerPhone')} style={{ cursor: 'pointer', userSelect: 'none' }}>
          Mobile
          {sortConfig.key === 'customerPhone' && (
            <span style={{ marginLeft: '8px' }}>
              {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
            </span>
          )}
        </th>
        <th onClick={() => handleSort('deviceType')} style={{ cursor: 'pointer', userSelect: 'none' }}>
          Device
          {sortConfig.key === 'deviceType' && (
            <span style={{ marginLeft: '8px' }}>
              {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
            </span>
          )}
        </th>
        <th onClick={() => handleSort('serialNumber')} style={{ cursor: 'pointer', userSelect: 'none' }}>
          IMEI/Serial No
          {sortConfig.key === 'serialNumber' && (
            <span style={{ marginLeft: '8px' }}>
              {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
            </span>
          )}
        </th>
        <th onClick={() => handleSort('issueDescription')} style={{ cursor: 'pointer', userSelect: 'none' }}>
          Issue Description
          {sortConfig.key === 'issueDescription' && (
            <span style={{ marginLeft: '8px' }}>
              {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
            </span>
          )}
        </th>
        <th onClick={() => handleSort('repairStatus')} style={{ cursor: 'pointer', userSelect: 'none' }}>
          Status
          {sortConfig.key === 'repairStatus' && (
            <span style={{ marginLeft: '8px' }}>
              {sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽'}
            </span>
          )}
        </th>
        <th>Action</th>
        <th>Technician Review</th>
      </tr>
    </thead>
    <tbody>
      {paginatedRepairsForModal.map((repair) => (
        <tr key={repair._id}>
          <td data-label="Job Number">{repair.repairInvoice || repair.repairCode}</td>
          <td data-label="Customer Name">{repair.customerName}</td>
          <td data-label="Mobile">{repair.customerPhone || "N/A"}</td>
          <td data-label="Device">{repair.deviceType || repair.itemName}</td>
          <td data-label="IMEI/Serial No">{repair.serialNumber || "N/A"}</td>
          <td data-label="Issue Description">{repair.issueDescription}</td>
          <td data-label="Status">{repair.repairStatus}</td>
          <td data-label="Action">
                  <div className="action-container">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setShowActionMenu(showActionMenu === repair._id ? null : repair._id);
                      }}
                      className="action-dot-btn"
                    >
                      ⋮
                    </button>
                    {showActionMenu === repair._id && (
                      <>
                        <div className="action-menu-overlay" onClick={() => setShowActionMenu(null)} />
                        <div className="action-menu">
                          <button onClick={() => handleView(repair)} className="view-btn">
                            <div className="action-btn-content">
                              <img src={viewicon} alt="view" width="20" height="20" className="p-view-btn-icon" />
                              <span>View</span>
                            </div>
                          </button>
                          {repair.repairStatus !== "Completed" && (
                            <button onClick={() => handleSelectProducts(repair)} className="select-btn">
                              <div className="action-btn-content">
                                <img src={selecticon} alt="select" width="20" height="20" className="p-select-btn-icon" />
                                <span>Select</span>
                              </div>
                            </button>
                          )}
                          <button onClick={() => handleEdit(repair)} className="p-edit-btn">
                            <div className="action-btn-content">
                              <img src={edticon} alt="edit" width="30" height="30" className="p-edit-btn-icon" />
                              <span>Edit</span>
                            </div>
                          </button>
                          <button onClick={() => handleDelete(repair._id)} className="p-delete-btn">
                            <div className="action-btn-content">
                              <img src={deleteicon} alt="delete" width="30" height="30" className="p-delete-btn-icon" />
                              <span>Delete</span>
                            </div>
                          </button>
                          <button onClick={() => generateBill(repair)} className="p-bill-btn">
                            <div className="action-btn-content">
                              <img src={paymenticon} alt="bill" width="30" height="30" className="p-bill-btn-icon" />
                              <span>Bill</span>
                            </div>
                          </button>
                          <button onClick={() => generateJobBill(repair)} className="p-job-bill-btn">
                            <div className="action-btn-content">
                              <img src={jobBillIcon} alt="job bill" width="30" height="30" className="p-job-bill-btn-icon" />
                              <span>Job Bill</span>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
          <td data-label="Technician Review">
                  <div className="review-container">
                    {localStorage.getItem('role') !== 'admin' && (
                      <span>{repair.technicianReview || 'No review added yet'}</span>
                    )}
                    {localStorage.getItem('role') === 'admin' && (
                      <button
                        onClick={() => handleAddReview(repair)}
                        className={`review-btn ${darkMode ? "dark" : ""}`}
                      >
                        {repair.technicianReview ? "Review" : "Add Review"}
                      </button>
                    )}
                  </div>
                </td>
         </tr>
      ))}
    </tbody>
  </table>
  {/* Pagination controls below the table */}
  {totalRepairPages > 1 && (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '16px 0', gap: 10 }}>
      <button onClick={() => setRepairPage(p => Math.max(1, p - 1))} disabled={repairPage === 1}>Prev</button>
      <span>Page {repairPage} of {totalRepairPages}</span>
      <button onClick={() => setRepairPage(p => Math.min(totalRepairPages, p + 1))} disabled={repairPage === totalRepairPages}>Next</button>
    </div>
  )}
  </div>
)}

      {showEditModal && selectedRepair && (
        <EditProductRepair
          repair={selectedRepair}
          closeModal={() => {
            setShowEditModal(false);
            fetchRepairs();
          }}
          darkMode={darkMode}
        />
      )}

      {showViewModal && selectedRepair && (
        <div className="view-modal-select">
          <div className="modal-content-select">
            <div style={{
              textAlign: "center",
              marginBottom: "20px",
              backgroundColor: darkMode ? "#444" : "#f8f9fa",
              padding: "15px",
              borderRadius: "5px"
            }}>
              <h2 style={{
                margin: 0,
                fontSize: "24px",
                color: darkMode ? "#fff" : "#333",
                fontWeight: "bold"
              }}>
                Product Repair Details
              </h2>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "15px",
              marginBottom: "20px"
            }}>
              <div style={{ backgroundColor: darkMode ? "#555" : "#fff", padding: "10px", borderRadius: "5px", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}>
                <strong style={{ color: darkMode ? "#ddd" : "#555", display: "block", marginBottom: "5px" }}>Customer Name:</strong>
                <span style={{ color: darkMode ? "#fff" : "#333" }}>{selectedRepair.customerName}</span>
              </div>
              <div style={{ backgroundColor: darkMode ? "#555" : "#fff", padding: "10px", borderRadius: "5px", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}>
                <strong style={{ color: darkMode ? "#ddd" : "#555", display: "block", marginBottom: "5px" }}>Customer Phone:</strong>
                <span style={{ color: darkMode ? "#fff" : "#333" }}>{selectedRepair.customerPhone}</span>
              </div>
              <div style={{ backgroundColor: darkMode ? "#555" : "#fff", padding: "10px", borderRadius: "5px", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}>
                <strong style={{ color: darkMode ? "#ddd" : "#555", display: "block", marginBottom: "5px" }}>Device:</strong>
                <span style={{ color: darkMode ? "#fff" : "#333" }}>{selectedRepair.deviceType || selectedRepair.itemName}</span>
              </div>
              <div style={{ backgroundColor: darkMode ? "#555" : "#fff", padding: "10px", borderRadius: "5px", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}>
                <strong style={{ color: darkMode ? "#ddd" : "#555", display: "block", marginBottom: "5px" }}>Issue Description:</strong>
                <span style={{ color: darkMode ? "#fff" : "#333" }}>{selectedRepair.issueDescription}</span>
              </div>

              <div style={{ backgroundColor: darkMode ? "#555" : "#fff", padding: "10px", borderRadius: "5px", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}>
                <strong style={{ color: darkMode ? "#ddd" : "#555", display: "block", marginBottom: "5px" }}>Repair Status:</strong>
                <select
                  value={selectedRepair.repairStatus}
                  onChange={async (e) => {
                    try {
                      const newStatus = e.target.value;
                      setLoading(true);
                      setError("");

                      // Log the update attempt

                      // console.log("Attempting to update repair status:", {
                      //   repairId: selectedRepair._id,
                      //   newStatus: newStatus,
                      //   currentStatus: selectedRepair.repairStatus
                      // });

                      handleStatusUpdate(newStatus);
                    } catch (err) {
                      console.error("Error updating repair status:", err);
                      setError(err.message || "Failed to update repair status");
                      // Revert the select value to the previous status
                      setSelectedRepair(prevRepair => ({
                        ...prevRepair,
                        repairStatus: prevRepair.repairStatus
                      }));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  style={{
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    backgroundColor: darkMode ? "#444" : "#fff",
                    color: darkMode ? "#fff" : "#333",
                    width: "100%",
                    marginTop: "5px",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                {loading && (
                  <div style={{
                    marginTop: "5px",
                    color: darkMode ? "#63b3ed" : "#3182ce",
                    fontSize: "14px",
                    textAlign: "center"
                  }}>
                    Updating status...
                  </div>
                )}
                {error && (
                  <div style={{
                    marginTop: "5px",
                    color: "#e53e3e",
                    fontSize: "14px",
                    textAlign: "center"
                  }}>
                    {error}
                  </div>
                )}
              </div>
              <div style={{ backgroundColor: darkMode ? "#555" : "#fff", padding: "10px", borderRadius: "5px", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}>
                <strong style={{ color: darkMode ? "#ddd" : "#555", display: "block", marginBottom: "5px" }}>Assigned To:</strong>
                <select
                  value={selectedRepair.assignedTo || ""} // assuming you store the value in `assignedTo`
                  onChange={async (e) => {
                    const newValue = e.target.value;
                    setLoading(true);
                    setError("");
                    try {
                      // Update the backend
                      const response = await fetch(`${API_URL}/${selectedRepair._id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ assignedTo: newValue }),
                      });

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || "Failed to update assignment");
                      }

                      const updatedRepair = await response.json();

                      // Update local state
                      setRepairs(prevRepairs =>
                        prevRepairs.map(r => (r._id === updatedRepair._id ? updatedRepair : r))
                      );
                      setSelectedRepair(updatedRepair);

                      setMessage("Assignment updated successfully!");
                    } catch (err) {
                      console.error("Error updating assignment:", err);
                      setError(err.message);
                      // Optional: revert selection on error
                      setSelectedRepair(prev => ({ ...prev, assignedTo: prev.assignedTo }));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  style={{
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    backgroundColor: darkMode ? "#444" : "#fff",
                    color: darkMode ? "#fff" : "#333",
                    width: "100%",
                    marginTop: "5px",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  <option value="" disabled>Select Person/Team</option>
                  <option value="Prabath">Prabath</option>
                  <option value="Nadeesh">Nadeesh</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Genex-EX">Genex EX</option>
                  <option value="I-Device">I Device</option>
                </select>

                {loading && (
                  <div style={{
                    marginTop: "5px",
                    color: darkMode ? "#63b3ed" : "#3182ce",
                    fontSize: "14px",
                    textAlign: "center"
                  }}>
                    Updating assignment...
                  </div>
                )}

                {error && (
                  <div style={{
                    marginTop: "5px",
                    color: "#e53e3e",
                    fontSize: "14px",
                    textAlign: "center"
                  }}>
                    {error}
                  </div>
                )}
              </div>
              <div style={{ backgroundColor: darkMode ? "#555" : "#fff", padding: "10px", borderRadius: "5px", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}>
                <strong style={{ color: darkMode ? "#ddd" : "#555", display: "block", marginBottom: "5px" }}>Payment Method:</strong>
                <select
                  value={selectedRepair.paymentMethod || ""}
                  onChange={async (e) => {
                    const newValue = e.target.value;
                    setLoading(true);
                    setError("");
                    try {
                      const response = await fetch(`${API_URL}/${selectedRepair._id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ paymentMethod: newValue }),
                      });
                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || "Failed to update payment method");
                      }
                      const updatedRepair = await response.json();
                      // Update local state
                      setRepairs(prevRepairs =>
                        prevRepairs.map(r => (r._id === updatedRepair._id ? updatedRepair : r))
                      );
                      setSelectedRepair(updatedRepair);
                      setMessage("Payment method updated successfully!");
                    } catch (err) {
                      console.error("Error updating payment method:", err);
                      setError(err.message);
                      // Optional: revert on error
                      setSelectedRepair(prev => ({ ...prev, paymentMethod: prev.paymentMethod }));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  style={{
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    backgroundColor: darkMode ? "#444" : "#fff",
                    color: darkMode ? "#fff" : "#333",
                    width: "100%",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  <option value="">Select Payment Method</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank-Transfer">Bank Transfer</option>
                  <option value="Bank-Check">Bank Check</option>
                  <option value="Credit">Credit</option>
                </select>
                {loading && (
                  <div style={{
                    marginTop: "5px",
                    color: darkMode ? "#63b3ed" : "#3182ce",
                    fontSize: "14px",
                    textAlign: "center"
                  }}>
                    Updating...
                  </div>
                )}
                {error && (
                  <div style={{
                    marginTop: "5px",
                    color: "#e53e3e",
                    fontSize: "14px",
                    textAlign: "center"
                  }}>
                    {error}
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{
                fontSize: "18px",
                color: darkMode ? "#ddd" : "#ddd",
                marginBottom: "10px",
                borderBottom: `2px solid ${darkMode ? "#666" : "#ddd"}`,
                paddingBottom: "5px"
              }}>
                Repair Cart
              </h3>
              {selectedRepair && selectedRepair.repairCart && Array.isArray(selectedRepair.repairCart) && selectedRepair.repairCart.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: darkMode ? "#444" : "#fff" }}>
                  <thead>
                    <tr style={{
                      backgroundColor: darkMode ? "#555" : "#f2f2f2",
                      color: darkMode ? "#fff" : "#333"
                    }}>
                      <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left", fontWeight: "bold" }}>Item Name</th>
                      <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left", fontWeight: "bold" }}>Assigned To</th>
                      <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left", fontWeight: "bold" }}>Qty</th>
                      <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left", fontWeight: "bold" }}>Selling Price</th>
                      <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left", fontWeight: "bold" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRepair.repairCart.map((item, index) => (
                      <tr key={index} style={{ backgroundColor: index % 2 === 0 ? (darkMode ? "#4a4a4a" : "#fafafa") : (darkMode ? "#444" : "#fff") }}>
                        <td style={{ border: "1px solid #ddd", padding: "10px", color: darkMode ? "#fff" : "#333" }}>{item.itemName} - {item.category}</td>
                        <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                          <select
                            value={item.assignedTo || ""}
                            onChange={async (e) => await handleAssignItem(item.itemCode, e.target.value)}
                            style={{
                              width: "100%",
                              padding: "6px",
                              borderRadius: "4px",
                              border: "1px solid #ccc",
                              backgroundColor: darkMode ? "#555" : "white",
                              color: darkMode ? "white" : "black"
                            }}
                          >
                            <option value="" disabled>Select Person/Team</option>
                            <option value="Prabath">Prabath</option>
                            <option value="Nadeesh">Nadeesh</option>
                            <option value="Accessories">Accessories</option>
                            <option value="Genex-EX">Genex EX</option>
                            <option value="I-Device">I Device</option>
                          </select>
                        </td>
                        <td style={{ border: "1px solid #ddd", padding: "10px", color: darkMode ? "#fff" : "#333" }}>{item.quantity}</td>
                        <td style={{ border: "1px solid #ddd", padding: "10px", color: darkMode ? "#fff" : "#333" }}>
                          {selectedRepair.repairStatus !== "Completed" ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={item.sellingPrice || 0}
                              onBlur={(e) => {
                                const newValue = parseFloat(e.target.value);
                                if (isNaN(newValue) || newValue === item.sellingPrice) return; // No change or invalid
                                handleSaveSellingPrice(item.itemCode, newValue);
                              }}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  const newValue = parseFloat(e.target.value);
                                  if (isNaN(newValue)) return;
                                  handleSaveSellingPrice(item.itemCode, newValue);
                                }
                              }}
                              style={{
                                width: "90px",
                                padding: "4px",
                                borderRadius: "4px",
                                border: "1px solid #aaa",
                                fontSize: "14px",
                                textAlign: "center",
                                backgroundColor: darkMode ? "#444" : "#fff",
                                color: darkMode ? "#fff" : "#333",
                              }}
                              disabled={loading}
                              placeholder="Price"
                            />
                          ) : (
                            <span>Rs. {item.sellingPrice?.toFixed(2) || "0.00"}</span>
                          )}
                        </td>
                        <td style={{ border: "1px solid #ddd", padding: "10px", color: darkMode ? "#fff" : "#333" }}>
                          {selectedRepair.repairStatus !== "Completed" && (
                            <button
                              onClick={() => handleDecreaseCartQuantity(index)}
                              className="quantity-btn"
                              disabled={loading}
                              title="Decrease quantity"
                              style={{
                                backgroundColor: "#e74c3c",
                                color: "white",
                                border: "none",
                                padding: "5px 10px",
                                borderRadius: "3px",
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.7 : 1,
                                marginRight: "5px"
                              }}
                            >
                              -
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: darkMode ? "#ccc" : "#666", fontStyle: "italic" }}>No items in cart.</p>
              )}            
            </div>

            {/* ✅ NEW: Description Field After Cart */}
            {selectedRepair.repairStatus !== "Completed" ? (
              <div style={{ marginTop: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    color: darkMode ? "#ccc" : "#555",
                    fontSize: "14px",
                  }}
                >
                  Cart Description (Optional):
                </label>
                <textarea
                  value={selectedRepair.cartDescription || ""}
                  onChange={async (e) => {
                    const newDesc = e.target.value;
                    const updatedRepair = { ...selectedRepair, cartDescription: newDesc };

                    // Update UI immediately (optimistic update)
                    setSelectedRepair(updatedRepair);
                    setRepairs(repairs.map(r => (r._id === updatedRepair._id ? updatedRepair : r)));

                    try {
                      // setLoading(true);
                      await fetch(`${API_URL}/${selectedRepair._id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ cartDescription: newDesc }),
                      });
                      // setMessage("Cart description updated successfully.");
                    } catch (err) {
                      console.error("Error saving cart description:", err);
                      setError("Failed to save description.");
                      // Optionally revert on error
                      setSelectedRepair(selectedRepair);
                      setRepairs(repairs.map(r => (r._id === selectedRepair._id ? selectedRepair : r)));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  placeholder="Add a note about this repair cart..."
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    backgroundColor: darkMode ? "#444" : "#fff",
                    color: darkMode ? "#fff" : "#333",
                    fontSize: "14px",
                    minHeight: "60px",
                    resize: "vertical",
                  }}
                />
              </div>
            ) : (
              selectedRepair.cartDescription && (
                <div style={{ marginTop: "15px", padding: "10px", backgroundColor: darkMode ? "#444" : "#f9f9f9", borderRadius: "4px" }}>
                  <strong style={{ color: darkMode ? "#ccc" : "#555" }}>Cart Description:</strong>
                  <p style={{ margin: "5px 0 0 0", color: darkMode ? "#fff" : "#333" }}>{selectedRepair.cartDescription}</p>
                </div>
              )
            )}

            <div style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              borderTop: `1px solid ${darkMode ? "#666" : "#ddd"}`
            }}>
              <p style={{ margin: 0, fontWeight: "bold", color: darkMode ? "#ddd" : "#ddd" }}>
                Cart Total: <span style={{ color: darkMode ? "#fff" : "#fff" }}>Rs. {calculateCartTotal(selectedRepair.repairCart)}</span>
              </p>
              <p style={{ margin: 0, fontWeight: "bold", color: darkMode ? "#ddd" : "#ddd" }}>
                Total Repair Cost: <span style={{ color: darkMode ? "#fff" : "#fff" }}>Rs. {(selectedRepair.totalRepairCost || 0).toFixed(2)}</span>
              </p>
            </div>
            {selectedRepair.repairStatus !== "Completed" && (
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{
                  fontSize: "18px",
                  color: darkMode ? "#ddd" : "#555",
                  marginBottom: "10px",
                  borderBottom: `2px solid ${darkMode ? "#666" : "#ddd"}`,
                  paddingBottom: "5px"
                }}>
                  Services & Discounts
                </h3>

                {/* Services List */}
                {selectedRepair && selectedRepair.services && Array.isArray(selectedRepair.services) && selectedRepair.services.length > 0 ? (
                  <div style={{ marginBottom: "15px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: darkMode ? "#444" : "#fff" }}>
                      <thead>
                        <tr style={{
                          backgroundColor: darkMode ? "#555" : "#f2f2f2",
                          color: darkMode ? "#fff" : "#333"
                        }}>
                          <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left", fontWeight: "bold" }}>Service Name</th>
                          <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left", fontWeight: "bold" }}>Discount Amount</th>
                          <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left", fontWeight: "bold" }}>Description</th>
                          <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left", fontWeight: "bold" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRepair.services.map((service, index) => (
                          <tr key={index} style={{ backgroundColor: index % 2 === 0 ? (darkMode ? "#4a4a4a" : "#fafafa") : (darkMode ? "#444" : "#fff") }}>
                            <td style={{ border: "1px solid #ddd", padding: "10px", color: darkMode ? "#fff" : "#333" }}>{service.serviceName}</td>
                            <td style={{ border: "1px solid #ddd", padding: "10px", color: darkMode ? "#fff" : "#333" }}>Rs. {service.discountAmount}</td>
                            <td style={{ border: "1px solid #ddd", padding: "10px", color: darkMode ? "#fff" : "#333" }}>{service.description || "N/A"}</td>
                            <td style={{ border: "1px solid #ddd", padding: "10px", color: darkMode ? "#fff" : "#333" }}>
                              <button
                                onClick={() => handleRemoveService(index)}  // ✅ Add this line
                                style={{
                                  backgroundColor: "rgb(231, 76, 60)",
                                  color: "white",
                                  border: "none",
                                  padding: "5px 10px",
                                  borderRadius: "3px",
                                  cursor: "pointer"
                                }}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: darkMode ? "#ccc" : "#666", fontStyle: "italic", marginBottom: "15px" }}>No services or discounts added yet.</p>
                )}

                {/* Add New Service Form */}
                <div style={{
                  backgroundColor: darkMode ? "#333" : "#f9f9f9",
                  padding: "15px",
                  borderRadius: "5px",
                  marginBottom: "15px"
                }}>
                  <h4 style={{
                    margin: "0 0 10px 0",
                    color: darkMode ? "#ddd" : "#333",
                    fontSize: "16px"
                  }}>
                    Add New Discount
                  </h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-end" }}>
                    <div style={{ flex: "1 1 200px" }}>
                      <label style={{
                        display: "block",
                        marginBottom: "5px",
                        color: darkMode ? "#ccc" : "#555",
                        fontSize: "14px"
                      }}>
                        Service Name:
                      </label>
                      <input
                        type="text"
                        name="serviceName"
                        value={newService.serviceName}
                        onChange={handleNewServiceChange}
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                          backgroundColor: darkMode ? "#444" : "#fff",
                          color: darkMode ? "#fff" : "#333"
                        }}
                        placeholder="e.g., Screen Repair"
                      />
                    </div>
                    <div style={{ flex: "1 1 200px" }}>
                      <label style={{
                        display: "block",
                        marginBottom: "5px",
                        color: darkMode ? "#ccc" : "#555",
                        fontSize: "14px"
                      }}>
                        Discount Amount (Rs.):
                      </label>
                      <input
                        type="number"
                        name="discountAmount"
                        min="0"
                        value={newService.discountAmount}
                        onChange={handleNewServiceChange}
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                          backgroundColor: darkMode ? "#444" : "#fff",
                          color: darkMode ? "#fff" : "#333"
                        }}
                      />
                    </div>
                    <div style={{ flex: "1 1 500px" }}>
                      <label style={{
                        display: "block",
                        marginBottom: "5px",
                        color: darkMode ? "#ccc" : "#555",
                        fontSize: "14px"
                      }}>
                        Description (Optional):
                      </label>
                      <input
                        type="text"
                        name="description"
                        value={newService.description}
                        onChange={handleNewServiceChange}
                        style={{
                          width: "68%",
                          padding: "8px",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                          backgroundColor: darkMode ? "#444" : "#fff",
                          color: darkMode ? "#fff" : "#333"
                        }}
                        placeholder="e.g., Special discount for loyal customer"
                      />
                      <button
                        onClick={handleAddService}
                        style={{
                          backgroundColor: "#3498db",
                          color: "white",
                          border: "none",
                          padding: "8px 15px",
                          marginLeft: "15px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          height: "36px"
                        }}
                      >
                        Add Discount
                      </button>
                    </div>
                    
                  </div>
                </div>

                {/* Legacy Discount (kept for backward compatibility)
                <div style={{
                  backgroundColor: darkMode ? "#333" : "#f9f9f9",
                  padding: "15px",
                  borderRadius: "5px"
                }}>
                  <h4 style={{
                    margin: "0 0 10px 0",
                    color: darkMode ? "#ddd" : "#333",
                    fontSize: "16px"
                  }}> */}
                    {/* Quick Discount
                  </h4>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <label style={{ color: darkMode ? "#ddd" : "#555" }}>
                      Amount (Rs.):
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className={`product-repair-list-input ${darkMode ? "dark" : ""}`}
                      style={{
                        width: "100px",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                        backgroundColor: darkMode ? "#444" : "#fff",
                        color: darkMode ? "#fff" : "#333"
                      }}
                    />
                    <button
                      onClick={handleApplyDiscount}
                      style={{
                        backgroundColor: "#f39c12",
                        color: "white",
                        border: "none",
                        padding: "8px 15px",
                        borderRadius: "4px",
                        cursor: "pointer"
                      }}
                    >
                      Apply Quick Discount
                    </button>
                  </div>
                </div>
              </div>
            )} */}

             </div>
            )}

            {/* Additional Services Section - Always visible, even for completed repairs */}
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{
                fontSize: "18px",
                color: darkMode ? "#ddd" : "#555",
                marginBottom: "10px",
                borderBottom: `2px solid ${darkMode ? "#666" : "#ddd"}`,
                paddingBottom: "5px"
              }}>
                Additional Services
              </h3>

              {/* Additional Services List */}
              {additionalServices.length > 0 ? (
                <div style={{ marginBottom: "15px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: darkMode ? "#444" : "#fff" }}>
                    <thead>
                      <tr style={{
                        backgroundColor: darkMode ? "#555" : "#f2f2f2",
                        color: darkMode ? "#fff" : "#333"
                      }}>
                        <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left", fontWeight: "bold" }}>Service Name</th>
                        <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left", fontWeight: "bold" }}>Amount</th>
                        <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left", fontWeight: "bold" }}>Description</th>
                        <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left", fontWeight: "bold" }}>Status</th>
                        <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left", fontWeight: "bold" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {additionalServices.map((service, index) => (
                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? (darkMode ? "#4a4a4a" : "#fafafa") : (darkMode ? "#444" : "#fff") }}>
                          <td style={{ border: "1px solid #ddd", padding: "10px", color: darkMode ? "#fff" : "#333" }}>{service.serviceName}</td>
                          <td style={{ border: "1px solid #ddd", padding: "10px", color: darkMode ? "#fff" : "#333" }}>Rs. {service.serviceAmount}</td>
                          <td style={{ border: "1px solid #ddd", padding: "10px", color: darkMode ? "#fff" : "#333" }}>{service.description || "N/A"}</td>
                          <td style={{
                            border: "1px solid #ddd",
                            padding: "10px",
                            color: service.isPaid ? "#28a745" : "#dc3545",
                            fontWeight: "bold"
                          }}>
                            {service.isPaid ? "PAID" : "UNPAID"}
                          </td>
                          <td style={{ border: "1px solid #ddd", padding: "10px", color: darkMode ? "#fff" : "#333" }}>
                            {!service.isPaid && (
                              <button
                                onClick={() => handlePayAdditionalService(index)}
                                style={{
                                  backgroundColor: "#28a745",
                                  color: "white",
                                  border: "none",
                                  padding: "5px 10px",
                                  borderRadius: "3px",
                                  cursor: "pointer"
                                }}
                              >
                                Mark as Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: darkMode ? "#333" : "#e9e9e9" }}>
                        <td colSpan="4" style={{ border: "1px solid #ddd", padding: "10px", textAlign: "right", fontWeight: "bold", color: darkMode ? "#fff" : "#333" }}>
                          Total Additional Services:
                        </td>
                        <td style={{ border: "1px solid #ddd", padding: "10px", fontWeight: "bold", color: darkMode ? "#fff" : "#333" }}>
  Rs. {additionalServices.reduce((total, service) => total + (service.isPaid ? 0 : Math.max(0, parseFloat(service.serviceAmount || 0))), 0).toFixed(2)}
</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p style={{ color: darkMode ? "#ccc" : "#666", fontStyle: "italic", marginBottom: "15px" }}>No additional services added yet.</p>
              )}

              {/* Add New Additional Service Form */}
              <div style={{
                backgroundColor: darkMode ? "#333" : "#f9f9f9",
                padding: "15px",
                borderRadius: "5px",
                marginBottom: "15px"
              }}>
                <h4 style={{
                  margin: "0 0 10px 0",
                  color: darkMode ? "#ddd" : "#333",
                  fontSize: "16px"
                }}>
                  Add New Additional Service
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-end" }}>
                  <div style={{ flex: "1 1 200px" }}>
                    <label style={{
                      display: "block",
                      marginBottom: "5px",
                      color: darkMode ? "#ccc" : "#555",
                      fontSize: "14px"
                    }}>
                      Service Name:
                    </label>
                    <input
                      type="text"
                      name="serviceName"
                      value={newAdditionalService.serviceName}
                      onChange={handleNewAdditionalServiceChange}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                        backgroundColor: darkMode ? "#444" : "#fff",
                        color: darkMode ? "#fff" : "#333"
                      }}
                      placeholder="e.g., Screen Protector"
                    />
                  </div>
                  <div style={{ flex: "1 1 150px" }}>
                    <label style={{
                      display: "block",
                      marginBottom: "5px",
                      color: darkMode ? "#ccc" : "#555",
                      fontSize: "14px"
                    }}>
                      Service Amount (Rs.):
                    </label>
                    <input
                      type="number"
                      name="serviceAmount"
                      min="0"
                      value={newAdditionalService.serviceAmount}
                      onChange={handleNewAdditionalServiceChange}
                      style={{
                        width: "80%",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                        backgroundColor: darkMode ? "#444" : "#fff",
                        color: darkMode ? "#fff" : "#333"
                      }}
                    />
                  </div>
                  <div style={{ flex: "1 1 500px" }}>
                    <label style={{
                      display: "block",
                      marginBottom: "5px",
                      color: darkMode ? "#ccc" : "#555",
                      fontSize: "14px"
                    }}>
                      Description (Optional):
                    </label>
                    <input
                      type="text"
                      name="description"
                      value={newAdditionalService.description}
                      onChange={handleNewAdditionalServiceChange}
                      style={{
                        width: "70%",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                        backgroundColor: darkMode ? "#444" : "#fff",
                        color: darkMode ? "#fff" : "#333"
                      }}
                      placeholder="e.g., Premium tempered glass"
                    />
                    <button
                      onClick={handleAddAdditionalService}
                      style={{
                        backgroundColor: "#3498db",
                        color: "white",
                        border: "none",
                        marginLeft: "15px",
                        padding: "8px 15px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        height: "36px"
                      }}
                    >
                      Add Service
                    </button>
                  </div>
                </div>
              </div>

              {/* Final Amount Display */}
              {(selectedRepair.totalRepairCost > 0 || additionalServices.length > 0) && (
                <div style={{
                  backgroundColor: darkMode ? "#2c5282" : "#e6f7ff",
                  padding: "15px",
                  borderRadius: "5px",
                  marginBottom: "15px",
                  textAlign: "right"
                }}>


<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{
                      fontWeight: "bold",
                      fontSize: "16px",
                      color: darkMode ? "#fff" : "#333"
                    }}>
                      Total Repair Cost:
                    </span>
                    <span style={{
                      fontWeight: "bold",
                      fontSize: "16px",
                      color: darkMode ? "#fff" : "#333"
                    }}>
                      Rs. {(selectedRepair.totalRepairCost || 0).toFixed(2)}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{
                      fontWeight: "bold",
                      fontSize: "16px",
                      color: darkMode ? "#fff" : "#333"
                    }}>
  Final Amount:
  </span>
                    <span style={{
                      fontWeight: "bold",
                      fontSize: "16px",
                      color: darkMode ? "#fff" : "#333"
                    }}>
Rs. {((selectedRepair.totalRepairCost || 0) +
  (selectedRepair.additionalServices ? selectedRepair.additionalServices.reduce((total, service) => total + Math.max(0, parseFloat(service.serviceAmount || 0)), 0) : 0)
).toFixed(2)}                    </span>
                  </div>

                  {additionalServices.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                      <span style={{
                        fontWeight: "bold",
                        fontSize: "16px",
                        color: darkMode ? "#fff" : "#333"
                      }}>
                        Total Additional Services to Paid:
                      </span>
                      <span style={{
                        fontWeight: "bold",
                        fontSize: "16px",
                        color: darkMode ? "#fff" : "#333"
                      }}>
Rs. {additionalServices.reduce((total, service) => total + (service.isPaid ? 0 : Math.max(0, parseFloat(service.serviceAmount || 0))), 0).toFixed(2)}                      </span>
                    </div>
                  )}

                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "10px",
                    borderTop: `2px solid ${darkMode ? "#4a5568" : "#b3e0ff"}`,
                    paddingTop: "10px"
                  }}>
<span style={{
  fontWeight: "bold",
  fontSize: "18px",
  color: darkMode ? "#63b3ed" : "#0366d6"
}}>
  AMOUNT TO PAID:
</span>
<span style={{
  fontWeight: "bold",
  fontSize: "18px",
  color: darkMode ? "#63b3ed" : "#0366d6"
}}>
  Rs. {((selectedRepair.repairStatus === "Completed")
    ? additionalServices.reduce((total, service) => total + (service.isPaid ? 0 : Math.max(0, parseFloat(service.serviceAmount || 0))), 0)
    : (selectedRepair.totalRepairCost || 0) +
      additionalServices.reduce((total, service) => total + (service.isPaid ? 0 : Math.max(0, parseFloat(service.serviceAmount || 0))), 0)
  ).toFixed(2)}
</span>
</div>
                </div>
              )}
            </div>

            <div className="modal-buttons" style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
              {selectedRepair.repairStatus !== "Completed" && (
                <button
                  onClick={handleCompletePayment}
                  className={`a-p-submit-btn ${darkMode ? "dark" : ""}`}
                >
                  Complete Payment
                </button>
              )}
              <button
                onClick={() => setShowViewModal(false)}
                className="a-p-cancel-btn"
              >
                Close
              </button>
            </div>

            {/* Add Change History section for admin users */}
            {/* {localStorage.getItem('role') === 'admin' && selectedRepair && selectedRepair.changeHistory && (
              <div style={{ marginTop: '20px' }}>
                {selectedRepair.isHistoryView ? (
                  // Cashier changes view
                  <div className={`change-history-container ${darkMode ? 'dark' : ''}`}>
                    <h3 className="change-history-title">Cashier Changes</h3>
                    <div className="change-history-list">
                      {Object.entries(selectedRepair.changeHistory).map(([cashier, changes]) => (
                        <div key={cashier} className="cashier-section">
                          <h4 className="cashier-name">{cashier}</h4>
                          <div className="cashier-changes">
                            {changes.map((change, index) => (
                              <div key={index} className="change-history-item">
                                <div className="change-header">
                                  <span className="change-date">{change.timestamp}</span>
                                  <span className={`change-type ${change.changeType}`}>
                                    {change.changeType.toUpperCase()}
                                  </span>
                                </div>
                                <div className="change-details">
                                  <div className="change-field">
                                    <strong>Changed:</strong> {change.field}
                                  </div>
                                  <div className="change-values">
                                    <div className="old-value">
                                      <strong>From:</strong> {typeof change.oldValue === 'object' ? JSON.stringify(change.oldValue) : change.oldValue || 'N/A'}
                                    </div>
                                    <div className="new-value">
                                      <strong>To:</strong> {typeof change.newValue === 'object' ? JSON.stringify(change.newValue) : change.newValue || 'N/A'}
                                    </div>
                                  </div>
                                  <div className="repair-info">
                                    <strong>Repair:</strong> {change.repairInvoice} - {change.customerName}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Individual repair history
                  <ChangeHistory
                    changes={selectedRepair.changeHistory}
                    darkMode={darkMode}
                  />
                )}
              </div>
            )} */}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddProductRepair
          closeModal={() => setShowAddModal(false)}
          onAddSuccess={fetchRepairs}
          darkMode={darkMode}
        />
      )}

      {showSelectModal && selectedRepair && (
        <div className="view-modal-select">
          <div className="modal-content-select">
            <div style={{ textAlign: "center", fontWeight: "bold" }}>
              Select Products for Repair
            </div>
            <hr />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <input
                type="text"
                placeholder="🔍 Search Products"
                value={productSearchQuery}
                onChange={(e) => {
                  setProductSearchQuery(e.target.value);
                  setProductPage(1);
                }}
                className={`product-repair-list-search-bar ${darkMode ? "dark" : ""}`}
                style={{ flex: 1, marginRight: 8 }}
              />
              {/* <button onClick={handleClearAllProducts} className="btn-primary" style={{ background: '#ffc107', color: '#000', minWidth: 90 }}>Clear All</button> */}
            </div>
            {loading ? (
              <p className="loading">Loading products...</p>
            ) : filteredProductsForModal.length === 0 ? (
              <p className="loading">Products Not Found..  </p>
            ) : (
            <table className={`repair-table ${darkMode ? "dark" : ""}`}> 
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProductsForModal.map((product) => (
                  <tr key={product._id}>
                    <td>{product.itemName}</td>
                    <td>{product.category}</td>
                    <td>{product.stock}</td>
                    <td className="action-buttons">
                      <button
                        onClick={() => handleProductSelection(product)}
                        disabled={product.stock === 0}
                        className={`select-btn ${darkMode ? "dark" : ""}`}
                      >
                        Add
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
            {/* Pagination controls below the table */}
            {totalProductPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '12px 0', gap: 10 }}>
                <button onClick={() => setProductPage(p => Math.max(1, p - 1))} disabled={productPage === 1}>Prev</button>
                <span>Page {productPage} of {totalProductPages}</span>
                <button onClick={() => setProductPage(p => Math.min(totalProductPages, p + 1))} disabled={productPage === totalProductPages}>Next</button>
              </div>
            )}
            <br />
            <div className="selected-products-header">
              <p><strong>Selected Products:</strong></p>
              {selectedProducts.length > 0 && (
                <button
                  onClick={() => setSelectedProducts([])}
                  className="clear-all-btn"
                  title="Clear All Selected Products"
                >
                  Clear All
                </button>
              )}
            </div>
            <br />
            <div>
            {selectedProducts.length > 0 ? (
              <div className="selected-products-table-container">
                <table className={`repair-table ${darkMode ? "dark" : ""}`}>
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th>Qty</th>
                      <th>Selling Price</th>
                      <th>Total Cost</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProducts.map((item, index) => (
                      <tr key={index}>
                        <td>{item.itemName || "Unknown"}</td>
                        <td>{item.category || "Unknown"}</td>
                        <td style={{ textAlign: "center" }}>
                          <div className="quantity-controls-inline">
                            <button
                              onClick={() => handleUpdateQuantity(index, -1)}
                              className="remove-btn"
                              disabled={item.quantity <= 1}
                              title="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="quantity-display">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(index, 1)}
                              className="remove-btn"
                              title="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.sellingPrice || ""}
                            onChange={(e) => {
                              const value = e.target.value === "" ? "" : parseFloat(e.target.value);
                              const updated = [...selectedProducts];
                              updated[index] = {
                                ...updated[index],
                                sellingPrice: value,
                                cost: value && updated[index].quantity ? value * updated[index].quantity : 0,
                              };
                              setSelectedProducts(updated);
                            }}
                            className={`selling-price-input ${darkMode ? "dark" : ""}`}
                            placeholder="Price"
                            required
                            style={{ width: "90px", padding: "4px", fontSize: "14px", textAlign: "center" }}
                          />
                        </td>
                        <td>
                          <strong>
                            Rs. {item.cost?.toFixed(2) || (item.sellingPrice * item.quantity)?.toFixed(2) || "0.00"}
                          </strong>
                        </td>
                        <td>
                          <button
                            onClick={() => handleRemoveProduct(index)}
                            className="remove-btn"
                            title="Remove product"
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              
              </div>
            ) : (
              <p>No products selected.</p>
            )}
            </div>
            <br />
            <div className="modal-buttons-container">
              <button onClick={handleUpdateCart} className="update-cart-btn">
                Update Cart
              </button>
              <button onClick={() => setShowSelectModal(false)} className="a-p-cancel-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showReturnModal && selectedRepair && (
        <div className="view-modal">
          <div className="modal-content">
            <div style={{ textAlign: "center", fontWeight: "bold" }}>
              Return Products From Repair Cart
            </div>
            <hr />
            {error && <p className="error-message">{error}</p>}
            {returnFormData.length > 0 ? (
              <form onSubmit={(e) => { e.preventDefault(); handleReturnSubmit(); }}>
                <table className={`repair-table ${darkMode ? "dark" : ""}`}>
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th>CURRENT QUANTITY</th>
                      <th>RETURN QUANTITY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnFormData.map((item) => (
                      <tr key={item.itemCode}>
                        <td>{item.itemName}</td>
                        <td>{item.category}</td>
                        <td>{item.maxQuantity}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max={item.maxQuantity}
                            value={item.quantity}
                            onChange={(e) => handleReturnFormChange(item.itemCode, e.target.value)}
                            className={`product-repair-list-input ${darkMode ? "dark" : ""}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <br />
                <button type="submit" className="return-submit-btn">
                  Submit Return
                </button>
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="modal-cancel-btn"
                >
                  Close
                </button>
              </form>
            ) : (
              <p>No products available to return.</p>
            )}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedReviewRepair && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedReviewRepair.technicianReview ? "✏️ Edit Technician Review" : "➕ Add Technician Review"}</h2>
            </div>
            <div className="modal-body">
              <textarea
                id="technicianReview"
                rows="8"
                value={technicianReview}
                onChange={(e) => setTechnicianReview(e.target.value)}
                className="review-textarea"
                placeholder="Enter technician review..."
              />
              {error && <div className="error-message">{error}</div>}
            </div>
            <div className="modal-footer">
              <button
                className="modal-footer-btn modal-cancel-btn"
                onClick={() => {
                  setShowReviewModal(false);
                  setTechnicianReview("");
                  setSelectedReviewRepair(null);
                }}
              >
                Cancel
              </button>
              <button
                className={`modal-footer-btn submit`}
                onClick={handleSubmitReview}
                disabled={loading}
              >
                {loading ? 'Saving...' : selectedReviewRepair.technicianReview ? 'Update Review' : 'Add Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCashierChangesModal && (
        <div className="view-modal">
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '10px',
              borderBottom: `2px solid ${darkMode ? '#1a68bc' : '#e53e3e'}`
            }}>
              <h2 style={{
                margin: 0,
                color: darkMode ? '#1a68bc' : '#e53e3e',
                fontSize: '1.5rem'
              }}>
                Work History
              </h2>
              <button
                onClick={() => setShowCashierChangesModal(false)}
                className="modal-cancel-btn"
              >
                Close
              </button>
            </div>

            <div className="cashier-changes-container">
              {Object.keys(cashierChanges).length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: darkMode ? '#a0aec0' : '#718096'
                }}>
                  No changes recorded yet.
                </div>
              ) : (
                Object.entries(cashierChanges).map(([cashier, changes]) => (
                  <div key={cashier} className="cashier-section">
                    <h3 className="cashier-name" style={{
                      color: darkMode ? '#63b3ed' : '#2b6cb0',
                      marginBottom: '1rem',
                      padding: '0.5rem',
                      borderBottom: `1px solid ${darkMode ? '#4a5568' : '#e2e8f0'}`
                    }}>
                      {cashier}
                    </h3>
                    <div className="cashier-changes">
                      {changes.map((change, index) => (
                        <div key={index} className="change-history-item" style={{
                          backgroundColor: darkMode ? '#2d3748' : '#f7fafc',
                          padding: '1rem',
                          marginBottom: '1rem',
                          borderRadius: '0.5rem',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                          <div className="change-header" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '0.5rem'
                          }}>
                            <span className="change-date" style={{
                              color: darkMode ? '#a0aec0' : '#718096',
                              fontSize: '0.875rem'
                            }}>
                              {change.timestamp}
                            </span>
                            <span className={`change-type ${change.changeType.toLowerCase()}`} style={{
                              backgroundColor: change.changeType === 'CREATE' ? '#48bb78' :
                                change.changeType === 'UPDATE' ? '#4299e1' : '#f56565',
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}>
                              {change.changeType.toUpperCase()}
                            </span>
                          </div>
                          <div className="change-details" style={{
                            color: darkMode ? '#e2e8f0' : '#2d3748'
                          }}>
                            <div className="change-field" style={{ marginBottom: '0.5rem' }}>
                              <strong>Changed:</strong> {change.field}
                            </div>
                            <div className="change-values" style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '1rem',
                              marginBottom: '0.5rem'
                            }}>
                              <div className="old-value">
                                <strong>From:</strong> {typeof change.oldValue === 'object' ? JSON.stringify(change.oldValue) : change.oldValue || 'N/A'}
                              </div>
                              <div className="new-value">
                                <strong>To:</strong> {typeof change.newValue === 'object' ? JSON.stringify(change.newValue) : change.newValue || 'N/A'}
                              </div>
                            </div>
                            <div className="repair-info" style={{
                              backgroundColor: darkMode ? '#4a5568' : '#edf2f7',
                              padding: '0.5rem',
                              borderRadius: '0.25rem',
                              marginTop: '0.5rem'
                            }}>
                              <strong>Repair Details:</strong>
                              <div>Invoice: {change.repairInvoice}</div>
                              <div>Customer: {change.customerName}</div>
                              <div>Device: {change.deviceType}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductRepairList;