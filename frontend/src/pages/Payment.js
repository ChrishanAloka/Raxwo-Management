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
import { faSearch, faCartPlus } from '@fortawesome/free-solid-svg-icons';

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

  const [cashierId, setCashierId] = useState(localStorage.getItem('userId') || 'N/A');
  const [cashierName, setCashierName] = useState(localStorage.getItem('username') || 'Unknown');

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
  

  const addToCart = (product) => {
    setCart([...cart, { ...product, quantity: 1, discount: 0 }]);
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

  const filteredProducts = searchQuery.trim() === ""
    ? products
    : products.filter(product => {
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

  return (
    <div className={`payment-container ${darkMode ? 'dark' : ''}`}>
      {error && <p className="error-message">{error}</p>}
      <br/><br/>
      <br/><br/>

      <div className={`cart ${darkMode ? 'dark' : ''}`}>
        <div className="cart-header">
          <h2 className={`salary-list-title ${darkMode ? 'dark' : ''}`}>Cart</h2>
          
          <div className="cart-search-container">

            <button
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
            )}
            <button
              className={`return-payment-btn ${darkMode ? 'dark' : ''}`}
              onClick={() => setShowReturnPopup(true)}
              disabled={!customerName || !contactNumber || !cashierId || !cashierName || cashierId === 'N/A'}
            >
              Return Payment
            </button>
          </div>
        </div>
        {/* Customer Details Input Fields */}
        <div className="customer-details-input">
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
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      className={darkMode ? 'dark' : ''}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.sellingPrice}
                      onChange={(e) => handlePriceChange(index, parseFloat(e.target.value))}
                      className={`price-input ${darkMode ? 'dark' : ''}`}
                      style={{ width: "90px", padding: "4px", textAlign: "center" }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={item.discount}
                      onChange={(e) => applyDiscount(index, e.target.value)}
                      className={darkMode ? 'dark' : ''}
                    />
                  </td>
                  <td>Rs.{(item.sellingPrice * item.quantity - item.discount).toFixed(2)}</td>
                  <td>
                    <button
                      onClick={() => removeFromCart(index)}
                      className={`removebtn ${darkMode ? 'dark' : ''}`}
                    >
                      <img src={remicon} alt="remove" width="30" height="30" />
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
          <div className="summary-row">
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
          </div>

          <div className="summary-row">
          <button
            className={`pay-btn ${darkMode ? 'dark' : ''}`}
            onClick={() => setShowPopup(true)}
            disabled={cart.length === 0 || !cashierId || !cashierName || cashierId === 'N/A'}
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
      <div className="cashier-button-container">
          {showCashierCard && (
            <div className={`cashier-card ${darkMode ? 'dark' : ''}`}>
              <h4>Cashier Details</h4>
              <p><strong>Name:</strong> {cashierName}</p>
              <p><strong>ID:</strong> {cashierId}</p>
              <button
                className={`close-card-btn ${darkMode ? 'dark' : ''}`}
                onClick={toggleCashierCard}
              >
                Close
              </button>
            </div>
          )}
        </div>

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

        <div className={`product-grid ${darkMode ? 'dark' : ''}`}>
          {filteredProducts.length === 0 ? (
            <p className={`no-products ${darkMode ? 'dark' : ''}`}>No products found</p>
          ) : (
            filteredProducts.map(product => (
              <div key={product._id} className={`product-card ${darkMode ? 'dark' : ''}`}>
                <div className="product-info">
                  {/* <span className={`product-code ${darkMode ? 'dark' : ''}`}>{product.itemCode}</span> */}
                  <span className={`product-name ${darkMode ? 'dark' : ''}`}>{product.itemName} - </span>
                  <span className={`product-name ${darkMode ? 'dark' : ''}`}>{product.category}</span>
                  <span className={`product-price ${darkMode ? 'dark' : ''}`} style={{ color: 'black' }}>
                    Sell: Rs.{product.sellingPrice.toFixed(2)} / Stock : {product.stock}
                  </span>
                </div>
                <button
                  onClick={() => addToCart(product)}
                  className={`add-to-cart-btn ${darkMode ? 'dark' : ''}`}
                  disabled={product.stock === 0}
                >
                  <FontAwesomeIcon icon={faCartPlus} size="lg" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Payment;