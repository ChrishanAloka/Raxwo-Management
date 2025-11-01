import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FaTachometerAlt,
  FaBox,
  FaFileAlt,
  FaCog,
  FaUser,
  FaPen,
  FaCashRegister,
  FaMarker,
  FaTable,
  FaDatabase,
  FaUserFriends,
  FaWrench,
  FaMoneyBillWaveAlt,
  FaAngleLeft,
  FaAngleRight,
  FaAngrycreative,
  FaChartBar,
  FaHistory,
  FaTrashAlt,
  FaEyeSlash,
  FaPassport,
  FaSchool
} from "react-icons/fa";
import "./Navbar.css";
import gelogo from './icon/Ge.logo.jpg';

const Navbar = ({ darkMode, onToggleSidebar }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [role, setRole] = useState(localStorage.getItem('role'));

  const location = useLocation();

  // useEffect(() => {
  //   const handleStorage = () => {
  //     setRole(localStorage.getItem('role'));
  //     console.log("role ",role);
  //   };
  //   window.addEventListener('storage', handleStorage);
  //   return () => window.removeEventListener('storage', handleStorage);
  // }, []);

  useEffect(() => {
    const currentRole = localStorage.getItem('role');
    setRole(currentRole);
  }, [location]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    onToggleSidebar?.(!isCollapsed);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button className="mobile-menu-toggle" onClick={() => setIsMobileOpen(!isMobileOpen)}>
        ☰
      </button>

      {/* Overlay for mobile sidebar */}
      {isMobileOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileOpen(false)}></div>
      )}

      <div className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileOpen ? "open" : ""}`}>
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          {/* No text or icon, arrow shape is handled by CSS */}
        </button>

        <div className="sidebar-logo">
          <img src={gelogo} alt="logo" className="logo" />
        </div>

        <ul className="sidebar-menu">
          {role === 'admin' && (
            <li><NavLink to="/Dashboard" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaTachometerAlt className="icon" /><span>Dashboard</span></NavLink></li>
          )}
          <li><NavLink to="/productsRepair" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaWrench className="icon" /><span>Repair Jobs</span></NavLink></li>
          <li><NavLink to="/products" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaBox className="icon" /><span>Products</span></NavLink></li>
          {role === 'admin' && (  
            <li><NavLink to="/productsRelease" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaBox className="icon" /><span>Products Release</span></NavLink></li>
          )}
          {/* <li><NavLink to="/category-products" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaTable className="icon" /><span>Stock</span></NavLink></li> */}
          {/* <li><NavLink to="/StockUpdateList" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaPen claInvoicessName="icon" /><span>Stock Management</span></NavLink></li> */}
          <li><NavLink to="/SupplierList" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaUserFriends className="icon" /><span>Suppliers</span></NavLink></li>
          {role === 'admin' && (
            <>
              <li><NavLink to="/cashiers" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaCashRegister className="icon" /><span>Staff</span></NavLink></li>
              <li><NavLink to="/Users" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaUser className="icon" /><span>User Accounts</span></NavLink></li>
              <li><NavLink to="/salaries" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaMoneyBillWaveAlt className="icon" /><span>Payroll</span></NavLink></li>
            </>
          )}
          <li><NavLink to="/payment" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaFileAlt className="icon" /><span>Invoice</span></NavLink></li>
          <li><NavLink to="/PaymentTable" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaDatabase className="icon" /><span>Invoice Records</span></NavLink></li>
          <li><NavLink to="/extra-income" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaMoneyBillWaveAlt className="icon" /><span>Other Income</span></NavLink></li>
          <li><NavLink to="/maintenance-list" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaCog className="icon" /><span>Bills and Other Ex.</span></NavLink></li>
          {/* <li><NavLink to="/CashierAttendance" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaMarker className="icon" /><span>Attendance</span></NavLink></li> */}
          {/* <li><NavLink to="/CashierAttendanceTable" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaTable className="icon" /><span>Attendance Records</span></NavLink></li> */}
          {role === 'admin' && (
            <>    
              <li><NavLink to="/bankPassbook-list" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaPassport className="icon" /><span>Bank Passbook </span></NavLink></li>
              <li><NavLink to="/ShopSettings" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaAngrycreative className="icon" /><span>Billing Settings</span></NavLink></li>
              <li><NavLink to="/AllSummary" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaChartBar className="icon" /><span>Summary Reports</span></NavLink></li>
              <li><NavLink to="/log-history" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaHistory className="icon" /><span>Activity Log</span></NavLink></li>
            </>
          )}
          <li><NavLink to="/AddProduct" className={({ isActive }) => isActive ? "sidebar-link active-link" : "sidebar-link"} onClick={() => isMobileOpen && setIsMobileOpen(false)}><FaTrashAlt className="icon" /><span>Deleted Products</span></NavLink></li>
        </ul>
      </div>
    </>
  );
};

export default Navbar;
