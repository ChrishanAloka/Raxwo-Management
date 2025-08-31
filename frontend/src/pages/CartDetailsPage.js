import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CartDetailsTable from './CartDetailsTable';
import RepairServiceTable from './RepairServiceTable';
import PastPaymentTable from './PastPaymentTable';
import DiscountsTable from './DiscountsTable';
import PaymentHistoryTable from './PaymentHistoryTable';
import '../styles/Supplier.css';

const CartDetailsPage = ({ darkMode }) => {
  const { supplierId } = useParams();
  const navigate = useNavigate();

  const refreshSuppliers = () => {
    navigate('/products');
  };

  return (
    <div className={`product-list-container ${darkMode ? 'dark' : ''}`}>
      <div className="header-section">
        <h2 className={`product-list-title ${darkMode ? 'dark' : ''}`}>Supplier Cart Details</h2>
        
      </div>
      <div></div>
      <CartDetailsTable
        supplierId={supplierId}
        darkMode={darkMode}
        refreshSuppliers={refreshSuppliers}
      />
      <br/>
      <RepairServiceTable
        supplierId={supplierId}
        darkMode={darkMode}
        refreshSuppliers={refreshSuppliers}
      />
      <br/>
      <DiscountsTable
        supplierId={supplierId}
        darkMode={darkMode}
        refreshSuppliers={refreshSuppliers}
      />
      <br/>
      <PastPaymentTable
        supplierId={supplierId}
        darkMode={darkMode}
        refreshSuppliers={refreshSuppliers}
      />
      <br/>
      <PaymentHistoryTable
        supplierId={supplierId}
        darkMode={darkMode}
        refreshSuppliers={refreshSuppliers}
      />
    </div>
  );
};

export default CartDetailsPage;