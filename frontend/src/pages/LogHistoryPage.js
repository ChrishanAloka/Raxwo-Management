import React, { useEffect, useState } from 'react';
import '../styles/PaymentTable.css';
import '../Products.css';
import { FaUser, FaEdit, FaTrashAlt, FaPlusCircle, FaSignOutAlt, FaSignInAlt } from 'react-icons/fa';

// Centralized activity log API
const ACTIVITY_LOG_API = 'https://raxwo-management.onrender.com/api/activity';

// Entity labels for display
const ENTITY_LABELS = {
  dashboard: 'Dashboard',
  productsRepair: 'Repair Jobs',
  product: 'Products',
  stockUpdate: 'Stock Management',
  supplier: 'Suppliers',
  cashier: 'Staff',
  user: 'User Accounts',
  salary: 'Payroll',
  payment: 'New Payment',
  paymentRecord: 'Payment Records',
  extraIncome: 'Other Income',
  maintenance: 'Maintenance',
  attendance: 'Attendance',
  attendanceRecord: 'Attendance Records',
  shopSettings: 'Billing Settings',
  summary: 'Summary Reports',
  Product: 'Product',
  Supplier: 'Supplier',
  Payment: 'Payment',
  User: 'User',
  Attendance: 'Attendance',
  Cashier: 'Cashier',
  ProductRepair: 'Repair Job',
  BankPassbook: 'Bank Transaction',
  Maintenance: 'Maintenance',
  Salary: 'Salary',
  ExtraIncome: 'Extra Income',
  GRN: 'GRN',
  DeviceIssue: 'Device Issue',
  DeviceType: 'Device Type',
  Customer: 'Customer',
  Return: 'Return',
  ClickedProduct: 'Clicked Product',
};

// Map action to icon and color
const getActionDisplay = (action) => {
  switch (action) {
    case 'create':
      return { icon: <FaPlusCircle />, color: '#22c55e', label: 'Created' };
    case 'edit':
      return { icon: <FaEdit />, color: '#3b82f6', label: 'Edited' };
    case 'delete':
      return { icon: <FaTrashAlt />, color: '#ef4444', label: 'Deleted' };
    case 'login':
      return { icon: <FaSignInAlt />, color: '#8b5cf6', label: 'Logged in' };
    case 'logout':
      return { icon: <FaSignOutAlt />, color: '#6b7280', label: 'Logged out' };
    default:
      return { icon: <FaUser />, color: '#6b7280', label: action };
  }
};

const LogHistoryPage = ({ darkMode }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restrict to admin
  const isAdmin = (localStorage.getItem('role') || '').trim().toLowerCase() === 'admin';

  useEffect(() => {
    if (!isAdmin) return;

    const fetchActivityLogs = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(ACTIVITY_LOG_API, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Failed to fetch activity logs');
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        console.error('Error fetching activity logs:', err);
        setError(err.message);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivityLogs();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view the activity log.</p>
      </div>
    );
  }

  return (
    <div className={`product-list-container${darkMode ? ' dark' : ''}`}>
      <div className="header-section">
        <h2 className={`product-list-title${darkMode ? ' dark' : ''}`}>
          🔍 Centralized Activity Log
        </h2>
        <p style={{ color: darkMode ? '#cbd5e1' : '#4a5568' }}>
          Real-time audit trail of all system actions
        </p>
      </div>

      {loading ? (
        <div className="loading">Loading activity logs...</div>
      ) : error ? (
        <div style={{ color: 'red', padding: '1rem' }}>
          ❌ Error: {error}
        </div>
      ) : logs.length === 0 ? (
        <p>No activity logs found.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="payment-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left' }}>Time</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>User</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Action</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Resource</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => {
                const { icon, color, label } = getActionDisplay(log.action);
                const resourceLabel = ENTITY_LABELS[log.resource] || log.resource;

                return (
                  <tr key={log._id || index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontSize: '0.875rem' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600 }}>
                      {log.user?.username || 'System'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {icon} {label}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#4f46e5', fontWeight: 600 }}>
                      {resourceLabel}
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.875rem', maxWidth: '500px', wordWrap: 'break-word' }}>
                      {log.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LogHistoryPage;