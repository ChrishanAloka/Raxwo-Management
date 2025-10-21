import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import "./AddProductRepair.css";
import Select from 'react-select';

const API_URL = "https://raxwo-management.onrender.com/api/productsRepair";

const AddProductRepair = ({ closeModal, darkMode, onAddSuccess }) => {
  const [formData, setFormData] = useState({
    customerType: "New Customer",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerNIC: "",
    customerAddress: "",
    deviceType: "",
    serialNumber: "",
    estimationValue: "",
    checkingCharge: "",
    issueDescription: "",
    additionalNotes: "",
    repairCost: "",
    repairStatus: "Pending",
    repairCart: [],
    totalRepairCost: 0,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [generatedInvoice, setGeneratedInvoice] = useState("");
  const [deviceIssues, setDeviceIssues] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [newIssue, setNewIssue] = useState("");
  const [newDeviceType, setNewDeviceType] = useState("");
  const [showNewIssueInput, setShowNewIssueInput] = useState(false);
  const [showNewDeviceTypeInput, setShowNewDeviceTypeInput] = useState(false);

  const [customerOptions, setCustomerOptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [deviceTypeOptions, setDeviceTypeOptions] = useState([]);
  const [issueOptions, setIssueOptions] = useState([]);

  const [selectedDeviceType, setSelectedDeviceType] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);

  const [loadingIssues, setLoadingIssues] = useState(false);
  const [loadingDeviceType, setLoadingDeviceType] = useState(false);
  

  // Fetch device issues and device types when component mounts
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoadingCustomers(true);
        const response = await fetch("https://raxwo-management.onrender.com/api/productsRepair");
        if (response.ok) {
          const data = await response.json();
          const options = data
            .filter(c => c.customerType === "New Customer") // match your DB schema
            .map(c => ({
              value: c._id,
              label: c.customerName,
              phone: c.customerPhone,
              email: c.customerEmail,
              nic: c.customerNIC,
              address: c.customerAddress,
            }));
          setCustomerOptions(options);
        } else {
          console.error("Failed to fetch customers:", response.status);
        }
      } catch (err) {
        console.error("Error fetching customers:", err);
      } finally {
        setLoadingCustomers(false);
      }
    };

    const fetchDeviceIssues = async () => {
      try {
        setLoadingIssues(true);
        const response = await fetch("https://raxwo-management.onrender.com/api/deviceIssues");
        if (response.ok) {
          const data = await response.json();
          setDeviceIssues(data);

          // ✅ Build options AFTER data is fetched
          const options = data.map(issue => ({
            value: issue._id,
            label: issue.issue
          }));
          setIssueOptions([
            { value: "add_new", label: "+ Add New Issue", __isNew__: true },
            ...options
          ]);

        } else {
          console.error("Failed to fetch device issues:", response.status);
          setError("Failed to load device issues");
        }
      } catch (err) {
        console.error("Error fetching device issues:", err);
        setError("Error fetching device issues");
      } finally {
        setLoadingIssues(false);
      }
    };

    const fetchDeviceTypes = async () => {
      try {
        setLoadingDeviceType(true);
        const response = await fetch("https://raxwo-management.onrender.com/api/deviceTypes");
        if (response.ok) {
          const data = await response.json();
          setDeviceTypes(data);

          // ✅ Build options AFTER data is fetched
          const options = data.map(type => ({
            value: type._id,
            label: type.type
          }));
          setDeviceTypeOptions([
            { value: "add_new", label: "+ Add New Device Type", __isNew__: true },
            ...options
          ]);

        } else {
          console.error("Failed to fetch device types:", response.status);
          setError("Failed to load device types");
        }
      } catch (err) {
        console.error("Error fetching device types:", err);
        setError("Error fetching device types");
      }
      finally {
        setLoadingDeviceType(false)
      }
    };

    fetchCustomers();
    fetchDeviceIssues();
    fetchDeviceTypes();
  }, []);

  const token = localStorage.getItem('token');

  const handleAddNewIssue = async () => {
    if (!newIssue.trim()) return;
    
    try {
      const response = await fetch("https://raxwo-management.onrender.com/api/deviceIssues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ issue: newIssue.trim() }),
      });

      if (response.ok) {
        const addedIssue = await response.json();
        setDeviceIssues(prev => [...prev, addedIssue]);

        const newOption = { value: addedIssue._id, label: addedIssue.issue };
        setIssueOptions(prev => [
          ...prev.filter(opt => opt.value !== "add_new"),
          newOption,
          { value: "add_new", label: "+ Add New Issue", __isNew__: true }
        ]);

        setSelectedIssue(newOption);
        setFormData({ ...formData, issueDescription: addedIssue.issue });
        setNewIssue("");
        setShowNewIssueInput(false);
      } else {
        const error = await response.json();
        setError(error.message || "Failed to add new issue");
      }
    } catch (err) {
      setError("Error adding new issue");
      console.error("Error adding new issue:", err);
    }
  };

  const handleAddNewDeviceType = async () => {
    if (!newDeviceType.trim()) return;

    try {
      const response = await fetch("https://raxwo-management.onrender.com/api/deviceTypes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ type: newDeviceType.trim() }),
      });

      if (response.ok) {
        const addedType = await response.json();

        // ✅ Update state
        setDeviceTypes(prev => [...prev, addedType]);

        // ✅ Update options
        const newOption = { value: addedType._id, label: addedType.type };
        setDeviceTypeOptions(prev => [
          ...prev.filter(opt => opt.value !== "add_new"), // remove old "add new"
          newOption,
          { value: "add_new", label: "+ Add New Device Type", __isNew__: true } // re-add at end
        ]);

        // ✅ Select the new option
        setSelectedDeviceType(newOption);
        setFormData({ ...formData, deviceType: addedType.type });

        setNewDeviceType("");
        setShowNewDeviceTypeInput(false);
      } else {
        const error = await response.json();
        setError(error.message || "Failed to add new device type");
      }
    } catch (err) {
      setError("Error adding new device type");
      console.error("Error adding new device type:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Handle customer type change
    if (name === "customerType") {
      if (value === "New Customer") {
        // Reset to manual input
        setSelectedCustomer(null);
        setFormData(prev => ({
          ...prev,
          customerType: value,
          customerName: "",
          customerPhone: "",
          customerEmail: "",
          customerNIC: "",
          customerAddress: "",
        }));
      } else {
        // Existing Customer selected — clear manual fields
        setFormData(prev => ({
          ...prev,
          customerType: value,
          customerName: "",
          customerPhone: "",
          customerEmail: "",
          customerNIC: "",
          customerAddress: "",
        }));
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleCustomerSelect = (selectedOption) => {
    setSelectedCustomer(selectedOption);
    setLoadingCustomers(false);
    if (selectedOption) {
      setFormData({
        ...formData,
        customerName: selectedOption.label,
        customerPhone: selectedOption.phone || "",
        customerEmail: selectedOption.email || "",
        customerNIC: selectedOption.nic || "",
        customerAddress: selectedOption.address || "",
      });
    }
  };

  const generateJobBill = (invoice) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("EXXPLAN Repair Services", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("123 Repair Lane, Tech City, TC 45678", 105, 28, { align: "center" });
    doc.text("Phone: (555) 123-4567 | Email: support@exxplan.com", 105, 34, { align: "center" });

    doc.setFontSize(16);
    doc.text("Job Bill", 20, 50);
    doc.setFontSize(12);
    doc.text(`Job Number: ${invoice}`, 20, 60);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 60);

    doc.autoTable({
      startY: 70,
      head: [["Description", "Details"]],
      body: [
        ["Customer Type", formData.customerType],
        ["Customer Name", formData.customerName],
        ["Customer Phone", formData.customerPhone],
        ["Customer Email", formData.customerEmail || "N/A"],
        ["Job Number", invoice],
        ["Device Type", formData.deviceType],
        ["Serial Number", formData.serialNumber || "N/A"],
        ["Estimation Value", `Rs. ${formData.estimationValue || "0.00"}`],
        ["Checking Charge", `Rs. ${formData.checkingCharge || "0.00"}`],
        ["Issue Description", formData.issueDescription],
        ["Additional Notes", formData.additionalNotes || "N/A"],
        ["Repair Status", formData.repairStatus],
      ],
      styles: { fontSize: 12, cellPadding: 3 },
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      margin: { left: 20, right: 20 },
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Checking Charge: Rs. ${parseFloat(formData.checkingCharge || 0).toFixed(2)}`, 150, finalY);

    doc.setFontSize(10);
    doc.setLineWidth(0.5);
    doc.line(20, finalY + 20, 190, finalY + 20);
    doc.text("Thank you for choosing EXXPLAN Repair Services!", 105, finalY + 30, { align: "center" });
    doc.text("Terms: Payment due within 30 days. Contact us for support.", 105, finalY + 36, { align: "center" });

    doc.save(`JobBill_${invoice}_${Date.now()}.pdf`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      // Get the current user's name from localStorage
      const username = localStorage.getItem('username') || 'System';

      // Create initial change history entry
      const initialChangeHistory = [{
        changedAt: new Date().toISOString(),
        changedBy: username,
        field: 'CREATE',
        oldValue: null,
        newValue: 'New repair job created',
        changeType: 'CREATE'
      }];

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          changeHistory: initialChangeHistory,
          changedBy: username
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add repair job");
      }

      const newRepair = await response.json();
      console.log("New repair job created:", newRepair);
      
      setMessage("Repair job added successfully!");
      onAddSuccess();
      closeModal();
    } catch (err) {
      console.error("Error adding repair job:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="repair-modal-overlay">
      <div className={`repair-container ${darkMode ? "dark" : ""}`}>
        <div className="repair-header" style={{ position: "sticky", top: 0, backgroundColor: darkMode ? "#0F172A" : "whitesmoke", zIndex: 10, paddingTop: "10px", paddingBottom: "10px", borderBottom: `1px solid ${darkMode ? "#4a5568" : "#ddd"}` }}>
          <h2 className="produ-modal-title">➕ Add Repair Record</h2>
          {loading && <p className="loading">Adding repair record...</p>}
          {error && <p className="repair-error-message">{error}</p>}
          {message && <p className="repair-success-message">{message}</p>}
        </div>

        <form className="repair-form" onSubmit={handleSubmit}>
          <div className="repair-form-row">
            {/* Column 1: Customer Details */}
            <div className="repair-column">
              <h3 className="repair-section-header">Customer Details</h3>

              <label className="repair-label">Customer Type</label>
              <select
                className="repair-input"
                name="customerType"
                value={formData.customerType}
                onChange={handleChange}
                required
              >
                <option value="New Customer">New Customer</option>
                <option value="Existing Customer">Existing Customer</option>
                {/* <option value="Corporate">Corporate</option>
                <option value="VIP">VIP</option> */}
              </select>

              {/* Customer Name */}
              <label className="repair-label">Customer Name</label>
              {formData.customerType === "Existing Customer" ? (
                <Select
                  options={customerOptions}
                  value={selectedCustomer}
                  onChange={handleCustomerSelect}
                  placeholder="Search customer..."
                  isLoading={loadingCustomers}
                  isClearable
                  
                />
              ) : (
                <input
                  className="repair-input"
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  required
                  placeholder="Enter customer name"
                />
              )}

              <label className="repair-label">Mobile Number</label>
              <input
                className="repair-input"
                type="text"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleChange}
                required
                placeholder="Enter mobile number"
              />

              <label className="repair-label">Email Address</label>
              <input
                className="repair-input"
                type="email"
                name="customerEmail"
                value={formData.customerEmail}
                onChange={handleChange}
                placeholder="Enter email address (optional)"
              />
            </div>

            {/* Column 2: Device Details */}
            <div className="repair-column">
              <h3 className="repair-section-header">Device Details</h3>

              {generatedInvoice && (
                <>
                  <label className="repair-label">Job Number</label>
                  <input
                    className="repair-input"
                    type="text"
                    name="repairInvoice"
                    value={generatedInvoice}
                    readOnly
                  />
                </>
              )}

              <label className="repair-label" style={{paddingBottom:"10px"}} >Device</label>
              <Select
                options={deviceTypeOptions}
                value={selectedDeviceType}
                onChange={(selected) => {
                  if (selected?.value === "add_new") {
                    setShowNewDeviceTypeInput(true);
                    setSelectedDeviceType(null);
                  } else {
                    setSelectedDeviceType(selected);
                    setFormData({ ...formData, deviceType: selected?.label || "" });
                    setLoadingDeviceType(false);
                  }
                }}
                placeholder="Select or add device type"
                isClearable
                isLoading={loadingDeviceType}
              />

              {showNewDeviceTypeInput && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    backgroundColor: darkMode ? "#444" : "#f5f5f5",
                    borderRadius: "4px",
                  }}
                >
                  <input
                    className="repair-input"
                    type="text"
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value)}
                    placeholder="Enter new device type"
                    style={{ marginBottom: "10px" }}
                  />
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={handleAddNewDeviceType}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        transition: "all 0.2s ease",
                        boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)",
                      }}
                      type="button"
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#059669";
                        e.target.style.transform = "translateY(-1px)";
                        e.target.style.boxShadow = "0 4px 8px rgba(16, 185, 129, 0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "#10b981";
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "0 2px 4px rgba(16, 185, 129, 0.2)";
                      }}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowNewDeviceTypeInput(false);
                        setNewDeviceType("");
                      }}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        transition: "all 0.2s ease",
                        boxShadow: "0 2px 4px rgba(239, 68, 68, 0.2)",
                      }}
                      type="button"
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#dc2626";
                        e.target.style.transform = "translateY(-1px)";
                        e.target.style.boxShadow = "0 4px 8px rgba(239, 68, 68, 0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "#ef4444";
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "0 2px 4px rgba(239, 68, 68, 0.2)";
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <label className="repair-label" style={{paddingTop:"15px"}}>Serial Number</label>
              <input
                className="repair-input"
                type="text"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleChange}
                placeholder="Enter serial number (optional)"
              />

              
              <label className="repair-label" style={{paddingBottom:"10px"}}>Device Issue</label>
                <Select
                  options={issueOptions}
                  value={selectedIssue}
                  onChange={(selected) => {
                    if (selected?.value === "add_new") {
                      setShowNewIssueInput(true);
                      setSelectedIssue(null);
                    } else {
                      setSelectedIssue(selected);
                      setFormData({ ...formData, issueDescription: selected?.label || "" });
                      setLoadingIssues(false);
                    }
                  }}
                  placeholder="Select or add issue"
                  isClearable
                  isLoading={loadingIssues}
                />

                {showNewIssueInput && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "10px",
                      backgroundColor: darkMode ? "#444" : "#f5f5f5",
                      borderRadius: "4px",
                    }}
                  >
                    <input
                      className="repair-input"
                      type="text"
                      value={newIssue}
                      onChange={(e) => setNewIssue(e.target.value)}
                      placeholder="Enter new issue"
                      style={{ marginBottom: "10px" }}
                    />
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={handleAddNewIssue}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "#10b981",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "600",
                          transition: "all 0.2s ease",
                          boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)",
                        }}
                        type="button"
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#059669";
                          e.target.style.transform = "translateY(-1px)";
                          e.target.style.boxShadow = "0 4px 8px rgba(16, 185, 129, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "#10b981";
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "0 2px 4px rgba(16, 185, 129, 0.2)";
                        }}
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowNewIssueInput(false);
                          setNewIssue("");
                        }}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "600",
                          transition: "all 0.2s ease",
                          boxShadow: "0 2px 4px rgba(239, 68, 68, 0.2)",
                        }}
                        type="button"
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#dc2626";
                          e.target.style.transform = "translateY(-1px)";
                          e.target.style.boxShadow = "0 4px 8px rgba(239, 68, 68, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "#ef4444";
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "0 2px 4px rgba(239, 68, 68, 0.2)";
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              
            </div>

            {/* Column 3: Repair Details */}
            <div className="repair-column">
              <h3 className="repair-section-header">Repair Details</h3>

              <label className="repair-label">Estimation Value</label>
              <input
                className="repair-input"
                type="text"
                name="estimationValue"
                value={formData.estimationValue}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="Enter estimated value (optional)"
              />

              <label className="repair-label">Checking Charge</label>
              <input
                className="repair-input"
                type="number"
                name="checkingCharge"
                value={formData.checkingCharge}
                onChange={handleChange}
                onFocus={(e) => e.target.select()}
                onWheel={(e) => e.target.blur()}
                min="0"
                step="0.01"
                placeholder="Enter checking charge (optional)"
              />

              <input
                type="hidden"
                name="repairCost"
                value={formData.repairCost || "0"}
                onChange={handleChange}
              />

              {formData.totalRepairCost > 0 && (
                <div className="repair-total-cost">
                  <label className="repair-label">Total Repair Cost</label>
                  <div className="repair-total-cost-value">
                    Rs. {formData.totalRepairCost}
                  </div>
                </div>
              )}

              <label className="repair-label">Repair Status</label>
              <select
                className="repair-input"
                name="repairStatus"
                value={formData.repairStatus}
                onChange={handleChange}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <label className="repair-label">Additional Notes</label>
              <textarea
                className="repair-textarea"
                name="additionalNotes"
                value={formData.additionalNotes}
                onChange={handleChange}
                placeholder="Enter any additional notes (optional)"
                rows="3"
              />

              {formData.repairCart && formData.repairCart.length > 0 && (
                <div className="repair-cart-section">
                  <h4 className="repair-cart-header">Repair Items</h4>
                  <div className="repair-cart-items">
                    <table className="repair-cart-table">
                      <thead>
                        <tr>
                          <th>Item Code</th>
                          <th>Item Name</th>
                          <th>Quantity</th>
                          <th>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.repairCart.map((item, index) => (
                          <tr key={index}>
                            <td>{item.itemCode}</td>
                            <td>{item.quantity}</td>
                            <td>Rs. {item.cost}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="3" className="repair-cart-total-label">Total Cart Cost:</td>
                          <td className="repair-cart-total-value">
                            Rs. {formData.repairCart.reduce((total, item) => total + item.cost, 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="button-group">
            <button type="submit" className="a-p-submit-btn" disabled={loading}>
              {loading ? "Adding..." : "Add Repair"}
            </button>
            {generatedInvoice && (
              <button
                type="button"
                className="repair-download-btn"
                onClick={() => generateJobBill(generatedInvoice)}
              >
                Download Job Bill
              </button>
            )}

            <button type="button" className="a-p-cancel-btn" onClick={closeModal}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductRepair;