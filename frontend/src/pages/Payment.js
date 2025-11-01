import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Payment.css';
import remicon from '../icon/info.png';
import caicon from '../icon/businessman.png';
import PaymentPaid from './PaymentPaid';
import CustomerForm from './CustomerForm';
import ReturnPayment from './ReturnPayment';
import ShopSettings from './ShopSettings';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faCartPlus, faTimes } from '@fortawesome/free-solid-svg-icons';

const Payment = ({ darkMode }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartSearchQuery, setCartSearchQuery] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showReturnPopup, setShowReturnPopup] = useState(false);
  const [showShopSettings, setShowShopSettings] = useState(false);
  const [paymentType, setPaymentType] = useState(null);
  const [latestInvoiceNumber, setLatestInvoiceNumber] = useState(null);
  const [showCashierCard, setShowCashierCard] = useState(false);
  const [error, setError] = useState(null);
  const [isWholesale, setIsWholesale] = useState(false);
  const [customerDetails, setCustomerDetails] = useState(null);
  // New state for customer details
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [hideLowStockOnly, setHideLowStockOnly] = useState(false);
  const [show0StockOnly, setShow0StockOnly] = useState(false);
  const [hide0StockOnly, setHide0StockOnly] = useState(false);

  const [cashierId, setCashierId] = useState(localStorage.getItem('userId') || 'N/A');
  const [cashierName, setCashierName] = useState(localStorage.getItem('username') || 'Unknown');

  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);  

  const [focusedField, setFocusedField] = useState({ index: null, field: null });
  // e.g., { index: 2, field: 'sellingPrice' }

  // Get all unique categories from products
  const allCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const [categorySearch, setCategorySearch] = useState('');

  const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

  const [paymentDate, setPaymentDate] = useState(today);  

  const isCartFullyAssigned = () => {
    return cart.length > 0 && cart.every(item => item.assignedTo && item.assignedTo.trim() !== "");
  };

  const filteredCategoriesForSearch = categorySearch.trim() === ''
  ? allCategories
  : allCategories.filter(cat =>
      cat.toLowerCase().includes(categorySearch.toLowerCase().trim())
    );

  // Reusable function to fetch available products
  const fetchAvailableProducts = async (setProducts, navigate) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      const response = await axios.get('https://raxwo-management.onrender.com/api/products', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const allProducts = Array.isArray(response.data) ? response.data : [];

      // Get clicked/deleted products from localStorage
      const clickedProducts = JSON.parse(localStorage.getItem('clickedProducts') || '[]');
      const clickedProductIds = clickedProducts.map(cp => cp._id);

      // Filter out deleted (clicked) products
      const availableProducts = allProducts.filter(product =>
        !product.clickedForAdd && !clickedProductIds.includes(product._id)
      );

      setProducts(availableProducts);
    } catch (err) {
      console.error('Error fetching products:', err.response?.data || err.message);
      if (err.response?.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        navigate('/');
      } else {
        // Optional: set error state if needed
      }
    }
  };

  useEffect(() => {

    fetchAvailableProducts(setProducts, navigate);

    setCashierId(localStorage.getItem('userId') || 'N/A');
    setCashierName(localStorage.getItem('username') || 'Unknown');

    // Load customer details from localStorage
    setCustomerName(localStorage.getItem('customerName') || '');
    setContactNumber(localStorage.getItem('contactNumber') || '');
    setAddress(localStorage.getItem('address') || '');
    setDescription(localStorage.getItem('description') || '');
    setAssignedTo(localStorage.getItem('assignedTo') || '');
    

    // Load cart from localStorage
    const savedCart = localStorage.getItem('paymentCart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        // Optional: Validate structure
        if (Array.isArray(parsedCart)) {
          setCart(parsedCart);
        }
      } catch (e) {
        console.error('Failed to parse cart from localStorage', e);
        localStorage.removeItem('paymentCart');
      }
    }

  }, [navigate]);

  useEffect(() => {
    function handleClickOutside(e) {
      const categoryFilterSection = e.target.closest('.category-filter-section');
      if (!categoryFilterSection && showCategoryFilter) {
        setShowCategoryFilter(false);
        setCategorySearch('');
      }
    }

    if (showCategoryFilter) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showCategoryFilter]);

  useEffect(() => {
    if (error) {  
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [error]);
  

  const addToCart = (product) => {
    setCart([...cart, { ...product, quantity: 1, sellingPrice: 0, discount: 0, assignedTo: "", }]);
    localStorage.setItem('paymentCart', JSON.stringify(cart));
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
    localStorage.setItem('paymentCart', JSON.stringify(cart));
  };

  const handleQuantityChange = (index, value) => {
    const updatedCart = [...cart];
    updatedCart[index].quantity = Math.max(1, Number(value));
    setCart(updatedCart);
    localStorage.setItem('paymentCart', JSON.stringify(cart));
  };

  const applyDiscount = (index, discount) => {
    const updatedCart = [...cart];
    updatedCart[index].discount = Math.max(0, Number(discount));
    setCart(updatedCart);
    localStorage.setItem('paymentCart', JSON.stringify(cart));
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.sellingPrice * item.quantity), 0);
  };

  const calculateTotalDiscount = () => {
    return cart.reduce((total, item) => total + item.discount, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateTotalDiscount();
  };

  const calculateTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const normalize = (str) => str.toLowerCase().replace(/\s+/g, ' ');

  // Fuzzy substring match: tolerate minor typos like "ipone" → "iphone"
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

  const filteredProducts = (() => {

    let result = products;

    if (searchQuery.trim() !== '') {
      let subresult1 = products.filter(product => {
        const name = product.itemName.toLowerCase()
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
        const name = product.itemName.toLowerCase()
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

    // Apply category filter if any categories are selected
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

    return result;
  })([ searchQuery, showLowStockOnly, show0StockOnly, hide0StockOnly, hideLowStockOnly]);

  const filteredCart = cart.filter((item) =>
    item.itemName.toLowerCase().includes(cartSearchQuery.toLowerCase())
  );

  const handlePaymentClose = (invoiceNumber) => {
    setShowPopup(false);
    if (invoiceNumber) {
      setLatestInvoiceNumber(invoiceNumber);
      setCart([]);
      // Clear customer details after payment
      setCustomerName('');
      setContactNumber('');
      setAddress('');
      setDescription('');
      setAssignedTo('');
      // Clear wholesale customer details after payment
      localStorage.removeItem('wholesaleCustomer');
      localStorage.removeItem('paymentCart');
      // Clear from localStorage
      localStorage.removeItem('customerName');
      localStorage.removeItem('contactNumber');
      localStorage.removeItem('address');
      localStorage.removeItem('description');
      localStorage.removeItem('assignedTo');
      // ... clear customer details
      setIsWholesale(false);
      setCustomerDetails(null);

      // ✅ Re-fetch updated product list (e.g., in case items were deleted or stock changed)
      fetchAvailableProducts(setProducts, navigate);
    }
  };

  const handlePaymentClear = () => {
      setCart([]);
      
      // Clear wholesale customer details after payment
      localStorage.removeItem('wholesaleCustomer');
      localStorage.removeItem('paymentCart');
      // Clear from localStorage
      localStorage.removeItem('customerName');
      localStorage.removeItem('contactNumber');
      localStorage.removeItem('address');
      localStorage.removeItem('description');
      localStorage.removeItem('assignedTo');
      // ... clear customer details
      // Clear customer details after payment
      setCustomerName('');
      setContactNumber('');
      setAddress('');
      setDescription('');
      setAssignedTo('');

      setIsWholesale(false);
      setCustomerDetails(null);
  };

  const handlePriceChange = (index, newPrice) => {
  if (isNaN(newPrice) || newPrice < 0) return;

  const updatedCart = [...cart];
  const oldPrice = updatedCart[index].sellingPrice;
  const quantity = updatedCart[index].quantity;

  // Update selling price
  updatedCart[index] = {
    ...updatedCart[index],
    sellingPrice: newPrice,
    // Optionally: recalculate total if you don't compute on render
  };

  setCart(updatedCart);
  localStorage.setItem('paymentCart', JSON.stringify(cart));
};

  const handleReturnClose = (returnInvoiceNumber) => {
    setShowReturnPopup(false);
    setCart([]);
    // Clear customer details after payment
    setCustomerName('');
    setContactNumber('');
    setAddress('');
    setDescription('');
    setAssignedTo('');
    // Clear wholesale customer details after payment
    localStorage.removeItem('wholesaleCustomer');
    localStorage.removeItem('paymentCart');
    // Clear from localStorage
    localStorage.removeItem('customerName');
    localStorage.removeItem('contactNumber');
    localStorage.removeItem('address');
    localStorage.removeItem('description');
    localStorage.removeItem('assignedTo');
    
    if (returnInvoiceNumber) {
      setLatestInvoiceNumber(returnInvoiceNumber);
    }
  };

  const handleCustomerSubmit = ({ isWholesale, customerDetails }) => {
    setIsWholesale(isWholesale);
    setCustomerDetails(customerDetails);
  };

  const toggleCashierCard = () => {
    setShowCashierCard(!showCashierCard);
  };

  const [isCartSearchVisible, setIsCartSearchVisible] = useState(false);

  const getDisplayValue = (value, rowIndex, fieldName) => {
    if (focusedField.index === rowIndex && focusedField.field === fieldName && value === 0) {
      return ""; // hide zero when focused
    }
    return value;
  };

  const validateBeforePayment = () => {
    // 1. Cart not empty
    if (cart.length === 0) {
      setError('Cart is empty. Please add items before proceeding.');
      return false;
    }

    // 2. Customer details
    if (!customerName.trim()) {
      setError('Please enter customer name.');
      return false;
    }

    if (!contactNumber.trim()) {
      setError('Please enter contact number.');
      return false;
    }

    // Optional: basic phone validation
    // if (!/^\d{10,15}$/.test(contactNumber.replace(/\D/g, ''))) {
    //   setError('Please enter a valid contact number (10–15 digits).');
    //   return false;
    // }

    // 3. Check each cart item
    for (let i = 0; i < cart.length; i++) {
      const item = cart[i];

      // Price must be > 0
      if (item.sellingPrice <= 0) {
        setError(`Price for "${item.itemName}" must be greater than 0.`);
        return false;
      }

      // Quantity must be >= 1
      if (item.quantity < 1) {
        setError(`Quantity for "${item.itemName}" must be at least 1.`);
        return false;
      }

      // Assigned to must be selected
      if (!item.assignedTo || item.assignedTo.trim() === '') {
        setError(`Please assign "${item.itemName}" to a technician.`);
        return false;
      }
    }

    // 4. Cashier validation (you already disable button, but double-check)
    if (!cashierId || cashierId === 'N/A') {
      setError('Cashier information is missing. Please log in again.');
      return false;
    }

    // Clear any previous error if validation passes
    setError(null);
    return true;
  };

  return (
    <div className={`payment-container ${darkMode ? 'dark' : ''}`}>
      {/* Debug: Show current state */}
    
      <br/><br/>
      <br/><br/>

      <div className={`cart ${darkMode ? 'dark' : ''}`}>
        <div className="cart-header">
          <h2 className={`salary-list-title ${darkMode ? 'dark' : ''}`}>Cart</h2>
          {error && <p className="error-message">{error}</p>}
          
          <div className="cart-search-container">

            {/* <button
              className={`add-btn ${darkMode ? 'dark' : ''}`}
              onClick={() => setIsCartSearchVisible(!isCartSearchVisible)}
            >
              <FontAwesomeIcon icon={faSearch} size="lg" className={`cart-ser-icon ${darkMode ? 'dark' : ''}`}/>
            </button>
            {isCartSearchVisible && (
              <input
                type="text"
                placeholder=" Search in cart..."
                value={cartSearchQuery}
                onChange={(e) => setCartSearchQuery(e.target.value)}
                className={`cart-search ${darkMode ? 'dark' : ''}`}
              />
            )} */}
            {/* <button
              className={`return-payment-btn ${darkMode ? 'dark' : ''}`}
              onClick={() => setShowReturnPopup(true)}
              disabled={!customerName || !contactNumber || !cashierId || !cashierName || cashierId === 'N/A'}
            >
              Return Payment
            </button> */}
          </div>
        </div>
        {/* Customer Details Input Fields */}

        <div className="customer-details-input">

          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className={`customer-input ${darkMode ? 'dark' : ''}`}
            style={{ marginTop: '8px' }}
          />
          
          <input
            type="text"
            placeholder="Customer Name"
            value={customerName}
            onChange={(e) => {
              setCustomerName(e.target.value);
              localStorage.setItem('customerName', e.target.value);
            }}
            className={`customer-input ${darkMode ? 'dark' : ''}`}
          />
          <input
            type="text"
            placeholder="Contact Number"
            value={contactNumber}
            onChange={(e) => {
              setContactNumber(e.target.value);
              localStorage.setItem('contactNumber', e.target.value);
            }}
            className={`customer-input ${darkMode ? 'dark' : ''}`}
          />
          {/* <input
            type="text"
            placeholder="Address"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              localStorage.setItem('address', e.target.value);
            }}
            className={`customer-input ${darkMode ? 'dark' : ''}`}
          /> */}
        </div>
        <div className={`cart-scroll ${darkMode ? 'dark' : ''}`}>
          <table className={`cart-table ${darkMode ? 'dark' : ''}`}>
            <thead className={`cart-table-head ${darkMode ? 'dark' : ''}`}>
              <tr>
                <th>Item Name</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Discount</th>
                <th>Assign To</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody className={`cart-table-body ${darkMode ? 'dark' : ''}`}>
              {filteredCart.map((item, index) => (
                <tr key={index}>
                  <td>{item.itemName} - {item.category}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      // placeholder="1"
                      onFocus={(e) => {
                        setFocusedField({ index, field: 'quantity' });
                        e.target.select();
                      }}
                      onBlur={() => setFocusedField({ index: null, field: null })}
                      onWheel={(e) => e.target.blur()}
                      value={getDisplayValue(item.quantity, index, 'quantity')}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : Number(e.target.value);
                        handleQuantityChange(index, val);
                      }}
                      className={darkMode ? 'dark' : ''}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      // placeholder="0"
                      onFocus={(e) => {
                        setFocusedField({ index, field: 'sellingPrice' });
                        e.target.select();
                      }}
                      onBlur={() => setFocusedField({ index: null, field: null })}
                      onWheel={(e) => e.target.blur()}
                      value={getDisplayValue(item.sellingPrice, index, 'sellingPrice')}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                        handlePriceChange(index, val);
                      }}
                      className={`price-input ${darkMode ? 'dark' : ''}`}
                      style={{ width: "90px", padding: "4px", textAlign: "center" }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      // placeholder="0"
                      onFocus={(e) => {
                        setFocusedField({ index, field: 'discount' });
                        e.target.select();
                      }}
                      onBlur={() => setFocusedField({ index: null, field: null })}
                      onWheel={(e) => e.target.blur()}
                      value={getDisplayValue(item.discount, index, 'discount')}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : Number(e.target.value);
                        applyDiscount(index, val);
                      }}
                      className={darkMode ? 'dark' : ''}
                    />
                  </td>
                  {/* 👇 Assign To Per Item */}
                  <td>
                    <select
                      value={item.assignedTo || ""}
                      onChange={(e) => {
                        const updatedCart = [...cart];
                        updatedCart[index] = {
                          ...updatedCart[index],
                          assignedTo: e.target.value,
                        };
                        setCart(updatedCart);
                        localStorage.setItem('paymentCart', JSON.stringify(updatedCart));
                      }}
                      // className={`customer-input ${darkMode ? 'dark' : ''}`}
                      style={{ fontSize: '13px', padding: '4px 6px' }}
                      required
                    >
                      <option value="" disabled>Select Technician</option>
                      <option value="Prabath">Prabath</option>
                      <option value="Nadeesh">Nadeesh</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Genex-EX">Genex EX</option>
                      <option value="I-Device">I Device</option>
                    </select>
                  </td>
                  <td>Rs.{(item.sellingPrice * item.quantity - item.discount).toFixed(2)}</td>
                  <td>
                    <button
                      onClick={() => removeFromCart(index)}
                      
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`payment-summary ${darkMode ? 'dark' : ''}`}>
          <div className="summary-row">
            <h3 className={`subtotal ${darkMode ? 'dark' : ''}`}>
              Subtotal: Rs.{calculateSubtotal().toFixed(2)}
            </h3>
            <h3 className={`total-discount ${darkMode ? 'dark' : ''}`}>
              Discount: Rs.{calculateTotalDiscount().toFixed(2)}
            </h3>
          </div>
          <div className="summary-row">
            <h3 className={`total ${darkMode ? 'dark' : ''}`}>
              Total: Rs.{calculateTotal().toFixed(2)}
            </h3>
            <h3 className={`total-items ${darkMode ? 'dark' : ''}`}>
              Items: {calculateTotalItems()}
            </h3>
          </div>
          <div className="summary-row">
          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              localStorage.setItem('description', e.target.value);
            }}
            className={`customer-input ${darkMode ? 'dark' : ''}`}
          />
          </div>
          
          {/* Assigned To Dropdown - Added Here */}
          {/* <div className="summary-row">
            <select
              value={assignedTo || ""}
              onChange={(e) => {
                const value = e.target.value;
                setAssignedTo(value); // Make sure you have this state defined
                localStorage.setItem("assignedTo", value); // Optional: persist in localStorage
              }}
              className={`customer-input ${darkMode ? 'dark' : ''}`}
            >
              <option value="" disabled selected >Assign to Technician/Team</option>
              <option value="Prabath">Prabath</option>
              <option value="Nadeesh">Nadeesh</option>
              <option value="Accessories">Accessories</option>
              <option value="Genex-EX">Genex EX</option>
              <option value="I-Device">I Device</option>
            </select>
          </div> */}
          {cart.length > 0 && !isCartFullyAssigned() && (
            <p className="error-message" style={{ textAlign: 'center', margin: '8px 0' }}>
              ⚠️ Please assign all items to a technician before completing payment.
            </p>
          )}
          <div className="summary-row">
          <button
            className={`pay-btn ${darkMode ? 'dark' : ''}`}
            onClick={() => {
              if (validateBeforePayment()) {
                setShowPopup(true);
              }
              // If validation fails, error is already shown via setError
            }}
            // disabled={
            //   cart.length === 0 ||
            //   !isCartFullyAssigned() || // ← ADD THIS
            //   !cashierId ||
            //   !contactNumber ||
            //   !cashierName ||
            //   cashierId === 'N/A'
            // }
          >
            Complete Payment
          </button>
          <button
            className={`pay-btn ${darkMode ? 'dark' : ''}`}
            onClick={() => handlePaymentClear()}
          >
            Clear All Data
          </button>
          </div>
          
        </div>

        {showPopup && (
          <PaymentPaid
            totalAmount={calculateTotal()}
            items={cart}
            onClose={handlePaymentClose }
            darkMode={darkMode}
            cashierId={cashierId}
            cashierName={cashierName}
            isWholesale={isWholesale}
            customerDetails={customerDetails}
            customerName={customerName}
            contactNumber={contactNumber}
            address={address}
            description={description}
            assignedTo={assignedTo}
            paymentDate={paymentDate}
          />
        )}

        {showReturnPopup && (
          <ReturnPayment
            onClose={handleReturnClose}
            darkMode={darkMode}
            cashierId={cashierId}
            cashierName={cashierName}
          />
        )}

        {showShopSettings && (
          <ShopSettings
            darkMode={darkMode}
            onClose={() => setShowShopSettings(false)}
          />
        )}

        {latestInvoiceNumber && (
          <div className={`invoice-display ${darkMode ? 'dark' : ''}`}>
            <h3 className={`invoice-number ${darkMode ? 'dark' : ''}`}>
              Latest Invoice Number: {latestInvoiceNumber}
            </h3>
          </div>
        )}

        {/* <div className={`checkbox-group ${darkMode ? 'dark' : ''}`}>
          <label className={`check-box-lbl ${darkMode ? 'dark' : ''}`}>
            <input
              type="checkbox"
              onChange={() => {
                setPaymentType('Credit');
                setShowCustomerForm(true);
              }}
            />
                &nbsp;&nbsp;Credit and Wholesale
          </label>
        </div> */}
      </div>

      {showCustomerForm && (
        <CustomerForm
          totalAmount={calculateTotal()}
          paymentType={paymentType}
          onClose={() => setShowCustomerForm(false)}
          onSubmit={handleCustomerSubmit}
          darkMode={darkMode}
          cashierId={cashierId}
          cashierName={cashierName}
        />
      )}

      <div className={`product-list ${darkMode ? 'dark' : ''}`}>
        <h2 className={`salary-list-title ${darkMode ? 'dark' : ''}`}>Products</h2>

        <div className="product-search-container">
          <input
            type="text"
            placeholder="🔍 Search name, buying or selling price..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`productsearch ${darkMode ? 'dark' : ''}`}
          />
          <button
            className={`add-btn ${darkMode ? 'dark' : ''}`}
            onClick={() => filteredProducts.length > 0 && addToCart(filteredProducts[0])}
            disabled={filteredProducts.length === 0}
          >
            <FontAwesomeIcon icon={faCartPlus} size="lg" />
          </button>
        </div>
        <div className="product-search-container">
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
        </div>
        {/* Category Filter Toggle & Search */}
        <div className="category-filter-section" style={{ marginTop: '12px' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // 🔥 Prevents outside click detection
              console.log("Toggling filter. Current:", showCategoryFilter);
              setShowCategoryFilter(prev => !prev); // ✅ Toggle instead of hard-setting
            }}
            style={{
              background: darkMode ? '#334155' : '#e2e8f0',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              color: darkMode ? '#e2e8f0' : '#1e293b',
            }}
          >
            <span>🔽</span>
            <span>
              Filter by Category {selectedCategories.size > 0 && `(${selectedCategories.size})`}
            </span>
          </button>

          {showCategoryFilter && (
            <div
              style={{
                padding: '12px',
                marginTop: '8px',
                borderTop: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                backgroundColor: darkMode ? '#1a1a1a' : '#f8fafc',
                borderRadius: '8px',
              }}
            >
              {/* Search Input */}
              <input
                type="text"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                onClick={(e) => e.stopPropagation()} // Prevent dropdown close
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  marginBottom: '10px',
                  border: `1px solid ${darkMode ? '#334155' : '#cbd5e1'}`,
                  borderRadius: '6px',
                  backgroundColor: darkMode ? '#2d3748' : '#fff',
                  color: darkMode ? '#e2e8f0' : '#1e293b',
                  fontSize: '14px',
                }}
              />

              {/* Select All / Clear */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '10px',
                flexWrap: 'wrap'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    const filtered = filteredCategoriesForSearch;
                    const newSet = new Set([...selectedCategories, ...filtered]);
                    setSelectedCategories(newSet);
                  }}
                  style={{
                    fontSize: '12px',
                    padding: '4px 8px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Select All Shown
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategories(new Set())}
                  style={{
                    fontSize: '12px',
                    padding: '4px 8px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Clear All
                </button>
              </div>

              {/* Category Checkboxes */}
              <div
                style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '14px', // Generous space between items
                  paddingRight: '4px',
                  paddingLeft: '2px',
                  marginTop: '4px'
                }}
              >
                {allCategories.length === 0 ? (
                  <span
                    style={{
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      color: darkMode ? '#94a3b8' : '#64748b',
                      fontStyle: 'italic',
                      fontSize: '13px',
                      padding: '8px 0'
                    }}
                  >         
                    No categories
                  </span>
                ) : (
                  filteredCategoriesForSearch.map((cat) => (
                    <label
                      key={cat}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        color: darkMode ? '#e2e8f0' : '#1e293b',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                        backgroundColor: darkMode ? '#2d3748' : '#fff',
                        transition: 'all 0.2s ease',
                        fontSize: '14px',
                        fontWeight: 500,
                        boxShadow: `0 1px 3px ${darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'}`
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.has(cat)}
                        onChange={(e) => {
                          const newSet = new Set(selectedCategories);
                          e.target.checked ? newSet.add(cat) : newSet.delete(cat);
                          setSelectedCategories(newSet);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {cat}
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <p className={`no-products ${darkMode ? 'dark' : ''}`}>No products found</p>
        ) : (
          <div className={`product-table-container ${darkMode ? 'dark' : ''}`}>
            <table className={`product-table-payment ${darkMode ? 'dark' : ''}`}>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>
                    Category
                  </th>
                  {/* <th>Selling Price</th> */}
                  <th>Stock</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product._id} className={darkMode ? 'dark-row' : ''}>
                    <td>
                      <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight:  'bold'  }}>
                        {product.itemName} 
                      </span>
                    </td>
                    <td>
                      <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight: 'bold'  }}>
                        {product.category} 
                      </span>
                    </td>
                    {/* <td>
                      Rs.{product.sellingPrice.toFixed(2)}
                    </td> */}
                    <td>
                      <span style={{ color: product.stock <= 2 ? product.stock == 0 ? 'red' : '#2957F0' : 'black', fontWeight: 'bold'  }}>
                        {product.stock}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => addToCart(product)}
                        className={`add-to-cart-btn ${darkMode ? 'dark' : ''}`}
                        disabled={product.stock === 0}
                      >
                        <FontAwesomeIcon icon={faCartPlus} size="lg" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payment;