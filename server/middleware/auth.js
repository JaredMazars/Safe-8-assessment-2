/**
 * Shared authentication middleware
 * Extracted from routes/admin.js so it can be reused across route files.
 */
import Admin from '../models/Admin.js';
import logger from '../utils/logger.js';

/**
 * Middleware: verify an admin Bearer session token.
 * Sets req.admin = session.admin on success.
 */
export const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    const session = await Admin.verifySession(token);

    if (!session.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session'
      });
    }

    req.admin = session.admin;
    next();
  } catch (error) {
    logger.error('Admin authentication error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};
