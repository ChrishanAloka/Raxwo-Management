import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Highcharts from "highcharts";
import "highcharts/highcharts-3d";
import HighchartsReact from "highcharts-react-official";
import incomeIcon from "../icon/add-to-basket1 (2).png";
import costIcon from "../icon/8.png";
import profitIcon from "../icon/2.png";
import sucessIcon from "../icon/6.png";
import warningIcon from "../icon/warning.png";
import repairingIcon from "../icon/00.png";
import { FaChartLine } from "react-icons/fa";
import "../styles/Dashboard.css";

const API_URL = "https://raxwo-management.onrender.com/api/dashboard";
const PRODUCTS_REPAIR_API_URL = 'https://raxwo-management.onrender.com/api/productsRepair';
const EXTRA_INCOME_API_URL = 'https://raxwo-management.onrender.com/api/extra-income';
const SALARIES_API_URL = 'https://raxwo-management.onrender.com/api/salaries';
const MAINTENANCE_API_URL = 'https://raxwo-management.onrender.com/api/maintenance';
const PAYMENTS_API_URL = 'https://raxwo-management.onrender.com/api/payments/forsummery';
const PRODUCTS_API_URL = 'https://raxwo-management.onrender.com/api/products';
const SUPPLIERS_API_URL = 'https://raxwo-management.onrender.com/api/suppliers';

const Dashboard = ({ darkMode }) => {
  const navigate = useNavigate();
  const [dailyData, setDailyData] = useState({ income: 0, cost: 0, profit: 0 });
  const [jobData, setJobData] = useState({ completed: 0, pending: 0, inProgress: 0 });
  const [sixMonthData, setSixMonthData] = useState({ months: [], income: [], cost: [], profit: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalNetProfit, setTotalNetProfit] = useState(0);

  // State for historical data
  const [repairsData, setRepairsData] = useState([]);
  const [extraIncomeData, setExtraIncomeData] = useState([]);
  const [paymentsData, setPaymentsData] = useState([]);
  const [productsData, setProductsData] = useState([]);
  const [salariesData, setSalariesData] = useState([]);
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [supplierPaymentsData, setSupplierPaymentsData] = useState([]);

  const isDarkMode = darkMode;

  const getUserName = () => {
    return localStorage.getItem('cashierName') ||
           localStorage.getItem('userName') ||
           localStorage.getItem('username') || 'User';
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAllDataForTotals();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      setDailyData({
        income: data.dailyIncome || 0,
        cost: data.dailyCost || 0,
        profit: data.dailyProfit || 0
      });
      setJobData({
        completed: data.completedJobs || 0,
        pending: data.pendingJobs || 0,
        inProgress: data.inProgressJobs || 0
      });
      setSixMonthData({
        months: data.sixMonthMonths || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        income: data.sixMonthIncome || [0, 0, 0, 0, 0, 0],
        cost: data.sixMonthCost || [0, 0, 0, 0, 0, 0],
        profit: data.sixMonthProfit || [0, 0, 0, 0, 0, 0],
      });
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Using calculated values.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all data for total calculations
  const fetchAllDataForTotals = async () => {
    try {
      const [repairsRes, extraIncomeRes, salariesRes, maintenanceRes, paymentsRes, productsRes, suppliersRes] = await Promise.all([
        fetch(PRODUCTS_REPAIR_API_URL),
        fetch(EXTRA_INCOME_API_URL),
        fetch(SALARIES_API_URL),
        fetch(MAINTENANCE_API_URL),
        fetch(PAYMENTS_API_URL),
        fetch(PRODUCTS_API_URL),
        fetch(SUPPLIERS_API_URL)
      ]);

      let repairs = [];
      let extraIncome = [];
      let salaries = [];
      let maintenance = [];
      let payments = [];
      let products = [];
      let suppliers = [];

      if (repairsRes.ok) repairs = await repairsRes.json();
      if (extraIncomeRes.ok) extraIncome = await extraIncomeRes.json();
      if (salariesRes.ok) salaries = await salariesRes.json();
      if (maintenanceRes.ok) maintenance = await maintenanceRes.json();
      if (paymentsRes.ok) payments = await paymentsRes.json();
      if (productsRes.ok) products = await productsRes.json();
      if (suppliersRes.ok) suppliers = await suppliersRes.json();

      setRepairsData(repairs);
      setExtraIncomeData(extraIncome);
      setPaymentsData(payments);
      setProductsData(products);
      setSalariesData(salaries);
      setMaintenanceData(maintenance);

      // Flatten supplier payments
      const supplierPayments = [];
      suppliers.forEach(s => {
        if (Array.isArray(s.paymentHistory)) {
          s.paymentHistory.forEach(p => {
            supplierPayments.push({ ...p, supplierName: s.supplierName });
          });
        }
      });
      setSupplierPaymentsData(supplierPayments);

      // Calculate totals
      calculateTotals(repairs, extraIncome, salaries, maintenance, payments, products, supplierPayments);
      calculateTodayData(repairs, extraIncome, salaries, maintenance, payments, products, supplierPayments);

    } catch (err) {
      console.error("Error fetching data for totals:", err);
    }
  };

  const calculateTotals = (repairs, extraIncome, salaries, maintenance, payments, products, supplierPayments) => {
    // Income
    const totalRepairIncome = repairs
      .reduce((sum, repair) => sum + (repair.totalAdditionalServicesAmount + repair.checkingCharge + repair.totalRepairCost - repair.totalDiscountAmount || 0), 0);

    const totalExtraIncome = extraIncome
      .reduce((sum, ei) => sum + (ei.amount || 0), 0);

    const totalPurchaseIncome = payments
      .filter(p => ![ 'refund'].includes((p.paymentMethod || '').toLowerCase()))
      .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

    const totalPurchaseRefund = payments
    .filter(p => [ 'refund'].includes((p.paymentMethod || '').toLowerCase()))
    .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

    const totalIncomeValue = totalRepairIncome + totalExtraIncome + totalPurchaseIncome + totalPurchaseRefund;
    setTotalIncome(totalIncomeValue);

    // Expenses
    const totalProductExpenses = products
      .filter(p => p.buyingPrice > 0)
      .reduce((sum, p) => sum + (p.buyingPrice * (p.stock || 0)), 0);

    const totalSalaryExpenses = salaries.reduce((sum, s) => sum + (s.advance || 0), 0);
    const totalMaintenanceExpenses = maintenance.reduce((sum, m) => sum + (m.price || 0), 0);
    const totalSupplierPayments = supplierPayments.reduce((sum, p) => sum + Number(p.currentPayment || 0), 0);

    const totalExpensesValue = totalProductExpenses + totalSalaryExpenses + totalMaintenanceExpenses;
    setTotalExpenses(totalExpensesValue);

    setTotalNetProfit(totalIncomeValue - totalExpensesValue);
  };

  const calculateTodayData = (repairs, extraIncome, salaries, maintenance, payments, products, supplierPayments) => {
    const todayKey = getLocalDateKey(new Date());

    const todayRepairIncome = repairs
      .filter(r => getLocalDateKey(r.createdAt) === todayKey && (r.paymentMethod || '').toLowerCase() !== 'credit')
      .reduce((sum, repair) => sum + (repair.totalAdditionalServicesAmount + repair.checkingCharge + repair.totalRepairCost - repair.totalDiscountAmount || 0), 0);

    const todayExtraIncome = extraIncome
      .filter(ei => getLocalDateKey(ei.date) === todayKey && (ei.paymentMethod || '').toLowerCase() !== 'credit')
      .reduce((sum, ei) => sum + (ei.amount || 0), 0);

    const todayPurchaseIncome = payments
      .filter(p => getLocalDateKey(p.date) === todayKey && !['credit', 'refund'].includes((p.paymentMethod || '').toLowerCase()))
      .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

    const todayIncome = todayRepairIncome + todayExtraIncome + todayPurchaseIncome;

    const todaySalary = salaries
      .filter(s => getLocalDateKey(s.date) === todayKey)
      .reduce((sum, s) => sum + (s.advance || 0), 0);

    const todayMaintenance = maintenance
      .filter(m => getLocalDateKey(m.date) === todayKey)
      .reduce((sum, m) => sum + (m.price || 0), 0);

    const todayProductExpenses = products
      .filter(p => getLocalDateKey(p.createdAt) === todayKey && p.buyingPrice > 0)
      .reduce((sum, p) => sum + (p.buyingPrice * (p.stock || 0)), 0);

    const todaySupplierPayments = supplierPayments
      .filter(p => getLocalDateKey(p.date) === todayKey)
      .reduce((sum, p) => sum + Number(p.currentPayment || 0), 0);

    const todayCost = todaySalary + todayMaintenance + todayProductExpenses + todaySupplierPayments;

    setDailyData(prev => ({
      ...prev,
      income: todayIncome,
      cost: todayCost,
      profit: todayIncome - (prev.cost ? prev.cost : 0) // Optional: subtract parts cost if needed
    }));
  };

  const getLocalDateKey = (dateInput) => {
    if (!dateInput) return 'Unknown';
    const d = new Date(dateInput);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getLast6MonthsData = () => {
    const now = new Date();
    const months = [];
    const monthKeys = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleString('default', { month: 'short' }));
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const getMonthKey = (dateInput) => {
      if (!dateInput) return '';
      const d = new Date(dateInput);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    const incomeArr = monthKeys.map(monthKey => {
      const repairs = repairsData.filter(r => getMonthKey(r.createdAt) === monthKey)
        .reduce((sum, repair) => sum + (repair.totalAdditionalServicesAmount + repair.checkingCharge + repair.totalRepairCost - repair.totalDiscountAmount || 0), 0);
      const extra = extraIncomeData.filter(ei => getMonthKey(ei.date) === monthKey)
        .reduce((sum, ei) => sum + (ei.amount || 0), 0);
      const sales = paymentsData.filter(p => getMonthKey(p.date) === monthKey )
        .reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      return repairs + extra + sales;
    });

    const costArr = monthKeys.map(monthKey => {
      const products = productsData.filter(p => getMonthKey(p.createdAt) === monthKey && p.buyingPrice > 0)
        .reduce((sum, p) => sum + (p.buyingPrice * (p.stock || 0)), 0);
      const salaries = salariesData.filter(s => getMonthKey(s.date) === monthKey)
        .reduce((sum, s) => sum + (s.advance || 0), 0);
      const maintenance = maintenanceData.filter(m => getMonthKey(m.date) === monthKey)
        .reduce((sum, m) => sum + (m.price || 0), 0);
      const supplier = supplierPaymentsData.filter(p => getMonthKey(p.date) === monthKey)
        .reduce((sum, p) => sum + Number(p.currentPayment || 0), 0);
      return products + salaries + maintenance ;
    });

    const profitArr = incomeArr.map((inc, i) => inc - (costArr[i] || 0));
    return { months, incomeArr, costArr, profitArr };
  };

  const { months: chartMonths, incomeArr: chartIncome, costArr: chartCost, profitArr: chartProfit } = getLast6MonthsData();

  const formatShortNumber = (num) => {
    if (num >= 10000000) return (num / 10000000).toFixed(2) + ' Cr';
    if (num >= 100000) return (num / 100000).toFixed(2) + ' L';
    if (num >= 1000) return (num / 1000).toFixed(2) + ' K';
    return num.toString();
  };

  const chartOptions = {
    chart: {
      type: "column",
      inverted: false,
      backgroundColor: isDarkMode ? "#181f2a" : "#f8fafc",
      borderRadius: 16,
      style: { fontFamily: "'Inter', sans-serif" },
      animation: true,
    },
    title: {
      text: "Financial Performance Overview",
      style: { color: isDarkMode ? "#f9fafb" : "#1e293b", fontSize: '22px', fontWeight: '700' },
      align: 'left',
      margin: 24
    },
    subtitle: {
      text: "6-Month Revenue, Expenses, and Profit Trends",
      style: { color: isDarkMode ? "#9ca3af" : "#64748b", fontSize: '15px', fontWeight: '500' },
      align: 'left',
      y: 44
    },
    xAxis: {
      categories: chartMonths,
      labels: { style: { color: isDarkMode ? "#d1d5db" : "#334155", fontSize: "15px", fontWeight: '600' }, y: 8 },
      lineColor: isDarkMode ? "#374151" : "#e5e7eb",
      gridLineColor: isDarkMode ? "#232b39" : "#e5e7eb",
    },
    yAxis: {
      title: { text: "Amount (Rs.)", style: { color: isDarkMode ? "#9ca3af" : "#64748b", fontSize: '15px', fontWeight: '600' } },
      labels: { style: { color: isDarkMode ? "#d1d5db" : "#334155" }, formatter: function () { return formatShortNumber(this.value); } },
      gridLineColor: isDarkMode ? "#232b39" : "#e5e7eb",
      min: 0,
    },
    plotOptions: {
      column: {
        borderRadius: 6,
        dataLabels: {
          enabled: true,
          format: "Rs. {y}",
          style: { color: isDarkMode ? "#f9fafb" : "#1e293b", fontSize: "13px", fontWeight: '700' },
        }
      }
    },
    series: [
      { name: "Revenue", data: chartIncome, color: "#10b981" },
      { name: "Expenses", data: chartCost, color: "#ef4444" },
      { name: "Net Profit", data: chartProfit, color: "#3b82f6" },
    ],
    legend: {
      align: "center",
      verticalAlign: "bottom",
      itemStyle: { color: isDarkMode ? "#f9fafb" : "#1e293b", fontSize: "15px", fontWeight: '600' }
    },
    credits: { enabled: false },
    tooltip: {
      backgroundColor: isDarkMode ? "#232b39" : "#f1f5f9",
      borderColor: isDarkMode ? "#374151" : "#e5e7eb",
      formatter: function() {
        return `<b>${this.x}</b><br/><span style="color:${this.color}">●</span> ${this.series.name}: <b>Rs. ${formatShortNumber(this.y)}</b>`;
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('cashierId');
    localStorage.removeItem('cashierName');
    navigate('/');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      currencyDisplay: 'code'
    }).format(amount).replace('INR', 'Rs.');
  };

  return (
    <div className={`dashboard-container ${darkMode ? "dark" : ""}`}>
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-content">
            <div className="header-left">
              <h1 className="dashboard-title">Welcome Back, {getUserName()}! 👋</h1>
              <p className="dashboard-subtitle">Here's Your Business Overview for Today</p>
            </div>
            <div className="header-right">
              {lastUpdated && <div className="last-updated"><span>Last updated: {lastUpdated}</span></div>}
            </div>
          </div>
        </header>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"><div className="spinner-icon">⏳</div></div>
            <p className="loading-text">Loading Dashboard Data...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <div className="error-content">
              <h3>Error Loading Data</h3>
              <p>{error}</p>
              <button className="retry-button" onClick={fetchDashboardData}>Try Again</button>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="summary-section">
              <h2 className="section-title">Today's Summary</h2>
              <div className="summary-grid">
                <div className="summary-card income-card">
                  <div className="card-header">
                    <div className="card-icon-wrapper income">
                      <img src={incomeIcon} alt="Income" className="card-icon" />
                    </div>
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">Total Revenue</h3>
                    <p className="card-amount">{formatCurrency(dailyData.income)}</p>
                    <p className="card-subtitle">Today's Earnings</p>
                    <p className="card-total-income" style={{ marginTop: 8, color: '#10b981', fontWeight: 500 }}>
                      Total Income: {formatCurrency(totalIncome)}
                    </p>
                  </div>
                </div>

                <div className="summary-card expense-card">
                  <div className="card-header">
                    <div className="card-icon-wrapper expense">
                      <img src={costIcon} alt="Cost" className="card-icon" />
                    </div>
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">Total Expenses</h3>
                    <p className="card-amount">{formatCurrency(dailyData.cost)}</p>
                    <p className="card-subtitle">Today's Costs</p>
                    <p className="card-total-income" style={{ marginTop: 8, color: '#ef4444', fontWeight: 500 }}>
                      Total Expenses: {formatCurrency(totalExpenses)}
                    </p>
                  </div>
                </div>

                <div className="summary-card profit-card">
                  <div className="card-header">
                    <div className="card-icon-wrapper profit">
                      <img src={profitIcon} alt="Profit" className="card-icon" />
                    </div>
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">Net Profit</h3>
                    <p className="card-amount">{formatCurrency(dailyData.profit)}</p>
                    <p className="card-subtitle">Today's Profit</p>
                    <p className="card-total-income" style={{ marginTop: 8, color: '#3b82f6', fontWeight: 500 }}>
                      Net Profit: {formatCurrency(totalNetProfit)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Repair Jobs Section */}
            <div className="summary-section">
              <h2 className="section-title">Repair Jobs Status</h2>
              <div className="summary-grid">
                <div className="summary-card completed-card">
                  <div className="card-header">
                    <div className="card-icon-wrapper income">
                      <img src={sucessIcon} alt="Completed" className="card-icon" />
                    </div>
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">Completed Jobs</h3>
                    <p className="card-amount">{jobData.completed}</p>
                    <p className="card-subtitle">Total Completed Repairs</p>
                  </div>
                </div>

                <div className="summary-card pending-card">
                  <div className="card-header">
                    <div className="card-icon-wrapper expense">
                      <img src={warningIcon} alt="Pending" className="card-icon" />
                    </div>
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">Pending Jobs</h3>
                    <p className="card-amount">{jobData.pending}</p>
                    <p className="card-subtitle">Total Pending Repairs</p>
                  </div>
                </div>

                <div className="summary-card profit-card">
                  <div className="card-header">
                    <div className="card-icon-wrapper profit">
                      <img src={repairingIcon} alt="In Progress" className="card-icon" />
                    </div>
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">In Progress Jobs</h3>
                    <p className="card-amount">{jobData.inProgress}</p>
                    <p className="card-subtitle">Total Repairs in Progress</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div className="chart-section">
              <div className="chart-card">
                <HighchartsReact highcharts={Highcharts} options={chartOptions} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;