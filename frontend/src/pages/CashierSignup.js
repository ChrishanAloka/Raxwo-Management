import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
// import signupImage from '../images/blue3.png'; // commented out since image section is hidden
import '../styles/CashierSignup.css';

const UserSignup = ({ darkMode }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'cashier'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Clear error when user types in the field
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validate = () => {
    const newErrors = {};

    // Username
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required.';
    } else if (formData.username.length < 3 || formData.username.length > 20) {
      newErrors.username = 'Username must be 3–20 characters long.';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, underscores, and hyphens.';
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required.';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    // Phone
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    } else if (!/^\d+$/.test(formData.phone)) {
      newErrors.phone = 'Phone number must contain only digits.';
    } else if (formData.phone.length < 10 || formData.phone.length > 15) {
      newErrors.phone = 'Phone number must be between 10 and 15 digits.';
    }

    // Password
    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long.';
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one letter and one number.';
    }

    // Confirm Password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    // Role
    if (!formData.role) {
      newErrors.role = 'Role is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!validate()) return;

    setLoading(true);

    try {
      const response = await axios.post('https://raxwo-management.onrender.com/api/auth/register', {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role
      });
      setMessage(`✅ ${formData.role.charAt(0).toUpperCase() + formData.role.slice(1)} registration successful!`);
      setTimeout(() => navigate('/cashier/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.msg || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Inline style for validation error messages
  const errorStyle = {
    color: '#e74c3c',
    fontSize: '0.85rem',
    marginTop: '4px',
    marginLeft: '2px'
  };

  return (
    <div className={`u-signup-container ${darkMode ? "dark" : ""}`}>
      <div className={`u-signup-form-wrapper ${darkMode ? "dark" : ""}`}>
        <h2 className={`u-signup-title ${darkMode ? "dark" : ""}`}>🛍️ User Signup</h2>
        {loading && <p className="loading">Processing...</p>}
        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}

        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="username" className={`u-signup-label ${darkMode ? "dark" : ""}`}>Username:</label>
            <input
              id="username"
              className={`u-signup-input ${darkMode ? "dark" : ""}`}
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
            {errors.username && <p style={errorStyle}>{errors.username}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="email" className={`u-signup-label ${darkMode ? "dark" : ""}`}>Email:</label>
            <input
              id="email"
              className={`u-signup-input ${darkMode ? "dark" : ""}`}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {errors.email && <p style={errorStyle}>{errors.email}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="phone" className={`u-signup-label ${darkMode ? "dark" : ""}`}>Phone:</label>
            <input
              id="phone"
              className={`u-signup-input ${darkMode ? "dark" : ""}`}
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
            />
            {errors.phone && <p style={errorStyle}>{errors.phone}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="role" className={`u-signup-label ${darkMode ? "dark" : ""}`}>Role:</label>
            <select
              id="role"
              className={`u-signup-input ${darkMode ? "dark" : ""}`}
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="cashier">Cashier</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && <p style={errorStyle}>{errors.role}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="password" className={`u-signup-label ${darkMode ? "dark" : ""}`}>Password:</label>
            <input
              id="password"
              className={`u-signup-input ${darkMode ? "dark" : ""}`}
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            {errors.password && <p style={errorStyle}>{errors.password}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="confirmPassword" className={`u-signup-label ${darkMode ? "dark" : ""}`}>Confirm Password:</label>
            <input
              id="confirmPassword"
              className={`u-signup-input ${darkMode ? "dark" : ""}`}
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
            {errors.confirmPassword && <p style={errorStyle}>{errors.confirmPassword}</p>}
          </div>

          <div className="button-group">
            <button type="button" className="u-cancel-btn" onClick={() => navigate("/")}>Cancel</button>
            <button type="submit" className="u-submit-btn" disabled={loading}>
              {loading ? "Signing Up..." : "Sign Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserSignup;