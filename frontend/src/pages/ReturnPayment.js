import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate for redirect
import '../styles/ReturnPayment.css';
import { jsPDF } from 'jspdf';
import axios from 'axios';
import removeicon from '../icon/info.png';

const ReturnPayment = ({ onClose, darkMode, cashierId, cashierName }) => {
  const navigate = useNavigate(); // Initialize useNavigate
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [returnItems, setReturnItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, redirecting to login');
      navigate('/');
      return;
    }

    // Fetch all products with authorization header
    axios.get('https://raxwo-management.onrender.com/api/products', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => {
        console.log('Products fetched:', res.data); // Debug log
        
        // Filter products to only show those from the main product list (not deleted)
        const clickedProducts = JSON.parse(localStorage.getItem('clickedProducts') || '[]');
        const clickedProductIds = clickedProducts.map(cp => cp._id);
        
        const allProducts = Array.isArray(res.data) ? res.data : [];
        const availableProducts = allProducts.filter(product => 
          !product.clickedForAdd && !clickedProductIds.includes(product._id)
        );
        
        console.log('Available products for return:', availableProducts.length, 'out of', allProducts.length);
        setProducts(availableProducts);
      })
      .catch(err => {
        console.error('Error fetching products:', err.response?.data); // Debug log
        if (err.response?.status === 401) {
          alert('Session expired or invalid token. Please log in again.');
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          localStorage.removeItem('username');
          localStorage.removeItem('role');
          navigate('/');
        }
        setError('Failed to load products. Please try again.');
      });
  }, [navigate]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
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

  const addToReturn = (product) => {
    const existingItem = returnItems.find(item => item.productId === product._id);
    if (!existingItem) {
      setReturnItems([...returnItems, { ...product, productId: product._id, quantity: 1, discount: 0, returnPrice: product.sellingPrice }]);
    }
  };

  const handleQuantityChange = (index, value) => {
    const updatedItems = [...returnItems];
    updatedItems[index].quantity = Math.max(1, Number(value));
    setReturnItems(updatedItems);
  };

  const removeFromReturn = (index) => {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  const calculateReturnTotal = () => {
    return returnItems.reduce((total, item) => total + (item.returnPrice * item.quantity), 0);
  };

  const generateReturnReceiptHTML = (returnData) => {
    const shopName = localStorage.getItem('shopName') || 'GENIUS';
    const shopAddress = localStorage.getItem('shopAddress') || '#422 Thimbirigasyaya Road, Colombo 05';
    const shopPhone = localStorage.getItem('shopPhone') || '0770235330';
    const shopEmail = localStorage.getItem('shopEmail') || 'igentuslk@gmail.com';

    const { returnInvoiceNumber, cashierName, cashierId } = returnData;
    const currentDate = new Date().toLocaleString();
    const totalRefund = calculateReturnTotal(); // Make sure this is accessible

    const returnItems = returnData.items || [];

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Return Receipt - ${returnInvoiceNumber}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        <style>
          @page {
            size: 80mm 140mm;
            margin: 5mm;
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 10px;
            margin: 0;
            padding: 5mm;
            background: white;
            color: #000;
            width: 70mm;
          }
          .header {
            text-align: center;
            margin-bottom: 5px;
          }
          .shop-name {
            font-size: 14px;
            font-weight: bold;
          }
          .tagline {
            font-size: 9px;
          }
          .contact {
            font-size: 9px;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 5px 0;
          }
          .invoice {
            font-weight: bold;
            text-align: center;
            margin: 5px 0;
          }
          .details {
            margin: 5px 0;
            line-height: 1.4;
          }
          .items {
            margin: 5px 0;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
          }
          .item-name {
            width: 40%;
          }
          .item-qty {
            width: 10%;
          }
          .item-amt {
            width: 30%;
            text-align: right;
          }
          .total {
            margin-top: 5px;
            font-weight: bold;
            text-align: right;
          }
          .footer {
            text-align: center;
            margin-top: 10px;
            font-size: 8px;
          }
          .action-buttons {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin: 10px 0;
          }
          .print-btn, .download-btn {
            padding: 8px 12px;
            font-size: 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .print-btn {
            background-color: #007bff;
            color: white;
          }
          .download-btn {
            background-color: #28a745;
            color: white;
          }
          @media print {
            .action-buttons {
              display: none !important;
            }
            body {
              margin: 0;
              padding: 5mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${shopName}</div>
          <div class="tagline">YOUR TRUSTED REPAIR PARTNER</div>
          <div class="contact">${shopAddress}<br>Phone: ${shopPhone} / ${shopEmail}</div>
        </div>

        <div class="divider"></div>

        <div class="invoice">RETURN RECEIPT</div>

        <div class="divider"></div>

        <div class="details">
          <div><strong>DATE:</strong> ${currentDate}</div>
          <div><strong>CASHIER:</strong> ${cashierName} (ID: ${cashierId})</div>
          <div><strong>RETURN NO:</strong> ${returnInvoiceNumber}</div>
        </div>

        <div class="divider"></div>

        <div class="items">
          <div class="item-row" style="font-weight: bold;">
            <span class="item-qty">QTY</span>
            <span class="item-name">ITEM</span>
            <span class="item-amt">AMOUNT</span>
          </div>
          <div class="divider"></div>
          ${returnItems.map(item => {
            const total = (item.returnPrice * item.quantity).toFixed(2);
            return `
              <div class="item-row">
                <span class="item-qty">${item.quantity}</span>
                <span class="item-name">${item.itemName.length > 12 ? item.itemName : item.itemName}</span>
                <span class="item-amt">Rs. ${total}</span>
              </div>
            `;
          }).join('')}
        </div>

        <div class="divider"></div>

        <div class="total">TOTAL REFUND: Rs. ${totalRefund.toFixed(2)}</div>

        <div class="divider"></div>

        <div class="footer">
          Thank you for your business!<br>
          Software by Exyplan Software<br>
          Contact: 074 357 3323
        </div>

        <div class="action-buttons">
          <button class="print-btn" onclick="window.print()">Print</button>
          <button class="download-btn" onclick="downloadPDF()">Download PDF</button>
        </div>

        <script type="text/javascript">
          function downloadPDF() {
            const { jsPDF } = window.jspdf;
            html2canvas(document.body, {
              scale: 3,
              useCORS: true,
              backgroundColor: '#ffffff',
              width: document.body.scrollWidth,
              height: document.body.scrollHeight
            }).then(canvas => {
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [75, (canvas.height * 75) / canvas.width]
              });
              const imgWidth = 70;
              const imgHeight = (canvas.height * imgWidth) / canvas.width;
              pdf.addImage(imgData, 'PNG', 2, 5, imgWidth, imgHeight);
              pdf.save('Return_${returnInvoiceNumber}.pdf');
            });
          }
        </script>
      </body>
      </html>
    `;
  };

  const handleReturnPayment = async () => {
    if (returnItems.length === 0) {
      alert("Please add at least one item to return.");
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert("Authentication token missing. Please log in again.");
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      localStorage.removeItem('role');
      navigate('/');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("https://raxwo-management.onrender.com/api/payments/return", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: returnItems.map(item => ({
            productId: item.productId,
            itemName: item.itemName,
            quantity: item.quantity,
            price: item.returnPrice,
            discount: item.discount,
          })),
          totalRefund: calculateReturnTotal(),
          cashierId,
          cashierName,
        }),
      });

      const data = await response.json();
      console.log('Return response:', data); // Debug log
      setLoading(false);

      const popup = window.open('', '_blank');

      if (response.ok) {
        const returnData = {
          returnInvoiceNumber: data.returnInvoiceNumber,
          cashierName,
          cashierId,
          items: returnItems
        };

        const html = generateReturnReceiptHTML(returnData);
        popup.document.write(html);
        popup.document.close();

        if(popup.document.close()){
          alert(`Return successful!\nTotal Refund: Rs. ${calculateReturnTotal().toFixed(2)}\nReturn Invoice: ${data.returnInvoiceNumber}`);
        }
        onClose(data.returnInvoiceNumber);
      } else {
        popup.close();
        if (response.status === 401) {
          alert("Session expired or invalid token. Please log in again.");
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          localStorage.removeItem('username');
          localStorage.removeItem('role');
          navigate('/');
        } else {
          alert(`Error: ${data.message || 'Failed to process return.'}`);
        }
      }
    } catch (error) {
      console.error('Return error:', error); // Debug log
      setLoading(false);
      alert("Failed to process return. Please try again.");
    }
  };

  return (
    <div className="return-popup">
      <div className={`return-popup-content ${darkMode ? "dark-mode" : ""}`}>
        <h2 className={`return-title ${darkMode ? "dark-mode" : ""}`}>Return Payment</h2>
        {error && <p className={`error-message ${darkMode ? "dark-mode" : ""}`}>{error}</p>}
        
        <div className="search-section">
          <input
            type="text"
            placeholder="🔍 Search by item name, category..."
            value={searchQuery}
            onChange={handleSearch}
            className={`return-search ${darkMode ? "dark-mode" : ""}`}
          />
          <div className="product-results">
            {filteredProducts.map(product => (
              <div key={product._id} className={`product-item ${darkMode ? "dark-mode" : ""}`}>
                <span>{product.itemName} - {product.category} - Rs. {product.sellingPrice}</span>
                <div className="product-results-button">
                  <button onClick={() => addToReturn(product)}>Add</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="return-items">
          <table className={`return-table ${darkMode ? "dark-mode" : ""}`}>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {returnItems.map((item, index) => (
                <tr key={index}>
                  <td>{item.itemName}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      onFocus={(e) => e.target.select()}
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      onWheel={(e) => e.target.blur()}
                      className={darkMode ? "dark-mode" : ""}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      onFocus={(e) => e.target.select()}
                      value={item.returnPrice}
                      onWheel={(e) => e.target.blur()}
                      onChange={(e) => {
                        const updatedItems = [...returnItems];
                        updatedItems[index].returnPrice = parseFloat(e.target.value) || 0;
                        setReturnItems(updatedItems);
                      }}
                      className={`price-input ${darkMode ? "dark-mode" : ""}`}
                      style={{ width: '80px', padding: '2px' }}
                    />
                  </td>
                  <td>Rs. {(item.returnPrice * item.quantity).toFixed(2)}</td>
                  <td>
                    <button
                      className="remove-btn"
                      onClick={() => removeFromReturn(index)}
                    >
                      <img src={removeicon} alt="remove" width="30" height="30" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className={`return-total ${darkMode ? "dark-mode" : ""}`}>
          <strong>Total Refund:</strong> Rs. {calculateReturnTotal().toFixed(2)}
        </p>

        <div className="return-buttons">
          <button
            className={`return-confirm-btn ${darkMode ? "dark-mode" : ""}`}
            onClick={handleReturnPayment}
            disabled={returnItems.length === 0 || loading}
          >
            {loading ? "Processing..." : "Confirm Return"}
          </button>
          <button
            className={`return-cancel-btn ${darkMode ? "dark-mode" : ""}`}
            onClick={() => onClose(null)}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnPayment;