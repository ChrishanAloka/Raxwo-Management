import React, { useState, useEffect } from 'react';
import '../styles/PaymentTable.css';
import * as XLSX from 'xlsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileExcel } from '@fortawesome/free-solid-svg-icons';

const PRODUCTS_API_URL = 'https://raxwo-management.onrender.com/api/products';
const SUPPLIERS_API_URL = 'https://raxwo-management.onrender.com/api/suppliers';
const PRODUCTS_REPAIR_API_URL = 'https://raxwo-management.onrender.com/api/productsRepair';
const SALARIES_API_URL = 'https://raxwo-management.onrender.com/api/salaries';
const MAINTENANCE_API_URL = 'https://raxwo-management.onrender.com/api/maintenance';
const EXTRA_INCOME_API_URL = 'https://raxwo-management.onrender.com/api/extra-income';
const PAYMENTS_API_URL = 'https://raxwo-management.onrender.com/api/payments/with-categories';

const AllSummary = ({ darkMode }) => {
  // State for expenses
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [grnExpenses, setGrnExpenses] = useState({ raw: [] });
  const [filteredGrnExpenses, setFilteredGrnExpenses] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [filteredSalaries, setFilteredSalaries] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [filteredMaintenance, setFilteredMaintenance] = useState([]);

  const [supplierPayments, setSupplierPayments] = useState([]);
  const [filteredSupplierPayments, setFilteredSupplierPayments] = useState([]);

  // State for income
  const [repairs, setRepairs] = useState([]);
  const [filteredRepairs, setFilteredRepairs] = useState([]);
  const [extraIncome, setExtraIncome] = useState([]);
  const [filteredExtraIncome, setFilteredExtraIncome] = useState([]);
  const [payments, setpayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);

  // Common filter state
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateField, setDateField] = useState('createdAt');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'expenses', 'income'
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');

  const [productsMap, setProductsMap] = useState(new Map());

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    filterProducts();
    filterGrnExpenses();
    filterSalaries();
    filterMaintenance();
    filterRepairs();
    filterExtraIncome();
    filterPayments();
    filterSupplierPayments();
    // eslint-disable-next-line
  }, [products, grnExpenses.raw, salaries, maintenance, repairs, extraIncome, payments, supplierPayments, filterType, filterDate, startDate, endDate, dateField, categoryFilter, assignedToFilter, paymentMethodFilter]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, suppliersRes, repairsRes, salariesRes, maintenanceRes, extraIncomeRes, paymentsRes] = await Promise.all([
        fetch(PRODUCTS_API_URL),
        fetch(SUPPLIERS_API_URL),
        fetch(PRODUCTS_REPAIR_API_URL),
        fetch(SALARIES_API_URL),
        fetch(MAINTENANCE_API_URL),
        fetch(EXTRA_INCOME_API_URL),
        fetch(PAYMENTS_API_URL)
      ]);
      
      if (!productsRes.ok) throw new Error('Failed to fetch products');
      if (!suppliersRes.ok) throw new Error('Failed to fetch suppliers');
      if (!repairsRes.ok) throw new Error('Failed to fetch repair jobs');
      if (!salariesRes.ok) throw new Error('Failed to fetch salaries');
      if (!maintenanceRes.ok) throw new Error('Failed to fetch maintenance');
      if (!extraIncomeRes.ok) throw new Error('Failed to fetch extra income');
      if (!paymentsRes.ok) throw new Error('Failed to fetch payments');
      
      
      const productsData = await productsRes.json();
      const suppliersData = await suppliersRes.json();
      const repairsData = await repairsRes.json();
      const salariesData = await salariesRes.json();
      const maintenanceData = await maintenanceRes.json();
      const extraIncomeData = await extraIncomeRes.json();
      const paymentsData = await paymentsRes.json();

      // Extract and flatten supplier payment history
      const allSupplierPayments = [];
      for (const supplier of suppliersData) {
        if (Array.isArray(supplier.paymentHistory)) {
          for (const payment of supplier.paymentHistory) {
            allSupplierPayments.push({
              ...payment,
              supplierName: supplier.supplierName,
              _id: payment._id || `${supplier._id}-${Math.random()}`, // Ensure unique key
            });
          }
        }
      }
      setSupplierPayments(allSupplierPayments);
      
      
      // Filter products to only show those from the main product list (not deleted)
      const clickedProducts = JSON.parse(localStorage.getItem('clickedProducts') || '[]');
      const clickedProductIds = clickedProducts.map(cp => cp._id);
      
      const availableProducts = Array.isArray(productsData) ? productsData.filter(product => 
        !product.clickedForAdd && !clickedProductIds.includes(product._id)
      ) : [];
      
      setProducts(availableProducts);
      setRepairs(Array.isArray(repairsData) ? repairsData : []);
      setSalaries(Array.isArray(salariesData) ? salariesData : []);
      setMaintenance(Array.isArray(maintenanceData) ? maintenanceData : []);
      setExtraIncome(Array.isArray(extraIncomeData) ? extraIncomeData : []);
      setpayments(Array.isArray(paymentsData) ? paymentsData : []);

      // Inside fetchAllData(), after setting products:
      // ✅ Build map by itemCode
      const newProductsMap = new Map();
      availableProducts.forEach(p => {
        if (p.itemCode) {
          newProductsMap.set(p.itemCode, p);
        }
      });

      setProducts(availableProducts);
      setProductsMap(newProductsMap);

      // // Fetch all GRNs for all suppliers
      // const allGrns = [];
      // for (const supplier of suppliersData) {
      //   try {
      //     const grnRes = await fetch(`${SUPPLIERS_API_URL}/${supplier._id}/grns`);
      //     if (grnRes.ok) {
      //       const grns = await grnRes.json();
      //       for (const grn of grns) {
      //         allGrns.push({ ...grn, supplierName: supplier.supplierName });
      //       }
      //     }
      //   } catch (e) { /* skip supplier if error */ }
      // }
      // setGrnExpenses({ raw: allGrns });
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const filterProducts = () => {
    if (filterType === 'all') {
      let filtered = products;
      if (categoryFilter) filtered = filtered.filter(p => p.category === categoryFilter);
      setFilteredProducts(filtered);
      return;
    }

    if (filterType === 'range') {
      if (!startDate || !endDate) {
        setFilteredProducts(products);
        return;
      }
      let filtered = products.filter(p => !!p[dateField]);
      if (categoryFilter) filtered = filtered.filter(p => p.category === categoryFilter);
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      
      filtered = filtered.filter(p => {
        const d = new Date(p[dateField]);
        return d >= start && d <= end;
      });
      setFilteredProducts(filtered);
      return;
    }

    if (!filterDate) {
      setFilteredProducts(products);
      return;
    }

    const dateObj = new Date(filterDate);
    let filtered = products.filter(p => !!p[dateField]);
    if (categoryFilter) filtered = filtered.filter(p => p.category === categoryFilter);
    
    if (filterType === 'daily') {
      filtered = filtered.filter(p => {
        return getLocalDateKey(p[dateField]) === getLocalDateKey(filterDate);
      });
    } else if (filterType === 'monthly') {
      filtered = filtered.filter(p => {
        const d = new Date(p[dateField]);
        return d.getFullYear() === dateObj.getFullYear() && d.getMonth() === dateObj.getMonth();
      });
    } else if (filterType === 'yearly') {
      filtered = filtered.filter(p => {
        const d = new Date(p[dateField]);
        return d.getFullYear() === dateObj.getFullYear();
      });
    }
    setFilteredProducts(filtered);
  };

  const filterGrnExpenses = () => {
    if (!grnExpenses.raw) return setFilteredGrnExpenses([]);
    
    if (filterType === 'all') {
      let filtered = [];
      for (const grn of grnExpenses.raw) {
        if (Array.isArray(grn.items)) {
          for (const item of grn.items) {
            if (categoryFilter && item.category !== categoryFilter) continue;
            filtered.push({
              grnNumber: grn.grnNumber,
              supplierName: grn.supplierName,
              itemName: item.itemName,
              itemCode: item.itemCode,
              quantity: item.quantity,
              buyingPrice: item.buyingPrice,
              grnDate: grn.date,
              category: item.category
            });
          }
        }
      }
      setFilteredGrnExpenses(filtered);
      return;
    }

    if (filterType === 'range') {
      if (!startDate || !endDate) {
        setFilteredGrnExpenses([]);
        return;
      }
      let filtered = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      
      for (const grn of grnExpenses.raw) {
        const grnDateObj = grn.date ? new Date(grn.date) : null;
        if (!grnDateObj || isNaN(grnDateObj.getTime())) continue;
        
        if (grnDateObj >= start && grnDateObj <= end && Array.isArray(grn.items)) {
          for (const item of grn.items) {
            if (categoryFilter && item.category !== categoryFilter) continue;
            filtered.push({
              grnNumber: grn.grnNumber,
              supplierName: grn.supplierName,
              itemName: item.itemName,
              itemCode: item.itemCode,
              quantity: item.quantity,
              buyingPrice: item.buyingPrice,
              grnDate: grn.date,
              category: item.category
            });
          }
        }
      }
      setFilteredGrnExpenses(filtered);
      return;
    }

    if (!filterDate) {
      setFilteredGrnExpenses([]);
      return;
    }

    const dateObj = new Date(filterDate);
    let filtered = [];
    for (const grn of grnExpenses.raw) {
      const grnDateObj = grn.date ? new Date(grn.date) : null;
      if (!grnDateObj || isNaN(grnDateObj.getTime())) continue;
      let match = false;
      if (filterType === 'daily') {
        match = grnDateObj.toISOString().slice(0, 10) === filterDate;
      } else if (filterType === 'monthly') {
        match = grnDateObj.getFullYear() === dateObj.getFullYear() && grnDateObj.getMonth() === dateObj.getMonth();
      } else if (filterType === 'yearly') {
        match = grnDateObj.getFullYear() === dateObj.getFullYear();
      }
      if (match && Array.isArray(grn.items)) {
        for (const item of grn.items) {
          if (categoryFilter && item.category !== categoryFilter) continue;
          filtered.push({
            grnNumber: grn.grnNumber,
            supplierName: grn.supplierName,
            itemName: item.itemName,
            itemCode: item.itemCode,
            quantity: item.quantity,
            buyingPrice: item.buyingPrice,
            grnDate: grn.date,
            category: item.category
          });
        }
      }
    }
    setFilteredGrnExpenses(filtered);
  };

  const filterSupplierPayments = () => {
    if (filterType === 'all') {
      let filtered = supplierPayments;
      if (assignedToFilter) {
        filtered = filtered.filter(p => p.assignedTo === assignedToFilter);
      }
      if (categoryFilter) {
        filtered = filtered.filter(p => p.assignedTo === categoryFilter);
      }
      if (paymentMethodFilter) {
        filtered = filtered.filter(p => p.paymentMethod?.toLowerCase() === paymentMethodFilter.toLowerCase());
      }
      setFilteredSupplierPayments(filtered);
      return;
    }

    if (filterType === 'range') {
      if (!startDate || !endDate) {
        setFilteredSupplierPayments(supplierPayments);
        return;
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      let filtered = supplierPayments.filter(p => {
        const pDate = new Date(p.date);
        return pDate >= start && pDate <= end;
      });

      if (assignedToFilter) {
        filtered = filtered.filter(p => p.assignedTo === assignedToFilter);
      }
      if (categoryFilter) {
        filtered = filtered.filter(p => p.assignedTo === categoryFilter);
      }
      if (paymentMethodFilter) {
        filtered = filtered.filter(p => p.paymentMethod?.toLowerCase() === paymentMethodFilter.toLowerCase());
      }

      setFilteredSupplierPayments(filtered);
      return;
    }

    if (!filterDate) {
      setFilteredSupplierPayments(supplierPayments);
      return;
    }

    const dateObj = new Date(filterDate);
    let filtered = supplierPayments.filter(p => !!p.date);

    if (assignedToFilter) {
      filtered = filtered.filter(p => p.assignedTo === assignedToFilter);
    }
    if (categoryFilter) {
        filtered = filtered.filter(p => p.assignedTo === categoryFilter);
      }
    if (paymentMethodFilter) {
      filtered = filtered.filter(p => p.paymentMethod?.toLowerCase() === paymentMethodFilter.toLowerCase());
    }

    if (filterType === 'daily') {
      filtered = filtered.filter(p => getLocalDateKey(p.date) === getLocalDateKey(filterDate));
    } else if (filterType === 'monthly') {
      filtered = filtered.filter(p => {
        const d = new Date(p.date);
        return d.getFullYear() === dateObj.getFullYear() && d.getMonth() === dateObj.getMonth();
      });
    } else if (filterType === 'yearly') {
      filtered = filtered.filter(p => {
        const d = new Date(p.date);
        return d.getFullYear() === dateObj.getFullYear();
      });
    }

    setFilteredSupplierPayments(filtered);
  };

  const filterSalaries = () => {
    if (filterType === 'all') {
      let filtered = salaries;
      if (assignedToFilter) {
        filtered = filtered.filter(salary => salary.assignedTo === assignedToFilter);
      }
      if (categoryFilter) {
        filtered = filtered.filter(salary => salary.assignedTo === categoryFilter);
      }
      if (paymentMethodFilter) {
        filtered = filtered.filter(salary => salary.paymentMethod?.toLowerCase() === paymentMethodFilter.toLowerCase());
      }
      setFilteredSalaries(filtered);
      return;
    }
    
    if (filterType === 'range') {
      if (!startDate || !endDate) {
        setFilteredSalaries(salaries);
        return;
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      let filtered = salaries.filter(salary => {
        const salaryDate = new Date(salary.date);
        return salaryDate >= start && salaryDate <= end;
      });

      if (assignedToFilter) {
        filtered = filtered.filter(salary => salary.assignedTo === assignedToFilter);
      }
      if (categoryFilter) {
        filtered = filtered.filter(salary => salary.assignedTo === categoryFilter);
      }
      if (paymentMethodFilter) {
        filtered = filtered.filter(salary => salary.paymentMethod?.toLowerCase() === paymentMethodFilter.toLowerCase());
      }

      setFilteredSalaries(filtered);
      return;
    }

    if (!filterDate) {
      setFilteredSalaries(salaries);
      return;
    }

    const dateObj = new Date(filterDate);
    let filtered = salaries.filter(salary => !!salary.date);

    if (assignedToFilter) {
      filtered = filtered.filter(salary => salary.assignedTo === assignedToFilter);
    }
    if (categoryFilter) {
        filtered = filtered.filter(salary => salary.assignedTo === categoryFilter);
      }
    if (paymentMethodFilter) {
      filtered = filtered.filter(salary => salary.paymentMethod?.toLowerCase() === paymentMethodFilter.toLowerCase());
    }

    if (filterType === 'daily') {
      filtered = filtered.filter(salary => {
        const salaryDate = getLocalDateKey(salary.date);
        const filterDateKey = getLocalDateKey(filterDate);
        return salaryDate === filterDateKey;
      });
    } else if (filterType === 'monthly') {
      filtered = filtered.filter(salary => {
        const d = new Date(salary.date);
        return d.getFullYear() === dateObj.getFullYear() && d.getMonth() === dateObj.getMonth();
      });
    } else if (filterType === 'yearly') {
      filtered = filtered.filter(salary => {
        const d = new Date(salary.date);
        return d.getFullYear() === dateObj.getFullYear();
      });
    }

    setFilteredSalaries(filtered);
  };

  const filterMaintenance = () => {
    if (filterType === 'all') {
      let filtered = maintenance;
      if (assignedToFilter) {
        filtered = filtered.filter(m => m.assignedTo === assignedToFilter);
      }
      if (categoryFilter) {
        filtered = filtered.filter(m => m.assignedTo === categoryFilter);
      }
      if (paymentMethodFilter) {
        filtered = filtered.filter(m => m.paymentMethod?.toLowerCase() === paymentMethodFilter.toLowerCase());
      }
      setFilteredMaintenance(filtered);
      return;
    }
    
    if (filterType === 'range') {
      if (!startDate || !endDate) {
        setFilteredMaintenance(maintenance);
        return;
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      let filtered = maintenance.filter(maint => {
        const maintDate = new Date(maint.date);
        return maintDate >= start && maintDate <= end;
      });

      if (assignedToFilter) {
        filtered = filtered.filter(m => m.assignedTo === assignedToFilter);
      }
      if (categoryFilter) {
        filtered = filtered.filter(m => m.assignedTo === categoryFilter);
      }
      if (paymentMethodFilter) {
        filtered = filtered.filter(m => m.paymentMethod?.toLowerCase() === paymentMethodFilter.toLowerCase());
      }

      setFilteredMaintenance(filtered);
      return;
    }

    if (!filterDate) {
      setFilteredMaintenance(maintenance);
      return;
    }

    const dateObj = new Date(filterDate);
    let filtered = maintenance.filter(maint => !!maint.date);

    if (assignedToFilter) {
      filtered = filtered.filter(m => m.assignedTo === assignedToFilter);
    }
    if (categoryFilter) {
        filtered = filtered.filter(m => m.assignedTo === categoryFilter);
      }
    if (paymentMethodFilter) {
      filtered = filtered.filter(m => m.paymentMethod?.toLowerCase() === paymentMethodFilter.toLowerCase());
    }

    if (filterType === 'daily') {
      filtered = filtered.filter(maint => {
        const maintDate = getLocalDateKey(maint.date);
        const filterDateKey = getLocalDateKey(filterDate);
        return maintDate === filterDateKey;
      });
    } else if (filterType === 'monthly') {
      filtered = filtered.filter(maint => {
        const d = new Date(maint.date);
        return d.getFullYear() === dateObj.getFullYear() && d.getMonth() === dateObj.getMonth();
      });
    } else if (filterType === 'yearly') {
      filtered = filtered.filter(maint => {
        const d = new Date(maint.date);
        return d.getFullYear() === dateObj.getFullYear();
      });
    }

    setFilteredMaintenance(filtered);
  };

  const filterRepairs = () => {
    // Inside filterRepairs(), add this helper:
    const matchesCategory = (record) => {
      if (!categoryFilter) return true;

      // Check root category
      if (record.category === categoryFilter) return true;

      // Check repairCart
      if (Array.isArray(record.repairCart)) {
        if (record.repairCart.some(item => item.category === categoryFilter)) return true;
      }

      // Check returnCart
      if (Array.isArray(record.returnCart)) {
        if (record.returnCart.some(item => item.category === categoryFilter)) return true;
      }

      return false;
    };

    

    const matchesPaymentMethod = (record) => {
      if (!paymentMethodFilter) return true;
        // console.log("🔍 Checking record:", record._id);
        // console.log("   paymentMethod:", record.paymentMethod);
        // console.log("   paymentBreakdown:", record.paymentBreakdown);
        // console.log("   Filter:", paymentMethodFilter);
      if (Array.isArray(record.paymentBreakdown) && record.paymentBreakdown.length > 0) {
        const hasMatch = record.paymentBreakdown.some(pb => 
          pb?.method?.toLowerCase() === paymentMethodFilter.toLowerCase()
        );
        // console.log("   → Match result (from paymentBreakdown):", hasMatch);
        return hasMatch;
      }
      else{
        const match = record.paymentMethod?.toLowerCase() === paymentMethodFilter.toLowerCase();
        // console.log("   → Match result (from paymentMethod):", match);
        return match;
      }
    };

    const matchesAssignee = (record) => {
      if (!assignedToFilter) return true;
      // Check root assignedTo
      if (record.assignedTo === assignedToFilter) return true;
      // Check repairCart
      if (Array.isArray(record.repairCart)) {
        if (record.repairCart.some(item => item.assignedTo === assignedToFilter)) return true;
      }
      // Check returnCart
      if (Array.isArray(record.returnCart)) {
        if (record.returnCart.some(item => item.assignedTo === assignedToFilter)) return true;
      }
      return false;
    };

    if (filterType === 'all') {
      let filtered = repairs.filter(r => !!r[dateField]);
      filtered = filtered.filter(matchesAssignee);
      filtered = filtered.filter(matchesPaymentMethod);
      filtered = filtered.filter(matchesCategory);
      setFilteredRepairs(filtered);
      return;
    }

    if (filterType === 'range') {
      if (!startDate || !endDate) {
        let filtered = repairs.filter(r => !!r[dateField]);
        filtered = filtered.filter(matchesAssignee);
        filtered = filtered.filter(matchesPaymentMethod);
        filtered = filtered.filter(matchesCategory);
        setFilteredRepairs(filtered);
        return;
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      let filtered = repairs.filter(r => {
        const d = new Date(r[dateField]);
        return !!r[dateField] && d >= start && d <= end;
      });
      filtered = filtered.filter(matchesAssignee);
      filtered = filtered.filter(matchesPaymentMethod);
      filtered = filtered.filter(matchesCategory);
      setFilteredRepairs(filtered);
      return;
    }

    if (!filterDate) {
      let filtered = repairs.filter(r => !!r[dateField]);
      filtered = filtered.filter(matchesAssignee);
      filtered = filtered.filter(matchesPaymentMethod);
      filtered = filtered.filter(matchesCategory);
      setFilteredRepairs(filtered);
      return;
    }

    const dateObj = new Date(filterDate);
    let filtered = repairs.filter(r => !!r[dateField]);
    filtered = filtered.filter(matchesAssignee);
    filtered = filtered.filter(matchesPaymentMethod);
    filtered = filtered.filter(matchesCategory);

    if (filterType === 'daily') {
      filtered = filtered.filter(r => getLocalDateKey(r[dateField]) === getLocalDateKey(filterDate));
    } else if (filterType === 'monthly') {
      filtered = filtered.filter(r => {
        const d = new Date(r[dateField]);
        return d.getFullYear() === dateObj.getFullYear() && d.getMonth() === dateObj.getMonth();
      });
    } else if (filterType === 'yearly') {
      filtered = filtered.filter(r => {
        const d = new Date(r[dateField]);
        return d.getFullYear() === dateObj.getFullYear();
      });
    }

    setFilteredRepairs(filtered);
  };

  const filterExtraIncome = () => {
    const matchesCategory = (record) => {
      if (!categoryFilter) return true;
      if (!Array.isArray(record.items)) return false;
      return record.items.some(item => item.category === categoryFilter);
    };

    const matchesPaymentMethod = (record) => {
      if (!paymentMethodFilter) return true;
      if (Array.isArray(record.paymentBreakdown) && record.paymentBreakdown.length > 0) {
        return record.paymentBreakdown.some(pb => 
          pb?.method?.toLowerCase() === paymentMethodFilter.toLowerCase()
        );
      }
      return record.paymentMethod?.toLowerCase() === paymentMethodFilter.toLowerCase();
    };

    const matchesAssignee = (record) => {
      if (!assignedToFilter) return true;
      return record.assignedTo === assignedToFilter;
    };

    if (filterType === 'all') {
      let filtered = extraIncome.filter(ei => !!ei.date);
      filtered = filtered.filter(matchesAssignee);
      filtered = filtered.filter(matchesPaymentMethod);
      filtered = filtered.filter(matchesCategory);
      setFilteredExtraIncome(filtered);
      return;
    }
    

    if (filterType === 'range') {
      if (!startDate || !endDate) {
        let filtered = extraIncome.filter(ei => !!ei.date);
        filtered = filtered.filter(matchesAssignee);
        filtered = filtered.filter(matchesPaymentMethod);
        filtered = filtered.filter(matchesCategory);
        setFilteredExtraIncome(filtered);
        return;
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      let filtered = extraIncome.filter(ei => {
        const d = new Date(ei.date);
        return !!ei.date && d >= start && d <= end;
      });
      filtered = filtered.filter(matchesAssignee);
      filtered = filtered.filter(matchesPaymentMethod);
      filtered = filtered.filter(matchesCategory);
      setFilteredExtraIncome(filtered);
      return;
    }

    if (!filterDate) {
      let filtered = extraIncome.filter(ei => !!ei.date);
      filtered = filtered.filter(matchesAssignee);
      filtered = filtered.filter(matchesPaymentMethod);
      filtered = filtered.filter(matchesCategory);
      setFilteredExtraIncome(filtered);
      return;
    }

    const dateObj = new Date(filterDate);
    let filtered = extraIncome.filter(ei => !!ei.date);
    filtered = filtered.filter(matchesAssignee);
    filtered = filtered.filter(matchesPaymentMethod);
    filtered = filtered.filter(matchesCategory);

    if (filterType === 'daily') {
      filtered = filtered.filter(ei => getLocalDateKey(ei.date) === getLocalDateKey(filterDate));
    } else if (filterType === 'monthly') {
      filtered = filtered.filter(ei => {
        const d = new Date(ei.date);
        return d.getFullYear() === dateObj.getFullYear() && d.getMonth() === dateObj.getMonth();
      });
    } else if (filterType === 'yearly') {
      filtered = filtered.filter(ei => {
        const d = new Date(ei.date);
        return d.getFullYear() === dateObj.getFullYear();
      });
    }

    setFilteredExtraIncome(filtered);
  };

  const filterPayments = () => {
    const matchesCategory = (record) => {
      if (!categoryFilter) return true;
      if (!Array.isArray(record.items)) return false;
      return record.items.some(item => item.category === categoryFilter);
    };
    
    const matchesPaymentMethod = (record) => {
      if (!paymentMethodFilter) return true;
      if (Array.isArray(record.paymentMethods) && record.paymentMethods.length > 0) {
        return record.paymentMethods.some(pm => 
          pm?.method?.toLowerCase() === paymentMethodFilter.toLowerCase()
        );
      }
      return record.paymentMethod?.toLowerCase() === paymentMethodFilter.toLowerCase();
    };

    const matchesAssignee = (record) => {
      if (!assignedToFilter) return true;
      // Check root assignedTo (if exists)
      if (record.assignedTo === assignedToFilter) return true;
      // Check items[].assignedTo
      if (Array.isArray(record.items)) {
        return record.items.some(item => item.assignedTo === assignedToFilter);
      }
      return false;
    };

    if (filterType === 'all') {
      let filtered = payments.filter(p => !!p.date);
      filtered = filtered.filter(matchesAssignee);
      filtered = filtered.filter(matchesPaymentMethod);
      filtered = filtered.filter(matchesCategory);
      setFilteredPayments(filtered);
      return;
    }    

    if (filterType === 'range') {
      if (!startDate || !endDate) {
        let filtered = payments.filter(p => !!p.date);
        filtered = filtered.filter(matchesAssignee);
        filtered = filtered.filter(matchesPaymentMethod);
        filtered = filtered.filter(matchesCategory);
        setFilteredPayments(filtered);
        return;
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      let filtered = payments.filter(p => {
        const d = new Date(p.date);
        return !!p.date && d >= start && d <= end;
      });
      filtered = filtered.filter(matchesAssignee);
      filtered = filtered.filter(matchesPaymentMethod);
      filtered = filtered.filter(matchesCategory);
      setFilteredPayments(filtered);
      return;
    }

    if (!filterDate) {
      let filtered = payments.filter(p => !!p.date);
      filtered = filtered.filter(matchesAssignee);
      filtered = filtered.filter(matchesPaymentMethod);
      filtered = filtered.filter(matchesCategory);
      setFilteredPayments(filtered);
      return;
    }

    const dateObj = new Date(filterDate);
    let filtered = payments.filter(p => !!p.date);
    filtered = filtered.filter(matchesAssignee);
    filtered = filtered.filter(matchesPaymentMethod);
    filtered = filtered.filter(matchesCategory);

    if (filterType === 'daily') {
      filtered = filtered.filter(p => getLocalDateKey(p.date) === getLocalDateKey(filterDate));
    } else if (filterType === 'monthly') {
      filtered = filtered.filter(p => {
        const d = new Date(p.date);
        return d.getFullYear() === dateObj.getFullYear() && d.getMonth() === dateObj.getMonth();
      });
    } else if (filterType === 'yearly') {
      filtered = filtered.filter(p => {
        const d = new Date(p.date);
        return d.getFullYear() === dateObj.getFullYear();
      });
    }

    setFilteredPayments(filtered);
  };

  // Collect all categories from products and GRNs
  const allCategories = Array.from(new Set([
    ...products.map(p => p.category),
    ...(grnExpenses.raw ? grnExpenses.raw.flatMap(grn => grn.items.map(i => i.category)) : [])
  ].filter(Boolean)));

  // Collect all statuses from repairs
  const allStatuses = Array.from(new Set(
    repairs.map(r => r.repairStatus).filter(Boolean)
  ));

  const getLocalDateKey = (dateString) => {
    if (!dateString) return 'Unknown';
    const d = new Date(dateString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const calculateCartTotal = (cart) => {
    if (!cart || !Array.isArray(cart)) return 0;
    return cart.reduce((total, item) => total + ((Math.max(0, parseFloat(item.buyingPrice || 0))) * item.quantity), 0);
  };

  const calculateAssigneeItemTotal = (items, assignee) => {
  if (!assignee || !Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    if (item.assignedTo === assignee) {
      return sum + (item.price * item.quantity) - item.discount;
    }
    
    return sum;
  }, 0);
};

  // Calculate totals
  // const totalProductExpenses = filteredProducts
  // .filter(product => 
  //   // product.grnNumber?.toLowerCase() !== "grn-sys01"  // Exclude GRN-SYS01
  //   product.buyingPrice > 0
  // )
  // .reduce((sum, product) => {
  //   const cost = product.buyingPrice || 0;
  //   const qty = product.stock || 0;
  //   return sum + (cost * qty);
  // }, 0);

  const totalSalaryExpenses = filteredSalaries.reduce((sum, salary) => {
    return sum + (salary.advance || 0);
  }, 0);

  const totalMaintenanceExpenses = filteredMaintenance.reduce((sum, maint) => {
    return sum + (maint.price || 0);
  }, 0);

  const totalSupplierPayments = filteredSupplierPayments.reduce((sum, p) => 
    sum + (Number(p.currentPayment || 0)), 0);


  const totalCash = filteredPayments.reduce((sum, payment) => {
    if (Array.isArray(payment.paymentMethods) && payment.paymentMethods.length > 0) {
      // Sum only Cash amounts from split payments
      const cashAmount = payment.paymentMethods
        .filter(pm => pm.method?.toLowerCase() === 'cash')
        .reduce((acc, pm) => acc + (pm.amount || 0), 0);
      return sum + cashAmount ;
    } else if (payment.paymentMethod?.toLowerCase() === 'cash') {
      // Legacy: full amount
      return sum + (payment.totalAmount || 0);
    }
    return sum;
  }, 0);

  const totalCard = filteredPayments.reduce((sum, payment) => {
    if (Array.isArray(payment.paymentMethods) && payment.paymentMethods.length > 0) {
      const cardAmount = payment.paymentMethods
        .filter(pm => pm.method?.toLowerCase() === 'card')
        .reduce((acc, pm) => acc + (pm.amount || 0), 0);
      return sum + cardAmount ;
    } else if (payment.paymentMethod?.toLowerCase() === 'card') {
      return sum + (payment.totalAmount || 0);
    }
    return sum;
  }, 0);

  const totalBankTransfer = filteredPayments.reduce((sum, payment) => {
    if (Array.isArray(payment.paymentMethods) && payment.paymentMethods.length > 0) {
      const cardAmount = payment.paymentMethods
        .filter(pm => pm.method?.toLowerCase() === 'bank-transfer')
        .reduce((acc, pm) => acc + (pm.amount || 0), 0);
      return sum + cardAmount;
    } else if (payment.paymentMethod?.toLowerCase() === 'bank-transfer') {
      return sum + (payment.totalAmount || 0);
    }
    return sum;
  }, 0);

    // const totalRefund = filteredPayments
  //   .filter(p => p.paymentMethod?.toLowerCase() === 'refund')
  //   .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  const totalBankCheck = filteredPayments.reduce((sum, payment) => {
    if (Array.isArray(payment.paymentMethods) && payment.paymentMethods.length > 0) {
      const checkAmount = payment.paymentMethods
        .filter(pm => pm.method?.toLowerCase() === 'bank-check')
        .reduce((acc, pm) => acc + (pm.amount || 0), 0);
      return sum + checkAmount;
    } else if (payment.paymentMethod?.toLowerCase() === 'bank-check') {
      return sum + (payment.totalAmount || 0);
    }
    return sum;
  }, 0);

  const totalExpenses = totalSalaryExpenses + totalMaintenanceExpenses + totalSupplierPayments;

  // const totalRepairIncomewithoutReturned = filteredRepairs.reduce((sum, repair) => {
  //   return sum + (repair.totalAdditionalServicesAmount + repair.checkingCharge + repair.totalRepairCost - repair.totalDiscountAmount || 0);
  // }, 0);

  const totalRepairIncomewithoutReturned =  filteredRepairs.reduce((sum, repair) => {
    let cashAmount = 0;
    if (Array.isArray(repair.paymentBreakdown) && repair.paymentBreakdown.length > 0) {
      // Sum cash amounts from paymentBreakdown
      cashAmount = repair.paymentBreakdown
        .reduce((acc, pb) => acc + (pb.amount || 0), 0);
    } else {
      // Fallback to full amount
      cashAmount = repair.checkingCharge + repair.totalRepairCost + repair.totalAdditionalServicesAmount - repair.totalDiscountAmount;
    }
    return sum + cashAmount;
  }, 0)

  // const totalPayments = filteredPayments
  //   .reduce((sum, payment) => {
  //     const itemSum = payment.items.reduce((itemTotal, item) => {
  //       if (item.assignedTo === assignedToFilter || assignedToFilter === '') {
  //         return itemTotal + (item.price * item.quantity) - item.discount;
  //       }
  //       return itemTotal;
  //     }, 0);
  //     return sum + itemSum;
  //   }, 0);

  const totalPayments = filteredPayments.reduce((sum, payment) => {
    if (Array.isArray(payment.paymentMethods) && payment.paymentMethods.length > 0) {
      // Sum all non-credit methods
      const nonCreditAmount = payment.paymentMethods
        .filter(pm => pm.method?.toLowerCase() !== 'refund')
        .reduce((acc, pm) => acc + (pm.amount || 0), 0);
      return sum + nonCreditAmount;
    } else if (payment.paymentMethod?.toLowerCase() !== 'refund') {
      return sum + (payment.totalAmount || 0);
    }
    return sum;
  }, 0);

  const totalExtraIncome = filteredExtraIncome.reduce((sum, ei) => sum + (ei.amount || 0), 0);

  const totalAdditionalServicesAmount = filteredRepairs.reduce((sum, repair) => {
    return sum + (repair.totalAdditionalServicesAmount || 0);
  }, 0);

  const totalcheckingCharge = filteredRepairs.reduce((sum, repair) => {
    return sum + ( repair.checkingCharge  || 0);
  }, 0);

  const totalCheckingCharges = filteredRepairs.reduce((sum, repair) => {
    return sum + (repair.checkingCharge || 0);
  }, 0);

  const totalRepairCost = filteredRepairs.reduce((sum, repair) => {
    return sum + ( repair.totalRepairCost || 0);
  }, 0);

  const totalDiscountAmount = filteredRepairs.reduce((sum, repair) => {
    return sum + ( repair.totalDiscountAmount || 0);
  }, 0);

  // Helper: Is a repair paid on credit?
  const isRepairOnCredit = (repair) => {
    if (Array.isArray(repair.paymentBreakdown) && repair.paymentBreakdown.length > 0) {
      return repair.paymentBreakdown.some(pb => 
        pb.method?.toLowerCase() === 'credit'
      );
    }
    return repair.paymentMethod?.toLowerCase() === 'credit';
  };

  // Helper: Is a payment on credit?
  const isPaymentOnCredit = (payment) => {
    if (Array.isArray(payment.paymentMethods) && payment.paymentMethods.length > 0) {
      return payment.paymentMethods.some(pm => 
        pm.method?.toLowerCase() === 'credit'
      );
    }
    return payment.paymentMethod?.toLowerCase() === 'credit';
  };

  // Helper: Is an extra income record paid on credit?
  const isExtraIncomeOnCredit = (record) => {
    if (Array.isArray(record.paymentBreakdown) && record.paymentBreakdown.length > 0) {
      return record.paymentBreakdown.some(pb => 
        pb.method?.toLowerCase() === 'credit'
      );
    }
    return record.paymentMethod?.toLowerCase() === 'credit';
  };

  const creditRepairs = filteredRepairs
    .filter(isRepairOnCredit)
    .reduce((sum, repair) => {
      return sum + (
        (repair.totalAdditionalServicesAmount || 0) +
        (repair.checkingCharge || 0) +
        (repair.totalRepairCost || 0) -
        (repair.totalDiscountAmount || 0)
      );
    }, 0);

  const totalCredit = filteredPayments.reduce((sum, payment) => {
    if (Array.isArray(payment.paymentMethods) && payment.paymentMethods.length > 0) {
      const creditAmount = payment.paymentMethods
        .filter(pm => pm.method?.toLowerCase() === 'credit')
        .reduce((acc, pm) => acc + (pm.amount || 0), 0);
      return sum + creditAmount;
    } else if (payment.paymentMethod?.toLowerCase() === 'credit') {
      return sum + (payment.totalAmount || 0);
    }
    return sum;
  }, 0);

  const totalExtraCreditIncome = filteredExtraIncome
    .filter(isExtraIncomeOnCredit)
    .reduce((sum, ei) => sum + (ei.amount || 0), 0);

  const totalCartCosts = filteredRepairs.reduce((sum, repair) => {
    return sum + calculateCartTotal(repair.repairCart);
  }, 0);

  

  // Returned Extra Income: where returnAlert === "returned"
  const returnedExtraIncome = filteredExtraIncome.filter(ei => 
    ei.returnAlert === "returned"
  );

  // Total returned amount = sum of (amount - serviceCharge)
  const totalReturnedExtraIncome = returnedExtraIncome.reduce((sum, ei) => {
    const amount = ei.amount || 0;
    const serviceCharge = ei.serviceCharge || 0;
    return sum + (amount - serviceCharge);
  }, 0);

  // Returned Payments: where returnAlert === "returned"
  const returnedPayments = filteredPayments.filter(p => 
    p.returnAlert === "returned"
  );

  // Total returned amount = sum of (totalAmount - serviceCharge)
  const totalReturnedPayments = returnedPayments.reduce((sum, p) => {
    const totalAmount = p.rettotalAmount || 0;
    const serviceCharge = 0;
    return sum + (totalAmount - serviceCharge);
  }, 0);

  // Returned Repairs: where returnCart or returnedAdditionalServices exist
  const returnedRepairs = filteredRepairs.filter(repair =>
    (Array.isArray(repair.returnCart) && repair.returnCart.length > 0) ||
    (Array.isArray(repair.returnedadditionalServices) && repair.returnedadditionalServices.length > 0)
  );

  // Total returned amount = sum of:
  // - returnCart: (price * quantity) - discount
  // - returnedAdditionalServices: servicePrice
  const totalReturnedRepairs = returnedRepairs.reduce((sum, repair) => {
    let returnedAmount = 0;

    // 1. Returned parts from returnCart
    if (Array.isArray(repair.returnCart)) {
      const returnCartTotal = repair.returnCart.reduce((cartSum, item) => {
        const itemTotal = (item.sellingPrice || 0) * (item.quantity || 0);
        const discount = item.discount || 0;
        return cartSum + (itemTotal - discount);
      }, 0);
      returnedAmount += returnCartTotal;
    }

    // 2. Returned additional services
    if (Array.isArray(repair.returnedadditionalServices)) {
      const servicesTotal = repair.returnedadditionalServices.reduce((svcSum, svc) => {
        return svcSum + (svc.serviceAmount || 0);
      }, 0);
      returnedAmount += servicesTotal;
    }

    return sum + returnedAmount;
  }, 0);

  // Helper: Get actual cost of repairCart using product buyingPrice
  const calculateActualRepairCost = (repairCart, productsMap) => {
    if (!Array.isArray(repairCart)) return 0;
    return repairCart.reduce((total, item) => {
      const product = productsMap.get(item.itemCode);
      const costPerUnit = product ? product.buyingPrice || 0 : 0;
      return total + (costPerUnit * (item.quantity || 0));
    }, 0);
  };

  // Add this after your other totals
  const totalActualRepairCost = filteredRepairs.reduce((sum, repair) => {
    return sum + calculateActualRepairCost(repair.repairCart, productsMap);
  }, 0);

  // Helper: Get buying price from products by itemCode
  const getBuyingPrice = (itemCode) => {
    if (!itemCode) return 0;
    const product = products.find(p => p.itemCode === itemCode);
    return product ? (product.buyingPrice || 0) : 0;
  };

  // Add this with your other totals
  const totalPaymentRealCost = filteredPayments.reduce((sum, payment) =>
    sum + payment.items.reduce((itemSum, item) => 
      itemSum + (item.buyingPrice || 0) * (item.quantity || 0), 0
  ), 0);

  const totalPaymentProfit = filteredPayments.reduce((sum, payment) =>
    sum + payment.items.reduce((itemSum, item) => {
      const selling = (item.price || 0) * (item.quantity || 0);
      const cost = (item.buyingPrice || 0) * (item.quantity || 0);
      return itemSum + (selling - cost - (item.discount || 0));
    }, 0)
  , 0);

  const totalRepairIncome = totalRepairIncomewithoutReturned + totalReturnedRepairs;

  const totalIncome = totalRepairIncome + totalPayments + totalExtraIncome ;

  const totalCreditIncome = creditRepairs + totalCredit + totalExtraCreditIncome ;

  const totalReturnRefund = totalReturnedRepairs + totalReturnedExtraIncome + totalReturnedPayments;
  
  const netProfit = totalIncome - totalExpenses - totalReturnRefund - totalCreditIncome;
  
  // 🔹 Calculate Cash Inflows (only 'Cash' payments)
  // const cashInflows = [
  //   // 1. Repairs paid in cash
  //   ...filteredRepairs.filter(r => r.paymentMethod?.toLowerCase() === 'cash'),
  //   // 2. Item Purchases (Payments) paid in cash
  //   ...filteredPayments.filter(p => 
  //   p.paymentMethod?.toLowerCase() === 'cash' && 
  //   p.paymentMethod?.toLowerCase() !== 'refund'
  // ),
  //   // 3. Extra Income received in cash
  //   ...filteredExtraIncome.filter(ei => ei.paymentMethod?.toLowerCase() === 'cash')
  // ]
  // .reduce((sum, record) => {
  //   // Handle different amount fields
  //   if (record.finalAmount !== undefined) {
  //     return sum + record.finalAmount; // Repair
  //   } else if (record.totalAmount !== undefined) {
  //     return sum + record.totalAmount; // Payment
  //   } else if (record.amount !== undefined) {
  //     return sum + record.amount; // Extra Income
  //   }
  //   return sum;
  // }, 0);

  const cashInflows =   
    
  // 1. Repairs paid in cash
  repairs.reduce((sum, repair) => {
    let cashAmount = 0;
    if (Array.isArray(repair.paymentBreakdown) && repair.paymentBreakdown.length > 0) {
      // Sum cash amounts from paymentBreakdown
      cashAmount = repair.paymentBreakdown
        .filter(pb => pb.method?.toLowerCase() === 'cash')
        .reduce((acc, pb) => acc + (pb.amount || 0), 0);
    } else if (repair.paymentMethod?.toLowerCase() === 'cash') {
      // Fallback to full amount
      cashAmount = repair.checkingCharge + repair.totalRepairCost + repair.totalAdditionalServicesAmount - repair.totalDiscountAmount;
    }
    return sum + cashAmount;
  }, 0) -

  repairs.reduce((sum, repair) => {
    let cashAmount = 0;
    cashAmount =  repair.totalReturnCost + repair.rettotalAdditionalServicesAmount
    return sum + cashAmount;
  }, 0) +
  
  // 2. Payments paid in cash
  payments.reduce((sum, payment) => {
    let cashAmount = 0;
    
    if (Array.isArray(payment.paymentMethods) && payment.paymentMethods.length > 0) {
      // Sum cash amounts from paymentMethods
      cashAmount = payment.paymentMethods
        .filter(pm => pm.method?.toLowerCase() === 'cash')
        .reduce((acc, pm) => acc + (pm.amount || 0), 0);
    } else if (payment.paymentMethod?.toLowerCase() === 'cash') {
      // Fallback to totalAmount (exclude refunds)
      if (payment.paymentMethod?.toLowerCase() === 'cash') {
        cashAmount = payment.totalAmount || 0;
      }
    }
    return sum + cashAmount;
  }, 0) -

   payments.reduce((sum, payment) => {
    let cashAmount = 0;
    if (payment.returnAlert === "returned") {
      // Sum cash amounts from paymentMethods
      cashAmount = payment.rettotalAmount;
    } 
    return sum + cashAmount;
  }, 0) +
  
  // 3. Extra Income received in cash
  extraIncome.reduce((sum, ei) => {
    let cashAmount = 0;
    if (Array.isArray(ei.paymentBreakdown) && ei.paymentBreakdown.length > 0 ) {
      // Sum cash amounts from paymentBreakdown
      cashAmount = ei.paymentBreakdown
        .filter(pb => pb.method?.toLowerCase() === 'cash')
        .reduce((acc, pb) => acc + (pb.amount || 0), 0);
    } else if (ei.paymentMethod?.toLowerCase() === 'cash') {
      // Fallback to amount
      cashAmount = ei.amount || 0;
    }
    return sum + cashAmount;
  }, 0) - 

  extraIncome.reduce((sum, ei) => {
    let cashAmount = 0;
    if (ei.returnAlert === "returned") {
      // Sum cash amounts from paymentMethods
      cashAmount = ei.amount - ei.serviceCharge;

    }
    return sum + cashAmount;
  }, 0);

  // 🔹 Calculate Cash Outflows (only 'Cash' expenses)
  const cashOutflows = [
    // 1. Salaries paid in cash
    ...salaries.filter(s => s.paymentMethod?.toLowerCase() === 'cash'),
    // 2. Maintenance paid in cash
    ...maintenance.filter(m => m.paymentMethod?.toLowerCase() === 'cash'),
    // 3. Supplier Payments made in cash
    ...supplierPayments.filter(sp => sp.paymentMethod?.toLowerCase() === 'cash')
  ]
  .reduce((sum, expense) => {
    return sum + (expense.advance || expense.price || Number(expense.currentPayment || 0));
  }, 0);

  // ✅ Final Net Cash Flow
  const netCashFlow = cashInflows - cashOutflows;

  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Helper to style and autofit a worksheet
    function styleSheet(ws, data) {
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
        if (cell) {
          cell.s = cell.s || {};
          cell.s.font = { bold: true };
        }
      }
      const cols = Object.keys(data[0] || {}).map((key, i) => {
        const maxLen = Math.max(
          key.length,
          ...data.map(row => (row[key] ? String(row[key]).length : 0))
        );
        return { wch: maxLen + 2 };
      });
      ws['!cols'] = cols;
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    }

    // Generate base name for all sheets
    let baseName = 'Summary';
    if (filterType !== 'all') {
      if (filterType === 'daily' && filterDate) {
        const date = new Date(filterDate);
        baseName = `Summary_${date.toLocaleDateString('en-GB').replace(/\//g, '-')}`;
      } else if (filterType === 'monthly' && filterDate) {
        const date = new Date(filterDate);
        baseName = `Summary_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (filterType === 'yearly' && filterDate) {
        baseName = `Summary_${filterDate}`;
      } else if (filterType === 'range' && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        baseName = `Summary_${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}`;
      }
    }
    
    // Add category filter if present
    if (categoryFilter) {
      baseName += `_${categoryFilter}`;
    }
    
    // 1. Overview Summary Sheet
    const overviewData = [
      {
        'Metric': 'Total Income',
        'Amount (Rs.)': `Rs. ${totalIncome.toFixed(2)}`
      },
      {
        'Metric': 'Repair Jobs Income',
        'Amount (Rs.)': `Rs. ${totalRepairIncome.toFixed(2)}`
      },
      {
        'Metric': 'Extra Income',
        'Amount (Rs.)': `Rs. ${totalExtraIncome.toFixed(2)}`
      },
      {
        'Metric': 'Item Purchase',
        'Amount (Rs.)': `Rs. ${totalPayments.toFixed(2)}`
      },
      {
        'Metric': 'Total Expenses',
        'Amount (Rs.)': `Rs. ${totalExpenses.toFixed(2)}`
      },
      // {
      //   'Metric': 'Product Expenses',
      //   'Amount (Rs.)': `Rs. ${totalProductExpenses.toFixed(2)}`
      // },
      {
        'Metric': 'Salary Expenses',
        'Amount (Rs.)': `Rs. ${totalSalaryExpenses.toFixed(2)}`
      },
      {
        'Metric': 'Bills and Other Expenses',
        'Amount (Rs.)': `Rs. ${totalMaintenanceExpenses.toFixed(2)}`
      },
      {
        'Metric': 'Supplier Payments',
        'Amount (Rs.)': `Rs. ${totalSupplierPayments.toFixed(2)}`
      },
      {
        'Metric': 'Checking Charges',
        'Amount (Rs.)': `Rs. ${totalCheckingCharges.toFixed(2)}`
      },
      // {
      //   'Metric': 'Parts Cost',
      //   'Amount (Rs.)': `Rs. ${totalCartCosts.toFixed(2)}`
      // },
      {
        'Metric': 'Net Profit',
        'Amount (Rs.)': `Rs. ${netProfit.toFixed(2)}`
      },
      {
        'Metric': 'Net Cash Flow',
        'Amount (Rs.)': `Rs. ${netCashFlow.toFixed(2)}`
      }
    ];

    const overviewSheet = XLSX.utils.json_to_sheet(overviewData);
    styleSheet(overviewSheet, overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

    // 2. Product Expenses Sheet
    if (filteredProducts.length > 0) {
      const productData = filteredProducts.map(p => ({
        'Item Code': p.itemCode || '-',
        'Item Name': p.itemName || '-',
        'Category': p.category || '-',
        'Buying Price': p.buyingPrice || 0,
        'Stock': p.stock || 0,
        'Total Cost': p.buyingPrice && p.stock ? (p.buyingPrice * p.stock).toFixed(2) : '0.00',
        'Date': getLocalDateKey(p.createdAt)
      }));

      const productSheet = XLSX.utils.json_to_sheet(productData);
      styleSheet(productSheet, productData);
      XLSX.utils.book_append_sheet(workbook, productSheet, 'Product_Expenses');
    }

    // 3. Salary Expenses Sheet
    if (filteredSalaries.length > 0) {
      const salaryData = filteredSalaries.map(s => ({
        'Employee ID': s.employeeId || '-',
        'Employee Name': s.employeeName || '-',
        'Advance Amount': (s.advance || 0).toFixed(2),
        'Date': getLocalDateKey(s.date)
      }));
      
      const salarySheet = XLSX.utils.json_to_sheet(salaryData);
      styleSheet(salarySheet, salaryData);
      XLSX.utils.book_append_sheet(workbook, salarySheet, 'Salary_Expenses');
    }

    // 4. Maintenance Expenses Sheet
    if (filteredMaintenance.length > 0) {
      const maintenanceData = filteredMaintenance.map(m => ({
        'Service': m.service || '-',
        'Description': m.description || '-',
        'Price': (m.price || 0).toFixed(2),
        'Date': getLocalDateKey(m.date)
      }));
      
      const maintenanceSheet = XLSX.utils.json_to_sheet(maintenanceData);
      styleSheet(maintenanceSheet, maintenanceData);
      XLSX.utils.book_append_sheet(workbook, maintenanceSheet, 'Bills_and_Other_Expences');
    }

    // 5. Repair Income Sheet
    if (filteredRepairs.length > 0) {
      const repairData = filteredRepairs.map(r => ({
        'Customer Name': r.customerName || '-',
        'Device Type': r.deviceType || '-',
        'Final Amount': (r.finalAmount || r.totalRepairCost || 0).toFixed(2),
        'Checking Charge': (r.checkingCharge || 0).toFixed(2),
        'Parts Cost': calculateCartTotal(r.repairCart).toFixed(2),
        'Status': r.status || '-',
        'Date': getLocalDateKey(r.createdAt)
      }));
      
      const repairSheet = XLSX.utils.json_to_sheet(repairData);
      styleSheet(repairSheet, repairData);
      XLSX.utils.book_append_sheet(workbook, repairSheet, 'Repair_Income');
    }

    // 6. Extra Income Sheet
    if (filteredExtraIncome.length > 0) {
      const extraIncomeData = filteredExtraIncome.map(ei => ({
        'Description': ei.description || '-',
        'Amount': (ei.amount || 0).toFixed(2),
        'Date': getLocalDateKey(ei.date)
      }));
      
      const extraIncomeSheet = XLSX.utils.json_to_sheet(extraIncomeData);
      styleSheet(extraIncomeSheet, extraIncomeData);
      XLSX.utils.book_append_sheet(workbook, extraIncomeSheet, 'Extra_Income');
    }

    // 7. GRN Expenses Sheet (if available)
    if (filteredGrnExpenses.length > 0) {
      const grnData = filteredGrnExpenses.map(grn => ({
        'GRN Number': grn.grnNumber || '-',
        'Supplier': grn.supplierName || '-',
        'Item Name': grn.itemName || '-',
        'Item Code': grn.itemCode || '-',
        'Quantity': grn.quantity || 0,
        'Buying Price': (grn.buyingPrice || 0).toFixed(2),
        'Category': grn.category || '-',
        'Date': getLocalDateKey(grn.grnDate)
      }));
      
      const grnSheet = XLSX.utils.json_to_sheet(grnData);
      styleSheet(grnSheet, grnData);
      XLSX.utils.book_append_sheet(workbook, grnSheet, 'GRN_Expenses');
    }

    // Generate final filename
    let fileName = baseName;
    if (fileName.length > 31) {
      fileName = fileName.slice(0, 31);
    }
    
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  return (
    <div className={`product-list-container ${darkMode ? 'dark' : ''}`}> 
      <h2 className="product-list-title">All Summary</h2>
      
      {!loading && !error && (
        <div style={{ 
          background: '#e8f5e8', 
          padding: '10px', 
          marginBottom: '10px', 
          borderRadius: '5px',
          border: '1px solid #28a745',
          fontSize: '14px'
        }}>
          <strong>Data Status:</strong> Found {products.length} products, {salaries.length} salaries, {maintenance.length} maintenance bills, {repairs.length} repair jobs | 
          Showing {filteredProducts.length} filtered products, {filteredSalaries.length} filtered salaries, {filteredMaintenance.length} filtered maintenance, {filteredRepairs.length} filtered repairs
        </div>
      )}

      {/* Filter Controls */}
      {/* Filter Controls */}
    <div 
      className="summary-filters"
      style={{ 
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: darkMode ? '#2d3748' : '#f9fafb',
        borderRadius: '8px',
        border: darkMode ? '1px solid #4a5568' : '1px solid #e2e8f0',
        color: darkMode ? '#e2e8f0' : '#333'
      }}
    >
      <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
        Filters
      </h4>

      {/* Row 1: Time Filter + Date Inputs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px', alignItems: 'center' }}>
        <div>
          <label style={{ marginRight: '8px', fontWeight: '500' }}>Period:</label>
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)}
            style={{
              minWidth: '140px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: darkMode ? '1px solid #4a5568' : '1px solid #ccc',
              backgroundColor: darkMode ? '#374151' : '#fff',
              color: darkMode ? '#e2e8f0' : '#333'
            }}
          >
            <option value="all">All Time</option>
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="range">Date Range</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px', alignItems: 'center' }}>
        {filterType === 'range' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>From </span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ padding: '6px', borderRadius: '4px', border: darkMode ? '1px solid #4a5568' : '1px solid #ccc', backgroundColor: darkMode ? '#374151' : '#fff', color: darkMode ? '#e2e8f0' : '#333' }}
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={{ padding: '6px', borderRadius: '4px', border: darkMode ? '1px solid #4a5568' : '1px solid #ccc', backgroundColor: darkMode ? '#374151' : '#fff', color: darkMode ? '#e2e8f0' : '#333' }}
            />
          </div>
        ) : filterType !== 'all' && (
          <input
            type={filterType === 'yearly' ? 'number' : filterType === 'monthly' ? 'month' : 'date'}
            value={filterType === 'monthly' ? filterDate.slice(0, 7) : filterDate}
            onChange={e => {
              if (filterType === 'monthly') {
                setFilterDate(e.target.value ? e.target.value + '-01' : '');
              } else {
                setFilterDate(e.target.value);
              }
            }}
            min={filterType === 'monthly' ? '2000-01' : '2000-01-01'}
            style={{ 
              padding: '6px', 
              borderRadius: '4px', 
              border: darkMode ? '1px solid #4a5568' : '1px solid #ccc',
              backgroundColor: darkMode ? '#374151' : '#fff',
              color: darkMode ? '#e2e8f0' : '#333',
              minWidth: '140px'
            }}
          />
        )}

        {/* Date Field Toggle */}
        <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="radio"
              name="dateField"
              value="createdAt"
              checked={dateField === 'createdAt'}
              onChange={() => setDateField('createdAt')}
            />
            Created
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="radio"
              name="dateField"
              value="updatedAt"
              checked={dateField === 'updatedAt'}
              onChange={() => setDateField('updatedAt')}
            />
            Updated
          </label>
        </div>
      </div>

      {/* Row 2: Category, Status, Assignee, Payment Method */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ marginRight: '8px', fontWeight: '500' }}>Category:</label>
          <select 
            value={categoryFilter} 
            onChange={e => setCategoryFilter(e.target.value)} 
            style={{ 
              minWidth: '150px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: darkMode ? '1px solid #4a5568' : '1px solid #ccc',
              backgroundColor: darkMode ? '#374151' : '#fff',
              color: darkMode ? '#e2e8f0' : '#333'
            }}
          >
            <option value="">All</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ marginRight: '8px', fontWeight: '500' }}>Assignee:</label>
          <select
            value={assignedToFilter}
            onChange={(e) => setAssignedToFilter(e.target.value)}
            style={{
              minWidth: '150px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: darkMode ? '1px solid #4a5568' : '1px solid #ccc',
              backgroundColor: darkMode ? '#374151' : '#fff',
              color: darkMode ? '#e2e8f0' : '#333'
            }}
          >
            <option value="">All</option>
            <option value="Prabath">Prabath</option>
            <option value="Nadeesh">Nadeesh</option>
            <option value="Accessories">Accessories</option>
            <option value="Genex-EX">Genex EX</option>
            <option value="I-Device">I Device</option>
          </select>
        </div>

        <div>
          <label style={{ marginRight: '8px', fontWeight: '500' }}>Payment Method:</label>
          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            style={{
              minWidth: '150px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: darkMode ? '1px solid #4a5568' : '1px solid #ccc',
              backgroundColor: darkMode ? '#374151' : '#fff',
              color: darkMode ? '#e2e8f0' : '#333'
            }}
          >
            <option value="">All</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Bank-Transfer">Bank Transfer</option>
            <option value="Bank-Check">Bank Check</option>
            <option value="Credit">Credit</option>
          </select>
        </div>
      </div>

      {/* Export Button - Right Aligned */}
      <div style={{ textAlign: 'right' }}>
        <button 
          className="btn-report" 
          onClick={handleExportExcel}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <FontAwesomeIcon icon={faFileExcel} /> Export to Excel
        </button>
      </div>
    </div>

      {/* Tab Navigation */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: activeTab === 'overview' ? '#007bff' : (darkMode ? '#374151' : '#f8f9fa'),
            color: activeTab === 'overview' ? 'white' : (darkMode ? '#e2e8f0' : '#333'),
            border: darkMode ? '1px solid #4a5568' : '1px solid #ddd',
            borderRadius: '5px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          Overview
        </button>
        
        {/* <button 
          onClick={() => setActiveTab('expenses')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: activeTab === 'expenses' ? '#dc3545' : (darkMode ? '#374151' : '#f8f9fa'),
            color: activeTab === 'expenses' ? 'white' : (darkMode ? '#e2e8f0' : '#333'),
            border: darkMode ? '1px solid #4a5568' : '1px solid #ddd',
            borderRadius: '5px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          Expenses
        </button>
        <button 
          onClick={() => setActiveTab('income')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: activeTab === 'income' ? '#28a745' : (darkMode ? '#374151' : '#f8f9fa'),
            color: activeTab === 'income' ? 'white' : (darkMode ? '#e2e8f0' : '#333'),
            border: darkMode ? '1px solid #4a5568' : '1px solid #ddd',
            borderRadius: '5px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          Income
        </button>

        <button 
          onClick={() => setActiveTab('credit-income')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: activeTab === 'credit-income' ? '#28a745' : (darkMode ? '#374151' : '#f8f9fa'),
            color: activeTab === 'credit-income' ? 'white' : (darkMode ? '#e2e8f0' : '#333'),
            border: darkMode ? '1px solid #4a5568' : '1px solid #ddd',
            borderRadius: '5px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          Credit-Income
        </button>
        
        <button 
          onClick={() => setActiveTab('extraIncome')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'extraIncome' ? '#17a2b8' : (darkMode ? '#374151' : '#f8f9fa'),
            color: activeTab === 'extraIncome' ? 'white' : (darkMode ? '#e2e8f0' : '#333'),
            border: darkMode ? '1px solid #4a5568' : '1px solid #ddd',
            borderRadius: '5px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          Extra Income
        </button> */}
      </div>

      {loading ? (
        <p className="loading">Loading...</p>
      ) : error ? (
        <p className="error-message" style={{ color: 'red' }}>{error}</p>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ 
              background: darkMode ? '#2a2a2a' : '#f0f0f0', 
              padding: '15px', 
              borderRadius: '8px', 
              minWidth: '200px',
              border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Total Income</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalIncome.toFixed(2)}
              </p>
            </div>
            <div 
              onClick={() => setActiveTab('income')}
              style={{ 
                background: darkMode ? '#2a2a2a' : '#f0f0f0', 
                padding: '15px', 
                borderRadius: '8px', 
                minWidth: '200px',
                border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Repair Jobs Income</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalRepairIncome.toFixed(2)}
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('purchase')}
              style={{ 
                background: darkMode ? '#2a2a2a' : '#f0f0f0', 
                padding: '15px', 
                borderRadius: '8px', 
                minWidth: '200px',
                border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Invoice Incomes</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalPayments.toFixed(2)}
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('extraIncome')} 
              style={{ 
                background: darkMode ? '#2a2a2a' : '#f0f0f0', 
                padding: '15px', 
                borderRadius: '8px', 
                minWidth: '200px',
                border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Extra Other Income</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalExtraIncome.toFixed(2)}
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('incomewithbuyingproce')} 
              style={{ 
                background: darkMode ? '#2a2a2a' : '#f0f0f0', 
                padding: '15px', 
                borderRadius: '8px', 
                minWidth: '200px',
                border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Repair Jobs - Item Cost</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalActualRepairCost.toFixed(2)}
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('purchasewithitemcost')}
              style={{ 
                background: darkMode ? '#2a2a2a' : '#f0f0f0', 
                padding: '15px', 
                borderRadius: '8px', 
                minWidth: '200px',
                border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Invoice Incomes - Item Cost</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalPaymentRealCost.toFixed(2)}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div
              onClick={() => setActiveTab('purchase-refunded')} 
              style={{ 
                background: darkMode ? '#2a2a2a' : '#f0f0f0', 
                padding: '15px', 
                borderRadius: '8px', 
                minWidth: '200px',
                border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Total Retunrs</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalReturnRefund.toFixed(2)}
              </p>
            </div>

            <div
              onClick={() => setActiveTab('returnedRepairs')} 
              style={{ 
                background: darkMode ? '#2a2a2a' : '#f0f0f0', 
                padding: '15px', 
                borderRadius: '8px', 
                minWidth: '200px',
                border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Repair Jobs Incomes - Refunded </h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalReturnedRepairs.toFixed(2)}
              </p>
            </div>

            <div
              onClick={() => setActiveTab('returnedPayments')} 
              style={{ 
                background: darkMode ? '#2a2a2a' : '#f0f0f0', 
                padding: '15px', 
                borderRadius: '8px', 
                minWidth: '200px',
                border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Invoice Incomes - Refunded </h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalReturnedPayments.toFixed(2)}
              </p>
            </div>

            <div
              onClick={() => setActiveTab('returnedExtraIncome')} 
              style={{ 
                background: darkMode ? '#2a2a2a' : '#f0f0f0', 
                padding: '15px', 
                borderRadius: '8px', 
                minWidth: '200px',
                border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Extra Other Income - Refunded </h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalReturnedExtraIncome.toFixed(2)}
              </p>
            </div>

          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div
              onClick={() => setActiveTab('purchase-refunded')} 
              style={{ 
                background: darkMode ? '#2a2a2a' : '#f0f0f0', 
                padding: '15px', 
                borderRadius: '8px', 
                minWidth: '200px',
                border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Total Credits</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalCreditIncome.toFixed(2)}
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('credit-income')}
              style={{ 
                background: darkMode ? '#2a2a2a' : '#f0f0f0', 
                padding: '15px', 
                borderRadius: '8px', 
                minWidth: '200px',
                border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Repair Jobs Income - Credit</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {creditRepairs.toFixed(2)}
              </p>
            </div>

            {/* <div style={{ 
              background: darkMode ? '#2a2a2a' : '#f0f0f0', 
              padding: '15px', 
              borderRadius: '8px', 
              minWidth: '200px',
              border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Parts Cost</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalCartCosts.toFixed(2)}
              </p>
            </div> */}
            
            <div
            onClick={() => setActiveTab('purchase-credit')} 
            style={{ 
              background: darkMode ? '#2a2a2a' : '#f0f0f0', 
              padding: '15px', 
              borderRadius: '8px', 
              minWidth: '200px',
              border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Invoice Incomes - Credit</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalCredit.toFixed(2)}
              </p>
            </div>

            
            
            <div 
            onClick={() => setActiveTab('extraCreditIncome')} 
            style={{ 
              background: darkMode ? '#2a2a2a' : '#f0f0f0', 
              padding: '15px', 
              borderRadius: '8px', 
              minWidth: '200px',
              border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Extra Other Income - Credit</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalExtraCreditIncome.toFixed(2)}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div 
            onClick={() => setActiveTab('expenses')} 
            style={{ 
              background: darkMode ? '#2a2a2a' : '#f0f0f0', 
              padding: '15px', 
              borderRadius: '8px', 
              minWidth: '200px',
              border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Total Expenses</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalExpenses.toFixed(2)}
              </p>
            </div>
            {/* <div 
            onClick={() => setActiveTab('product')} 
            style={{ 
              background: darkMode ? '#2a2a2a' : '#f0f0f0', 
              padding: '15px', 
              borderRadius: '8px', 
              minWidth: '200px',
              border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Product Expenses</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalProductExpenses.toFixed(2)}
              </p>
            </div> */}

            <div 
            onClick={() => setActiveTab('salary')} 
            style={{ 
              background: darkMode ? '#2a2a2a' : '#f0f0f0', 
              padding: '15px', 
              borderRadius: '8px', 
              minWidth: '200px',
              border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Salary Expenses</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalSalaryExpenses.toFixed(2)}
              </p>
            </div>
            <div 
            onClick={() => setActiveTab('maintenance')} 
            style={{ 
              background: darkMode ? '#2a2a2a' : '#f0f0f0', 
              padding: '15px', 
              borderRadius: '8px', 
              minWidth: '200px',
              border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Bills and Other Expences</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalMaintenanceExpenses.toFixed(2)}
              </p>
            </div>
            <div 
              onClick={() => setActiveTab('supplierPayments')} 
              style={{ 
                background: darkMode ? '#2a2a2a' : '#f0f0f0', 
                padding: '15px', 
                borderRadius: '8px', 
                minWidth: '200px',
                border: darkMode ? '1px solid #444' : '1px solid #ddd',
                cursor: 'pointer'
              }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Supplier Payments</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalSupplierPayments.toFixed(2)}
              </p>
            </div>
            {/* <div style={{ 
              background: darkMode ? '#2a2a2a' : '#f0f0f0', 
              padding: '15px', 
              borderRadius: '8px', 
              minWidth: '200px',
              border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Checking Charges</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {totalCheckingCharges.toFixed(2)}
              </p>
            </div> */}
            
            <div style={{ 
              background: darkMode ? '#2a2a2a' : '#f0f0f0', 
              padding: '15px', 
              borderRadius: '8px', 
              minWidth: '200px',
              border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Net Profit</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {netProfit.toFixed(2)}
              </p>
            </div>
            <div style={{ 
              background: darkMode ? '#2a2a2a' : '#f0f0f0', 
              padding: '15px', 
              borderRadius: '8px', 
              minWidth: '200px',
              border: darkMode ? '1px solid #444' : '1px solid #ddd'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: darkMode ? '#fff' : '#333' }}>Net Cash Flow</h4>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                Rs. {netCashFlow.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>

              {/* Summary Table */}
              <table className={`product-table ${darkMode ? 'dark' : ''}`}>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Amount</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total Income</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. {totalIncome.toFixed(2)}</td>
                    <td>Total revenue from repair jobs, items purchase and extra income</td>
                  </tr>
                  <tr>
                    <td>Repair Jobs Income</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. {totalRepairIncome.toFixed(2)}</td>
                    <td>Total revenue from repair jobs</td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '20px' }}>• Additional Service Amounts</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. { totalAdditionalServicesAmount.toFixed(2)}</td>
                    <td>Total Additional Service Charges</td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '20px' }}>• Checking Charges</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. { totalcheckingCharge.toFixed(2)}</td>
                    <td>Total Checking Charges</td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '20px' }}>• Repair Cart Items</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. { totalRepairCost.toFixed(2)}</td>
                    <td>Total Repair Cart Items Charges</td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '20px' }}>• Discounts</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. { totalDiscountAmount.toFixed(2)}</td>
                    <td>Total Discounts</td>
                  </tr>
                  <tr>
                    <td>Invoice Incomes</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. { totalPayments.toFixed(2)}</td>
                    <td>Income from purchased Items</td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '20px' }}>• Cash Payments</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. { totalCash.toFixed(2)}</td>
                    <td>Income from Cash Payments of purchased Items</td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '20px' }}>• Card Payments</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. { totalCard.toFixed(2)}</td>
                    <td>Income from Card Payments of purchased Items</td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '20px' }}>• Bank Transfer</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. { totalBankTransfer.toFixed(2)}</td>
                    <td>Income from Bank Transfers of purchased Items</td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '20px' }}>• Bank Checks</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. { totalBankCheck.toFixed(2)}</td>
                    <td>Income from Bank Checks of purchased Items</td>
                  </tr>
                  {/* <tr>
                    <td style={{ paddingLeft: '20px' }}>• Return Purchase</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. { totalRefund.toFixed(2)}</td>
                    <td>Cost from return purchased Items</td>
                  </tr> */}
                  <tr>
                    <td>Invoices - Credit</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. { totalCredit.toFixed(2)}</td>
                    <td>Credit from purchased Items</td>
                  </tr>
                  <tr>
                    <td>Extra Income</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. {totalExtraIncome.toFixed(2)}</td>
                    <td>Other income (not from repairs and item purchase)</td>
                  </tr>
                  <tr>
                    <td>Total Expenses</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. {totalExpenses.toFixed(2)}</td>
                    <td>Total of all expenses (products + salaries + bills and other expences)</td>
                  </tr>
                  {/* <tr>
                    <td style={{ paddingLeft: '20px' }}>• Product Expenses</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. {totalProductExpenses.toFixed(2)}</td>
                    <td>Cost of products, parts, and stock</td>
                  </tr> */}
                  <tr>
                    <td style={{ paddingLeft: '20px' }}>• Salary Expenses</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. {totalSalaryExpenses.toFixed(2)}</td>
                    <td>Employee salary advances and payments</td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '20px' }}>• Bills and Other Expences</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. {totalMaintenanceExpenses.toFixed(2)}</td>
                    <td>Service bills and maintenance costs</td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '20px' }}>• Supplier Payments</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. {totalSupplierPayments.toFixed(2)}</td>
                    <td>All bills payments for suppliers</td>
                  </tr>
                  
                  <tr>
                    <td>Checking Charges</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. {totalCheckingCharges.toFixed(2)}</td>
                    <td>Diagnostic charges collected</td>
                  </tr>
                  {/* <tr>
                    <td>Parts Cost</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. {totalCartCosts.toFixed(2)}</td>
                    <td>Cost of parts used in repairs</td>
                  </tr> */}
                  <tr>
                    <td>Net Profit</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>Rs. {netProfit.toFixed(2)}</td>
                    <td>Income minus parts cost</td>
                  </tr>
                  <tr>
                    <td>Net Cash Flow</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>
                      Rs. {netCashFlow.toFixed(2)}
                    </td>
                    <td>Income minus total expenses</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Expenses Tab */}
          {activeTab === 'expenses' && (
            <table className={`product-table ${darkMode ? 'dark' : ''}`}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Amount (Expense)</th>
                  <th>Description</th>
                  <th>Category/Service</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 && filteredSalaries.length === 0 && filteredMaintenance.length === 0 ? (
                  <tr><td colSpan={6} className="no-products">No expenses found.</td></tr>
                ) : (
                  <>
                    {/* Product Expenses */}
                    {filteredProducts.map((p, idx) => (
                      <tr key={`product-${p._id || idx}`}>
                        <td>Product</td>
                        <td>{p.itemCode || '-'}</td>
                        
                        <td style={{ color: '#000' }}>Rs. {p.buyingPrice && p.stock ? (p.buyingPrice * p.stock).toFixed(2) : '-'}</td>
                        <td>{p.itemName || '-'}</td>
                        <td>{p.category || '-'}</td>
                        <td>{getLocalDateKey(p.createdAt)}</td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', borderTop: '2px solid #000' }}>
                      <td colSpan="3" style={{ textAlign: 'right' }}>
                        Total Product Expense:
                      </td>
                      <td style={{ color: '#000' }}>
                        Rs.{' '}
                        {filteredProducts
                          .reduce((sum, p) => {
                            const cost = (p.buyingPrice || 0) * (p.stock || 0);
                            return sum + cost;
                          }, 0)
                          .toFixed(2)}
                      </td>
                      <td colSpan="3" style={{ textAlign: 'left', fontStyle: 'italic', color: '#555' }}>
                        &nbsp; (Include SYS GRNS)
                      </td>
                    </tr>
                    {/* Salary Expenses */}
                    {filteredSalaries.map((s, idx) => (
                      <tr key={`salary-${s._id || idx}`}>
                        <td>Salary</td>
                        <td>{s.employeeId || '-'}</td>
                        <td style={{ color: '#000' }}>Rs. {(s.advance || 0).toFixed(2)}</td>
                        <td>{s.employeeName || '-'}</td>
                        <td>Salary Advance</td>
                        <td>{getLocalDateKey(s.date)}</td>
                      </tr>
                    ))}
                    {/* Maintenance Expenses */}
                    {filteredMaintenance.map((m, idx) => (
                      <tr key={`maintenance-${m._id || idx}`}>
                        <td>Bills and Other </td>
                        <td>{m.no || '-'}</td>
                        <td style={{ color: '#000' }}>Rs. {(m.price || 0).toFixed(2)}</td>
                        <td>{m.remarks || '-'}</td>
                        <td>{m.serviceType || '-'}</td>
                        <td>{getLocalDateKey(m.date)}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          )}

          {/* Product Tab */}
          {activeTab === 'product' && (
            <table className={`product-table ${darkMode ? 'dark' : ''}`}>
              <thead>
                <tr>
                  <th>GRN</th>
                  <th>Reference</th>
                  <th>Buying Price * Qty</th>
                  <th>Amount (Expense)</th>
                  <th>Description</th>
                  <th>Category/Service</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 && filteredSalaries.length === 0 && filteredMaintenance.length === 0 ? (
                  <tr><td colSpan={6} className="no-products">No expenses found.</td></tr>
                ) : (
                  <>
                    {/* Product Expenses */}
                    {filteredProducts.filter(p => p.buyingPrice > 0 ).map((p, idx) => (
                      <>
                      <tr key={`product-${p._id || idx}`}>
                        <td>{p.grnNumber || '-'}</td>
                        <td>{p.itemCode || '-'}</td>
                        <td style={{ color: '#000' }}>Rs. {p.buyingPrice ? (p.buyingPrice).toFixed(2) : '0.00'} * {p.stock ? (p.stock) : '-'}</td>
                        <td style={{ color: '#000' }}>Rs. {p.buyingPrice && p.stock ? (p.buyingPrice * p.stock).toFixed(2) : '0.00'}</td>
                        <td>{p.itemName || '-'}</td>
                        <td>{p.category || '-'}</td>
                        <td>{getLocalDateKey(p.createdAt)}</td>
                      </tr>
                      <tr>

                      </tr>
                      </>
                    ))}
                    {/* Total Row */}
                    <tr style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', borderTop: '2px solid #000' }}>
                      <td colSpan="3" style={{ textAlign: 'right' }}>
                        Total Product Expense:
                      </td>
                      <td style={{ color: '#000' }}>
                        Rs.{' '}
                        {filteredProducts
                          // .filter(p => p.grnNumber?.toLowerCase() !== 'grn-sys01')
                          .filter(p => p.buyingPrice > 0 )
                          .reduce((sum, p) => {
                            const cost = (p.buyingPrice || 0) * (p.stock || 0);
                            return sum + cost;
                          }, 0)
                          .toFixed(2)}
                      </td>
                      <td colSpan="3" style={{ textAlign: 'left', fontStyle: 'italic', color: '#555' }}>
                        &nbsp; (Excludes SYS GRNS)
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          )}

          {/* Salary Tab */}
          {activeTab === 'salary' && (
            <table className={`product-table ${darkMode ? 'dark' : ''}`}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Amount (Expense)</th>
                  <th>Description</th>
                  <th>Category/Service</th>
                  <th>Payment Method</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 && filteredSalaries.length === 0 && filteredMaintenance.length === 0 ? (
                  <tr><td colSpan={6} className="no-products">No expenses found.</td></tr>
                ) : (
                  <>
                    {/* Salary Expenses */}
                    {filteredSalaries.map((s, idx) => (
                      <tr key={`salary-${s._id || idx}`}>
                        <td>Salary</td>
                        <td>{s.employeeId || '-'}</td>
                        <td style={{ color: '#000' }}>Rs. {(s.advance || 0).toFixed(2)}</td>
                        <td>{s.employeeName || '-'}</td>
                        <td>Salary Advance</td>
                        <td>{s.paymentMethod || 'N/A'}</td>
                        <td>{getLocalDateKey(s.date)}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <table className={`product-table ${darkMode ? 'dark' : ''}`}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Amount (Expense)</th>
                  <th>Description</th>
                  <th>Category/Service</th>
                  <th>Payment Method</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 && filteredSalaries.length === 0 && filteredMaintenance.length === 0 ? (
                  <tr><td colSpan={6} className="no-products">No expenses found.</td></tr>
                ) : (
                  <>
                    
                    {/* Maintenance Expenses */}
                    {filteredMaintenance.map((m, idx) => (
                      <tr key={`maintenance-${m._id || idx}`}>
                        <td>Bills and Other</td>
                        <td>{m.no || '-'}</td>
                        <td style={{ color: '#000' }}>Rs. {(m.price || 0).toFixed(2)}</td>
                        <td>{m.remarks || '-'}</td>
                        <td>{m.serviceType || '-'}</td>
                        <td>{m.paymentMethod || 'N/A'}</td>
                        <td>{getLocalDateKey(m.date)}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          )}

          {/* Supplier Payments Tab */}
          {activeTab === 'supplierPayments' && (
            <table className={`product-table ${darkMode ? 'dark' : ''}`}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Up-to-Date Cost</th>
                  <th>Current Payment</th>
                  <th>Amount Due</th>
                  {/* <th>Assigned To</th> */}
                  <th>Payment Method</th>
                </tr>
              </thead>
              <tbody>
                {filteredSupplierPayments.length === 0 ? (
                  <tr><td colSpan={7} className="no-products">No supplier payments found.</td></tr>
                ) : (
                  filteredSupplierPayments.map((p, idx) => (
                    <tr key={p._id || idx}>
                      <td>{getLocalDateKey(p.date)}</td>
                      <td>{p.supplierName || '-'}</td>
                      <td style={{ color: '#000' }}>
                        Rs. {Number(p.uptodateCost || 0).toFixed(2)}
                      </td>
                      <td style={{ color: '#000' }}>
                        Rs. {Number(p.currentPayment || 0).toFixed(2)}
                      </td>
                      <td style={{ color: '#000' }}>
                        Rs. {Number(p.amountDue || 0).toFixed(2)}
                      </td>
                      {/* <td>{p.assignedTo || 'N/A'}</td> */}
                      <td>{p.paymentMethod || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* Income Tab */}
          {activeTab === 'income' && (
            <table className={`product-table ${darkMode ? 'dark' : ''}`}>
              <thead>
                <tr>
                  <th>Job Number</th>
                  <th>Customer Name</th>
                  <th>Device Type</th>
                  <th>Issue Description</th>
                  <th>Checking Charge</th>
                  <th>Cart Total</th>
                  <th>Total Repair Cost</th>
                  <th>Additional Service</th>
                  <th>Discount</th>
                  <th>Final Amount</th>
                  <th>Status</th>
                  {/* <th>Created Date</th>
                  <th>Last Updated</th> */}
                </tr>
              </thead>
              <tbody>
                {filteredRepairs.length === 0 ? (
                  <tr><td colSpan={11} className="no-products">No income found.</td></tr>
                ) : (
                  filteredRepairs.map((r, idx) => (
                    <tr key={r._id || idx}>
                      <td>{r.repairInvoice || r.repairCode || '-'}</td>
                      <td>{r.customerName || '-'}</td>
                      <td>{r.deviceType || r.itemName || '-'}</td>
                      <td>{r.issueDescription || '-'}</td>
                      <td style={{ color: '#000' }}>Rs. {(r.checkingCharge || 0).toFixed(2)}</td>
                      <td style={{ color: '#000' }}>Rs. {(r.totalRepairCost || 0).toFixed(2)}</td>
                      <td style={{ color: '#000' }}>Rs. {calculateCartTotal(r.repairCart).toFixed(2)}</td>
                      <td style={{ color: '#000' }}>Rs. {(r.totalAdditionalServicesAmount || 0).toFixed(2)}</td>
                      <td style={{ color: '#000' }}>Rs. {(r.totalDiscountAmount || 0).toFixed(2)}</td>
                      <td style={{ color: '#000' }}>Rs. {(r.finalAmount || r.totalRepairCost || 0).toFixed(2)}</td>
                      <td>{r.repairStatus || '-'}</td>
                      {/* <td>{getLocalDateKey(r.createdAt)}</td>
                      <td>{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '-'}</td> */}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          
            {/* Income Tab */}
          {activeTab === 'incomewithbuyingproce' && (
            <table className={`product-table ${darkMode ? 'dark' : ''}`}>
              <thead>
                <tr>
                  <th>Job No</th>
                  <th>Customer</th>
                  <th>Device</th>
                  <th>Issue</th>
                  <th>Real Cost<br/>(Repair Parts)</th>
                  <th>Returned Cost</th>
                  {/* <th>Net Cost</th> */}
                  <th>Final Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRepairs.filter(p => p.paymentMethod?.toLowerCase() !== 'credit').length === 0 ? (
                  <tr><td colSpan={9} className="no-products">No income found.</td></tr>
                ) : (
                  filteredRepairs
                    .map((r, idx) => {
                      // Calculate real cost from repairCart
                      const realCost = Array.isArray(r.repairCart)
                        ? r.repairCart.reduce((sum, item) => {
                            const bp = getBuyingPrice(item.itemCode);
                            
                            return sum + (bp * (item.quantity || 0));
                          }, 0)
                        : 0;

                      // Calculate returned cost from returnCart
                      const returnedCost = Array.isArray(r.returnCart)
                        ? r.returnCart.reduce((sum, item) => {
                            const bp = getBuyingPrice(item.itemCode);
                            console.log("returnCart",item.itemCode, bp, item.quantity)
                            return sum + (bp * (item.quantity || 0));
                          }, 0)
                        : 0;

                      const netCost = realCost - returnedCost;

                      return (
                        <tr key={r._id || idx}>
                          <td>{r.repairInvoice || r.repairCode || '-'}</td>
                          <td>{r.customerName || '-'}</td>
                          <td>{r.deviceType || r.itemName || '-'}</td>
                          <td>{r.issueDescription || '-'}</td>
                          <td style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                            Rs. {realCost.toFixed(2)}
                          </td>
                          <td style={{ color: '#1976d2', fontWeight: 'bold' }}>
                            Rs. {returnedCost.toFixed(2)}
                          </td>
                          {/* <td style={{ color: '#000', fontWeight: 'bold' }}>
                            Rs. {netCost.toFixed(2)}
                          </td> */}
                          <td style={{ color: '#000' }}>
                            Rs. {(r.finalAmount || r.totalRepairCost || 0).toFixed(2)}
                          </td>
                          <td>{r.repairStatus || '-'}</td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          )}

            {/* Purchase Tab */}
          {activeTab === 'purchasewithitemcost' && (
            <table className={`product-table ${darkMode ? 'dark' : ''}`}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>INV No</th>
                  <th>Item Name</th>
                  <th>Qty</th>
                  <th>Selling Price</th>
                  <th>Real Cost</th>
                  <th>Profit</th>
                  <th>Discount</th>
                  <th>Total Amount</th>
                  <th>Payment Method</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr><td colSpan={11} className="no-products">No payments found.</td></tr>
                ) : (
                  filteredPayments.flatMap(payment =>
                    payment.items.map((item, itemIdx) => {
                      const selling = (item.price || 0) * (item.quantity || 0);
                      const cost = (item.buyingPrice || 0) * (item.quantity || 0);
                      const profit = selling - cost - (item.discount || 0);

                      return (
                        <tr key={`${payment._id}-item-${itemIdx}`}>
                          {itemIdx === 0 && (
                            <>
                              <td rowSpan={payment.items.length}>
                                {new Date(payment.date).toLocaleDateString()}
                              </td>
                              <td rowSpan={payment.items.length}>
                                {new Date(payment.date).toLocaleTimeString()}
                              </td>
                              <td rowSpan={payment.items.length}>
                                {payment.invoiceNumber}
                              </td>
                            </>
                          )}
                          <td>{item.itemName || '-'}</td>
                          <td>{item.quantity || 0}</td>
                          <td style={{ color: '#000' }}>Rs. {selling.toFixed(2)}</td>
                          <td style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                            Rs. {cost.toFixed(2)}
                          </td>
                          <td style={{ color: '#1976d2', fontWeight: 'bold' }}>
                            Rs. {profit.toFixed(2)}
                          </td>
                          <td>Rs. {(item.discount || 0).toFixed(2)}</td>
                          {itemIdx === 0 && (
                            <>
                              <td rowSpan={payment.items.length}>
                                Rs. {payment.totalAmount.toFixed(2)}
                              </td>
                              <td rowSpan={payment.items.length}>
                                {payment.paymentMethod || '—'}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )
                )}
              </tbody>
            </table>
          )}
          
          

          {/* Income Credit Tab */}
          {activeTab === 'credit-income' && (
            <table className={`product-table ${darkMode ? 'dark' : ''}`}>
              <thead>
                <tr>
                  <th>Job Number</th>
                  <th>Customer Name</th>
                  <th>Device Type</th>
                  <th>Issue Description</th>
                  <th>Checking Charge</th>
                  <th>Cart Total</th>
                  <th>Total Repair Cost</th>
                  <th>Additional Service</th>
                  <th>Discount</th>
                  <th>Final Amount</th>
                  <th>Status</th>
                  {/* <th>Created Date</th>
                  <th>Last Updated</th> */}
                </tr>
              </thead>
              <tbody>
                {filteredRepairs.filter(isRepairOnCredit).length === 0 ? (
                  <tr><td colSpan={11} className="no-products">No income found.</td></tr>
                ) : (
                  filteredRepairs.filter(isRepairOnCredit).map((r, idx) => (
                    <tr key={r._id || idx}>
                      <td>{r.repairInvoice || r.repairCode || '-'}</td>
                      <td>{r.customerName || '-'}</td>
                      <td>{r.deviceType || r.itemName || '-'}</td>
                      <td>{r.issueDescription || '-'}</td>
                      <td style={{ color: '#000' }}>Rs. {(r.checkingCharge || 0).toFixed(2)}</td>
                      <td style={{ color: '#000' }}>Rs. {(r.totalRepairCost || 0).toFixed(2)}</td>
                      <td style={{ color: '#000' }}>Rs. {calculateCartTotal(r.repairCart).toFixed(2)}</td>
                      <td style={{ color: '#000' }}>Rs. {(r.totalAdditionalServicesAmount || 0).toFixed(2)}</td>
                      <td style={{ color: '#000' }}>Rs. {(r.totalDiscountAmount || 0).toFixed(2)}</td>
                      <td style={{ color: '#000' }}>Rs. {(r.finalAmount || r.totalRepairCost || 0).toFixed(2)}</td>
                      <td>{r.repairStatus || '-'}</td>
                      {/* <td>{getLocalDateKey(r.createdAt)}</td>
                      <td>{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '-'}</td> */}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* Purchase Tab */}
          {activeTab === 'purchase' && (
            <table className={`product-table ${darkMode ? 'dark' : ''}`}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time </th>
                  <th>INV No </th>
                  <th>Items </th>
                  {/* Show Assignee Amount column only when filtering by assignee */}
                  {assignedToFilter && (
                  <th style={{ color: '#007bff', fontWeight: 'bold' }}>
                    {assignedToFilter ? `${assignedToFilter}'s Amount` : 'Assignee Amount'}
                  </th>
                  )}
                  <th>Discount</th>
                  <th>Total Amount</th>
                  <th>Payment Method</th>
                  {/* <th>Created Date</th>
                  <th>Last Updated</th> */}
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr><td colSpan={11} className="no-products">No income found.</td></tr>
                ) : (
                  filteredPayments
                    .map((payment, idx) => {
                      // Calculate only items assigned to current assignee
                      const assigneeAmount = assignedToFilter
                        ? calculateAssigneeItemTotal(payment.items, assignedToFilter)
                        : 0;

                      return (
                      <tr key={payment._id || idx}>
                        <td>{new Date(payment.date).toLocaleDateString()}</td>
                        <td>{new Date(payment.date).toLocaleTimeString()}</td>
                        <td>{payment.invoiceNumber}</td>
                        <td>{/* Combine all item names */}
                          {payment.items.map(item => item.itemName).join(', ')}
                        </td>
                        {/* <td> */}
                          {/* Combine quantities */}
                          {/* {payment.items.map(item => item.quantity).join(', ')} */}
                        {/* </td> */}
                        {/* <td>{payment.cashierName}</td> */}
                        {/* Show Assignee Amount only when filtering */}
                        {assignedToFilter && (
                          <td style={{ color: '#007bff', fontWeight: 'bold' }}>
                            Rs. {assigneeAmount.toFixed(2)}
                          </td>
                        )}
                        <td>Rs. {(payment.discountApplied || 0).toFixed(2)}</td>
                        <td>Rs. {payment.totalAmount.toFixed(2)}</td>
                        <td>{payment.paymentMethod}</td>
                        {/* <td>{getLocalDateKey(r.createdAt)}</td>
                        <td>{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '-'}</td> */}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* Purchase Credit Tab */}
          {activeTab === 'purchase-credit' && (
            <table className={`product-table ${darkMode ? 'dark' : ''}`}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time </th>
                  <th>INV No </th>
                  <th>Items </th>
                  {assignedToFilter && (
                  <th style={{ color: '#007bff', fontWeight: 'bold' }}>
                    {assignedToFilter ? `${assignedToFilter}'s Amount` : 'Assignee Amount'}
                  </th>
                  )}
                  <th>Discount</th>
                  <th>Total Amount</th>
                  <th>Payment Method</th>
                  {/* <th>Created Date</th>
                  <th>Last Updated</th> */}
                </tr>
              </thead>
              <tbody>
                {filteredPayments.filter(isPaymentOnCredit).length === 0 ? (
                  <tr><td colSpan={11} className="no-products">No income found.</td></tr>
                ) : (
                  filteredPayments.filter(isPaymentOnCredit).map((payment, idx) => {
                      // Calculate only items assigned to current assignee
                      const assigneeAmount = assignedToFilter
                        ? calculateAssigneeItemTotal(payment.items, assignedToFilter)
                        : 0;

                      return (
                      <tr key={payment._id || idx}>
                        <td>{new Date(payment.date).toLocaleDateString()}</td>
                        <td>{new Date(payment.date).toLocaleTimeString()}</td>
                        <td>{payment.invoiceNumber}</td>
                        <td>{/* Combine all item names */}
                          {payment.items.map(item => item.itemName).join(', ')}
                        </td>
                        {/* <td> */}
                          {/* Combine quantities */}
                          {/* {payment.items.map(item => item.quantity).join(', ')} */}
                        {/* </td> */}
                        {/* <td>{payment.cashierName}</td> */}
                        {assignedToFilter && (
                          <td style={{ color: '#007bff', fontWeight: 'bold' }}>
                            Rs. {assigneeAmount.toFixed(2)}
                          </td>
                        )}
                        <td>Rs. {(payment.discountApplied || 0).toFixed(2)}</td>
                        <td>Rs. {payment.totalAmount.toFixed(2)}</td>
                        <td>{payment.paymentMethod}</td>
                        {/* <td>{getLocalDateKey(r.createdAt)}</td>
                        <td>{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '-'}</td> */}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* Purchase Credit Tab */}
          {activeTab === 'purchase-refunded' && (
            <table className={`product-table ${darkMode ? 'dark' : ''}`}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time </th>
                  <th>INV No </th>
                  <th>Items </th>
                  <th>Discount</th>
                  <th>Total Amount</th>
                  <th>Payment Method</th>
                  {/* <th>Created Date</th>
                  <th>Last Updated</th> */}
                </tr>
              </thead>
              <tbody>
                {filteredPayments.filter(p => p.paymentMethod?.toLowerCase() === 'refund').length === 0 ? (
                  <tr><td colSpan={11} className="no-products">No income found.</td></tr>
                ) : (
                  filteredPayments.filter(p => p.paymentMethod?.toLowerCase() === 'refund').map((payment, idx) => (
                    <tr key={payment._id || idx}>
                      <td>{new Date(payment.date).toLocaleDateString()}</td>
                      <td>{new Date(payment.date).toLocaleTimeString()}</td>
                      <td>{payment.invoiceNumber}</td>
                      <td>{/* Combine all item names */}
                        {payment.items.map(item => item.itemName).join(', ')}
                      </td>
                      {/* <td> */}
                        {/* Combine quantities */}
                        {/* {payment.items.map(item => item.quantity).join(', ')} */}
                      {/* </td> */}
                      {/* <td>{payment.cashierName}</td> */}
                      <td>Rs. {(payment.discountApplied || 0).toFixed(2)}</td>
                      <td>Rs. {payment.totalAmount.toFixed(2)}</td>
                      <td>{payment.paymentMethod}</td>
                      {/* <td>{getLocalDateKey(r.createdAt)}</td>
                      <td>{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '-'}</td> */}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}        

          {/* Returned Extra Income Tab */}
          {activeTab === 'returnedExtraIncome' && (
            <table className={`product-table ${darkMode ? 'dark' : ''}`}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Original Amount</th>
                  <th>Service Charge</th>
                  <th>Returned Amount</th>
                  <th>Income Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {returnedExtraIncome.length === 0 ? (
                  <tr><td colSpan={6} className="no-products">No returned extra income found.</td></tr>
                ) : (
                  returnedExtraIncome.map((ei, idx) => {
                    const originalAmount = ei.amount || 0;
                    const serviceCharge = ei.serviceCharge || 0;
                    const returnedAmount = originalAmount - serviceCharge;
                    return (
                      <tr key={ei._id || idx}>
                        <td>{ei.date ? new Date(ei.date).toLocaleDateString() : '-'}</td>
                        <td style={{ color: '#000' }}>Rs. {originalAmount.toFixed(2)}</td>
                        <td style={{ color: '#d32f2f' }}>Rs. {serviceCharge.toFixed(2)}</td>
                        <td style={{ color: '#1976d2', fontWeight: 'bold' }}>Rs. {returnedAmount.toFixed(2)}</td>
                        <td>{ei.incomeType || '-'}</td>
                        <td>{ei.description || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}    

          {/* Returned Payments Tab */}
          {activeTab === 'returnedPayments' && (
            <table className={`product-table ${darkMode ? 'dark' : ''}`}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice No.</th>
                  <th>Original Amount</th>
                  <th>Service Charge</th>
                  <th>Returned Amount</th>
                  <th>Items</th>
                </tr>
              </thead>
              <tbody>
                {returnedPayments.length === 0 ? (
                  <tr><td colSpan={6} className="no-products">No returned payments found.</td></tr>
                ) : (
                  returnedPayments.map((p, idx) => {
                    const originalAmount = p.totalAmount || 0;
                    const serviceCharge = p.serviceCharge || 0;
                    const returnedAmount = originalAmount - serviceCharge;
                    return (
                      <tr key={p._id || idx}>
                        <td>{p.date ? new Date(p.date).toLocaleDateString() : '-'}</td>
                        <td>{p.invoiceNumber || '-'}</td>
                        <td style={{ color: '#000' }}>Rs. {originalAmount.toFixed(2)}</td>
                        <td style={{ color: '#d32f2f' }}>Rs. {serviceCharge.toFixed(2)}</td>
                        <td style={{ color: '#1976d2', fontWeight: 'bold' }}>Rs. {p.rettotalAmount.toFixed(2)}</td>
                        <td style={{ 
                            whiteSpace: 'normal', 
                            wordWrap: 'break-word', 
                            maxWidth: '200px' // optional: limit width to force wrap
                          }}>
                            {p.items
                          .filter(item => item.retquantity > 0 && !(item.givenQty > 0))
                          .map(item => `${item.itemName} (${item.category || 'No Category'})`)
                          .join(', ')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* Returned Repairs Tab */}
          {activeTab === 'returnedRepairs' && (
            <table className={`product-table ${darkMode ? 'dark' : ''}`}>
              <thead>
                <tr>
                  <th>Job No</th>
                  <th>Customer</th>
                  <th>Returned Parts</th>
                  <th>Returned Services</th>
                  <th>Returned Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {returnedRepairs.length === 0 ? (
                  <tr><td colSpan={6} className="no-products">No returned repairs found.</td></tr>
                ) : (
                  returnedRepairs.map((repair, idx) => {
                    // Calculate returned parts amount
                    const returnCartAmount = Array.isArray(repair.returnCart)
                      ? repair.returnCart.reduce((sum, item) => {
                          return sum + ((item.sellingPrice || 0) * (item.quantity || 0) - (item.discount || 0));
                        }, 0)
                      : 0;

                    // Calculate returned services amount
                    const servicesAmount = Array.isArray(repair.returnedadditionalServices)
                      ? repair.returnedadditionalServices.reduce((sum, svc) => sum + (svc.serviceAmount || 0), 0)
                      : 0;

                    const totalReturned = returnCartAmount + servicesAmount;

                    return (
                      <tr key={repair._id || idx}>
                        <td>{repair.repairInvoice || repair.repairCode || '-'}</td>
                        <td>{repair.customerName || '-'}</td>
                        <td style={{ 
                            whiteSpace: 'normal', 
                            wordWrap: 'break-word', 
                            maxWidth: '200px' // optional: limit width to force wrap
                          }}>
                          {Array.isArray(repair.returnCart) && repair.returnCart.length > 0 ? (
                            repair.returnCart.map((item, i) => (
                              <div key={i}>
                                {item.itemName} ({item.quantity} × Rs. {item.sellingPrice}) 
                                {item.discount > 0 && ` - Disc: Rs. ${item.discount}`}
                              </div>
                            ))
                          ) : '—'}
                        </td>
                        <td style={{ 
                            whiteSpace: 'normal', 
                            wordWrap: 'break-word', 
                            maxWidth: '200px' // optional: limit width to force wrap
                          }}>
                          {Array.isArray(repair.returnedadditionalServices) && repair.returnedadditionalServices.length > 0 ? (
                            repair.returnedadditionalServices.map((svc, i) => (
                              <div key={i}>{svc.serviceName}: Rs. {svc.serviceAmount}</div>
                            ))
                          ) : '—'}
                        </td>
                        <td style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                          Rs. {totalReturned.toFixed(2)}
                        </td>
                        <td>{repair.createdAt ? new Date(repair.createdAt).toLocaleDateString() : '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* Extra Income Tab */}
          {activeTab === 'extraIncome' && (
            <table className={`product-table ${darkMode ? 'dark' : ''}`}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Income Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredExtraIncome.length === 0 ? (
                  <tr><td colSpan={4} className="no-products">No extra income found.</td></tr>
                ) : (
                  filteredExtraIncome.map((ei, idx) => (
                    <tr key={ei._id || idx}>
                      <td>{ei.date ? new Date(ei.date).toLocaleDateString() : '-'}</td>
                      <td style={{ color: '#000' }}>Rs. {(ei.amount || 0).toFixed(2)}</td>
                      <td>{ei.incomeType || '-'}</td>
                      <td>{ei.description || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* Extra Credit Income Tab */}
          {activeTab === 'extraCreditIncome' && (
            <table className={`product-table ${darkMode ? 'dark' : ''}`}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Income Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredExtraIncome.filter(isExtraIncomeOnCredit).length === 0 ? (
                  <tr><td colSpan={4} className="no-products">No extra income found.</td></tr>
                ) : (
                  filteredExtraIncome.filter(isExtraIncomeOnCredit).map((ei, idx) => (
                    <tr key={ei._id || idx}>
                      <td>{ei.date ? new Date(ei.date).toLocaleDateString() : '-'}</td>
                      <td style={{ color: '#000' }}>Rs. {(ei.amount || 0).toFixed(2)}</td>
                      <td>{ei.incomeType || '-'}</td>
                      <td>{ei.description || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};

export default AllSummary; 