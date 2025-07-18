import { useState } from "react";
import axios from "axios";
import '../styles/CashierAttendance.css';


const API_URL = "https://raxwo-manage-backend-production.up.railway.app/api/attendance";

// Helper function to get current time in HH:MM:SS format
const getCurrentTime = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const CashierAttendance = ({darkMode}) => {
  const [cashierId, setCashierId] = useState("");
  const [cashierData, setCashierData] = useState(null);
  const [message, setMessage] = useState("");
  const [remarks, setRemarks] = useState("");
  const [showRemarks, setShowRemarks] = useState(false);

  const handleInputChange = async (e) => {
    setCashierId(e.target.value);
    if (e.target.value.length >= 3) {
      try {
        const res = await axios.get(`https://raxwo-manage-backend-production.up.railway.app/api/cashiers`);
        const foundCashier = res.data.find((c) => c.id === e.target.value);
        if (foundCashier) {
          setCashierData(foundCashier);
          const attendanceRes = await axios.get(`${API_URL}?cashierId=${e.target.value}&date=${new Date().toISOString().split("T")[0]}`);
          if (attendanceRes.data.length === 2) {
            setShowRemarks(true);
          } else {
            setShowRemarks(false);
          }
        } else {
          setCashierData(null);
          setShowRemarks(false);
        }
      } catch (error) {
        console.error("Error fetching cashier data", error);
      }
    }
  };

  const markAttendance = async () => {
    try {
      const clientTime = getCurrentTime();
      const res = await axios.post(API_URL, { cashierId, remarks, clientTime });
      setMessage(res.data.message);
      setRemarks("");
      setShowRemarks(false);
    } catch (error) {
      console.error("Error marking attendance", error);
      setMessage("Error marking attendance");
    }
  };

  return (


      

    <div className={`attendance-container ${darkMode ? 'dark' : ''}`}>
      <div className={`form-wrapper ${darkMode ? 'dark' : ''}`}>
      <h2 className={`product-repair-list-title ${darkMode ? "dark" : ""}`}>
      Mark Attendance</h2>
        <input
          type="text"
          placeholder="Enter Cashier ID"
          value={cashierId}
          onChange={handleInputChange}
          className={`input-field ${darkMode ? 'dark' : ''}`}
        />
        {cashierData && (
          <div>
            <div className="cashier-info">
              <p><strong>NAME :</strong> {cashierData.cashierName}</p>
              <p><strong>JOB ROLE :</strong> {cashierData.jobRole}</p>
              <p><strong>MONTH :</strong> {new Date().toLocaleString("default", { month: "long" })}</p>
              <p><strong>DATE :</strong> {new Date().toISOString().split("T")[0]}</p>
              <p><strong>TIME :</strong> {getCurrentTime()}</p>
            </div>
            
            
              <label className={`input-ca-lbl ${darkMode ? 'dark' : ''}`}>REMARKS</label>
              <input
                type="text"
                placeholder="Enter Remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className={`input-field ${darkMode ? 'dark' : ''}`}
              />
            </div>
          
        )}
        
        <button onClick={markAttendance} className="mark-btn">Mark Attendance</button>
        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
};

export default CashierAttendance;