// utils/logActivity.js
const ActivityLog = require('../models/ActivityLog');

/**
 * Log user activity
 * @param {Object} options
 * @param {Object} options.req - Express request object (must have req.user)
 * @param {string} options.action - One of: 'login', 'logout', 'create', 'edit', 'delete'
 * @param {string} options.resource - Resource type (e.g., 'Supplier', 'GRN')
 * @param {string} options.description - Human-readable description
 */
const logActivity = async ({ req, action, resource, description }) => {
  try {
    if (!req.user || !req.user.id || !req.user.username) {
      console.warn('Activity logging skipped: missing user data');
      return;
    }

    const logEntry = new ActivityLog({
      user: {
        _id: req.user.id,
        username: req.user.username
      },
      action,
      resource,
      description
    });

    await logEntry.save();
    console.log(`[Activity] ${action} ${resource} — ${description} by ${req.user.username}`);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

module.exports = logActivity;