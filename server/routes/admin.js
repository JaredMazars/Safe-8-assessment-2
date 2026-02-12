import express from 'express';
import sql from 'mssql';
import Admin from '../models/Admin.js';
import Assessment from '../models/Assessment.js';
import Lead from '../models/Lead.js';
import database from '../config/database.js';
import cache from '../config/simpleCache.js';
import { validateAdminLogin, validatePasswordChange, validateId, validatePagination } from '../middleware/validation.js';
import { doubleCsrfProtection } from '../middleware/csrf.js';
import emailService from '../services/emailService.js';
import { generateAssessmentPDFBuffer } from '../services/pdfService.js';
import { generateITACReviewPDFBuffer } from '../services/itacReviewPdfService.js';
import { generateAppDocumentationPDFBuffer } from '../services/appDocumentationPdfService.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: process.env.NODE_ENV !== 'production'
  }
};

const router = express.Router();

/**
 * Generate a secure temporary password
 * 12 characters: uppercase, lowercase, numbers, and symbols
 */
function generateTempPassword() {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += symbols[crypto.randomInt(0, symbols.length)];
  
  // Fill remaining characters randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => crypto.randomInt(-1, 2)).join('');
}

// Middleware to verify admin authentication
const authenticateAdmin = async (req, res, next) => {
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
    console.error('❌ Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Middleware to check if admin is super admin
const requireSuperAdmin = (req, res, next) => {
  if (req.admin.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Super admin access required'
    });
  }
  next();
};

// ======================
// ADMIN AUTHENTICATION
// ======================

// Admin login (NO CSRF - allow login without token)
router.post('/login', validateAdminLogin, async (req, res) => {
  try {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    console.log('🔐 Admin login attempt:', username);
    console.log('IP:', ipAddress, 'User-Agent:', userAgent);

    const result = await Admin.authenticate(username, password, ipAddress, userAgent);

    if (result.success) {
      console.log('✅ Admin logged in:', result.admin.username);
      res.json(result);
    } else {
      console.log('❌ Login failed:', result.message);
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('❌ Login error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: 'Login error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Admin logout (CSRF protected)
router.post('/logout', doubleCsrfProtection, authenticateAdmin, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    await Admin.logout(token);
    
    console.log('✅ Admin logged out:', req.admin.username);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout error'
    });
  }
});

// Verify session (for frontend to check if still authenticated)
router.get('/verify', authenticateAdmin, (req, res) => {
  res.json({
    success: true,
    admin: req.admin
  });
});

// Change password
// Change password (CSRF protected)
router.post('/change-password', doubleCsrfProtection, authenticateAdmin, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Old and new passwords are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters'
      });
    }

    const result = await Admin.changePassword(req.admin.id, oldPassword, newPassword);
    
    if (result.success) {
      await Admin.logActivity(req.admin.id, 'UPDATE', 'admin', req.admin.id, 'Password changed', req.ip, req.headers['user-agent']);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
});

// ======================
// ADMIN DASHBOARD
// ======================

// Get dashboard statistics
router.get('/dashboard/stats', authenticateAdmin, async (req, res) => {
  try {
    const stats = await Admin.getDashboardStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
});

// ======================
// USER MANAGEMENT
// ======================

// Get all users
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, industry } = req.query;
    const offset = (page - 1) * limit;

    // Build query without parameters for SQL Server compatibility
    let whereConditions = [];

    if (search) {
      const escapedSearch = search.replace(/'/g, "''");
      whereConditions.push(`(contact_name LIKE '%${escapedSearch}%' OR email LIKE '%${escapedSearch}%' OR company_name LIKE '%${escapedSearch}%')`);
    }

    if (industry) {
      const escapedIndustry = industry.replace(/'/g, "''");
      whereConditions.push(`industry = '${escapedIndustry}'`);
    }

    // Exclude soft-deleted users (email starts with 'deleted_' or contact_name is 'DELETED USER')
    whereConditions.push(`email NOT LIKE 'deleted_%'`);
    whereConditions.push(`contact_name != 'DELETED USER'`);

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM leads ${whereClause}`;
    const countResult = await database.query(countSql);
    const total = Array.isArray(countResult) ? countResult[0].total : countResult.recordset[0].total;

    // Query leads with assessment count using correct column names (lead_id not lead_user_id)
    const sql = `
      SELECT 
        l.id,
        l.contact_name as full_name,
        l.email,
        l.company_name,
        l.company_size,
        l.country,
        l.industry,
        l.job_title as position,
        l.phone_number,
        l.created_at as registered_at,
        l.last_login_at,
        COUNT(a.id) as total_assessments,
        AVG(a.overall_score) as avg_score,
        MAX(a.completed_at) as last_assessment_date
      FROM leads l
      LEFT JOIN assessments a ON l.id = a.lead_id
      ${whereClause}
      GROUP BY l.id, l.contact_name, l.email, l.company_name, l.company_size, l.country, l.industry, l.job_title, l.phone_number, l.created_at, l.last_login_at
      ORDER BY l.created_at DESC
      OFFSET ${offset} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY;
    `;

    const result = await database.query(sql);
    const users = Array.isArray(result) ? result : result.recordset;

    await Admin.logActivity(req.admin.id, 'VIEW', 'users', null, 'Viewed user list', req.ip, req.headers['user-agent']);

    res.json({
      success: true,
      users: users,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit),
        has_prev: page > 1,
        has_next: page < Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// Get user by ID with full details
router.get('/users/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user details
    const user = await Lead.getById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's assessments
    const assessments = await Assessment.getByUserId(userId);

    await Admin.logActivity(req.admin.id, 'VIEW', 'user', userId, `Viewed user profile: ${user.email}`, req.ip, req.headers['user-agent']);

    res.json({
      success: true,
      user: {
        ...user,
        password_hash: undefined // Don't send password hash
      },
      assessments
    });
  } catch (error) {
    console.error('❌ Error getting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user details'
    });
  }
});

// Get user's assessment responses
router.get('/users/:userId/responses/:assessmentType', authenticateAdmin, async (req, res) => {
  try {
    const { userId, assessmentType } = req.params;

    const sql = `
      SELECT ar.*, aq.question_text, aq.pillar_name, aq.question_order
      FROM assessment_responses ar
      INNER JOIN assessment_questions aq ON ar.question_id = aq.id
      WHERE ar.lead_user_id = ? AND aq.assessment_type = ?
      ORDER BY aq.pillar_name, aq.question_order;
    `;

    const result = await database.query(sql, [userId, assessmentType.toUpperCase()]);

    res.json({
      success: true,
      responses: result.recordset
    });
  } catch (error) {
    console.error('❌ Error getting user responses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user responses'
    });
  }
});

// ======================
// QUESTION MANAGEMENT
// ======================

// Get all questions
router.get('/questions', authenticateAdmin, async (req, res) => {
  try {
    const { assessment_type, pillar_name, is_active, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = [];

    if (assessment_type && assessment_type !== 'all') {
      const escapedType = assessment_type.toUpperCase().replace(/'/g, "''");
      whereConditions.push(`assessment_type = '${escapedType}'`);
    }

    if (pillar_name && pillar_name !== 'all') {
      const escapedPillar = pillar_name.replace(/'/g, "''");
      whereConditions.push(`pillar_name = '${escapedPillar}'`);
    }

    if (is_active !== undefined && is_active !== null && is_active !== '') {
      whereConditions.push(`is_active = ${is_active === 'true' || is_active === '1' ? 1 : 0}`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM assessment_questions ${whereClause}`;
    const countResult = await database.query(countSql);
    const total = Array.isArray(countResult) ? countResult[0].total : countResult.recordset[0].total;

    const sql = `
      SELECT id, assessment_type, pillar_name, pillar_short_name, 
             question_text, question_order, is_active, created_at
      FROM assessment_questions
      ${whereClause}
      ORDER BY assessment_type, pillar_name, question_order
      OFFSET ${offset} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY
    `;

    const result = await database.query(sql);
    const questions = Array.isArray(result) ? result : result.recordset;

    console.log(`✅ Loaded ${questions.length} questions (Total: ${total})`);

    res.json({
      success: true,
      questions: questions,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_items: total,
        items_per_page: parseInt(limit),
        has_prev: parseInt(page) > 1,
        has_next: parseInt(page) < Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error getting questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions'
    });
  }
});

// Get question by ID
router.get('/questions/:questionId', authenticateAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;

    const sql = `SELECT id, assessment_type, pillar_name, pillar_short_name, 
                        question_text, question_order, is_active, created_at, updated_at 
                 FROM assessment_questions WHERE id = ?`;
    const result = await database.query(sql, [questionId]);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      question: result.recordset[0]
    });
  } catch (error) {
    console.error('❌ Error getting question:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching question'
    });
  }
});

// Create new question (CSRF protected)
router.post('/questions', authenticateAdmin, async (req, res) => {
  try {
    console.log('📝 Creating question - Request body:', JSON.stringify(req.body, null, 2));
    console.log('👤 Admin user:', req.admin?.id, req.admin?.email);
    
    const {
      assessment_type,
      pillar_name,
      pillar_short_name,
      question_text,
      question_order
    } = req.body;

    if (!assessment_type || !pillar_name || !pillar_short_name || !question_text) {
      console.log('❌ Missing fields:', { assessment_type, pillar_name, pillar_short_name, question_text: question_text ? 'present' : 'missing' });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const sql = `
      INSERT INTO assessment_questions (
        assessment_type, pillar_name, pillar_short_name, question_text, question_order, created_by, is_active
      )
      OUTPUT INSERTED.id
      VALUES (?, ?, ?, ?, ?, ?, 1);
    `;

    const result = await database.query(sql, [
      assessment_type.toUpperCase(),
      pillar_name,
      pillar_short_name,
      question_text,
      question_order || 999,
      req.admin.id
    ]);

    const questionId = result.recordset[0].id;

    await Admin.logActivity(req.admin.id, 'CREATE', 'question', questionId, `Created question: ${question_text.substring(0, 50)}...`, req.ip, req.headers['user-agent']);

    console.log('✅ Question created:', questionId);

    res.json({
      success: true,
      questionId,
      message: 'Question created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating question:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating question',
      error: error.message
    });
  }
});

// Update question
router.put('/questions/:questionId', authenticateAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;
    const {
      assessment_type,
      pillar_name,
      pillar_short_name,
      question_text,
      question_order,
      is_active
    } = req.body;

    const updates = [];
    const params = [];

    if (assessment_type) {
      updates.push('assessment_type = ?');
      params.push(assessment_type.toUpperCase());
    }

    if (pillar_name) {
      updates.push('pillar_name = ?');
      params.push(pillar_name);
    }

    if (pillar_short_name) {
      updates.push('pillar_short_name = ?');
      params.push(pillar_short_name);
    }

    if (question_text) {
      updates.push('question_text = ?');
      params.push(question_text);
    }

    if (question_order !== undefined) {
      updates.push('question_order = ?');
      params.push(question_order);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    updates.push('updated_by = ?');
    params.push(req.admin.id);

    params.push(questionId);

    const sql = `UPDATE assessment_questions SET ${updates.join(', ')} WHERE id = ?`;
    await database.query(sql, params);

    await Admin.logActivity(req.admin.id, 'UPDATE', 'question', questionId, `Updated question`, req.ip, req.headers['user-agent']);

    console.log('✅ Question updated:', questionId);

    res.json({
      success: true,
      message: 'Question updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating question:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating question',
      error: error.message
    });
  }
});

// Delete question (soft delete by setting is_active = 0)
router.delete('/questions/:questionId', authenticateAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;

    const sql = `UPDATE assessment_questions SET is_active = 0, updated_by = ? WHERE id = ?`;
    await database.query(sql, [req.admin.id, questionId]);

    await Admin.logActivity(req.admin.id, 'DELETE', 'question', questionId, `Deleted question`, req.ip, req.headers['user-agent']);

    console.log('✅ Question deleted:', questionId);

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting question'
    });
  }
});

// Toggle question active status (activate/deactivate)
router.patch('/questions/:questionId/toggle-status', authenticateAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;

    // Get current status
    const getStatusSql = `SELECT is_active, question_text FROM assessment_questions WHERE id = ?`;
    const result = await database.query(getStatusSql, [questionId]);
    
    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    const currentStatus = result.recordset[0].is_active;
    const questionText = result.recordset[0].question_text;
    const newStatus = currentStatus ? 0 : 1;
    const action = newStatus ? 'activated' : 'deactivated';

    // Toggle status
    const updateSql = `UPDATE assessment_questions SET is_active = ?, updated_by = ? WHERE id = ?`;
    await database.query(updateSql, [newStatus, req.admin.id, questionId]);

    await Admin.logActivity(
      req.admin.id,
      'UPDATE',
      'question',
      questionId,
      `Question ${action}: ${questionText.substring(0, 50)}...`,
      req.ip,
      req.headers['user-agent']
    );

    console.log(`✅ Question ${action}:`, questionId);

    res.json({
      success: true,
      message: `Question ${action} successfully`,
      is_active: newStatus
    });
  } catch (error) {
    console.error('❌ Error toggling question status:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling question status'
    });
  }
});

// ======================
// ASSESSMENT TYPE MANAGEMENT
// ======================

// Get all assessment types with question counts
router.get('/assessment-types', authenticateAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        assessment_type,
        COUNT(*) as total_questions,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_questions,
        COUNT(DISTINCT pillar_name) as pillar_count
      FROM assessment_questions
      GROUP BY assessment_type
      ORDER BY assessment_type;
    `;

    const result = await database.query(sql);

    res.json({
      success: true,
      assessmentTypes: result.recordset
    });
  } catch (error) {
    console.error('❌ Error getting assessment types:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assessment types'
    });
  }
});

// ======================
// ACTIVITY LOG
// ======================

// Get activity log
router.get('/activity-log', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, action_type, entity_type } = req.query;
    const offset = (page - 1) * limit;

    const logs = await Admin.getActivityLog({
      actionType: action_type,
      entityType: entity_type,
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ Error getting activity log:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity log'
    });
  }
});

// ======================
// AUDIT LOGS / ACTIVITY LOG
// ======================

// Get audit logs/activity log
router.get('/audit-logs', authenticateAdmin, async (req, res) => {
  try {
    console.log('📋 Fetching audit logs...');
    
    const { limit = 100, offset = 0, action_type, admin_id } = req.query;
    
    let query = `
      SELECT 
        aal.id,
        aal.admin_id,
        au.username as admin_username,
        au.full_name as admin_name,
        aal.action_type,
        aal.entity_type,
        aal.entity_id,
        aal.description,
        aal.ip_address,
        aal.user_agent,
        aal.created_at
      FROM admin_activity_log aal
      LEFT JOIN admin_users au ON aal.admin_id = au.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (action_type) {
      query += ` AND aal.action_type = @action_type`;
      params.push({ name: 'action_type', type: 'NVarChar', value: action_type });
    }
    
    if (admin_id) {
      query += ` AND aal.admin_id = @admin_id`;
      params.push({ name: 'admin_id', type: 'Int', value: parseInt(admin_id) });
    }
    
    query += ` ORDER BY aal.created_at DESC
              OFFSET @offset ROWS
              FETCH NEXT @limit ROWS ONLY`;
    
    params.push(
      { name: 'offset', type: 'Int', value: parseInt(offset) },
      { name: 'limit', type: 'Int', value: parseInt(limit) }
    );
    
    const result = await database.query(query, params);
    const logs = result.recordset || result;
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM admin_activity_log aal
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (action_type) {
      countQuery += ` AND aal.action_type = @action_type`;
      countParams.push({ name: 'action_type', type: 'NVarChar', value: action_type });
    }
    
    if (admin_id) {
      countQuery += ` AND aal.admin_id = @admin_id`;
      countParams.push({ name: 'admin_id', type: 'Int', value: parseInt(admin_id) });
    }
    
    const countResult = await database.query(countQuery, countParams);
    const total = countResult.recordset?.[0]?.total || countResult[0]?.total || 0;
    
    console.log(`✅ Found ${logs.length} audit logs (Total: ${total})`);
    console.log('📊 Sample log data:', JSON.stringify(logs.slice(0, 2), null, 2));
    
    res.json({
      success: true,
      logs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + logs.length) < total
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
});

// Get audit log statistics
router.get('/audit-logs/stats', authenticateAdmin, async (req, res) => {
  try {
    console.log('📊 Fetching audit log statistics...');
    
    const query = `
      SELECT 
        action_type,
        COUNT(*) as count,
        MAX(created_at) as last_occurrence
      FROM admin_activity_log
      GROUP BY action_type
      ORDER BY count DESC
    `;
    
    const result = await database.query(query);
    const stats = result.recordset || result;
    
    console.log('✅ Audit log stats:', stats);
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('❌ Error fetching audit log stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit log statistics',
      error: error.message
    });
  }
});

// Get detailed activity logs (enhanced version with pagination)
router.get('/activity-logs/detailed', authenticateAdmin, async (req, res) => {
  try {
    console.log('📋 Fetching detailed activity logs...');
    
    const { limit = 50, page = 1, action_type, entity_type } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build WHERE clause for admin logs
    let adminWhereClause = '1=1';
    let userWhereClause = '1=1';
    
    if (action_type && action_type !== 'all') {
      const escapedAction = action_type.replace(/'/g, "''");
      adminWhereClause += ` AND aal.action_type = '${escapedAction}'`;
      userWhereClause += ` AND ual.action_type = '${escapedAction}'`;
    }
    
    if (entity_type && entity_type !== 'all') {
      const escapedEntity = entity_type.replace(/'/g, "''");
      adminWhereClause += ` AND aal.entity_type = '${escapedEntity}'`;
      userWhereClause += ` AND ual.entity_type = '${escapedEntity}'`;
    }
    
    // Get combined logs from both admin and user activity tables
    const sql = `
      WITH CombinedLogs AS (
        SELECT
          'admin' as actor_type,
          aal.id,
          au.username as actor_name,
          au.full_name as actor_full_name,
          au.email as actor_email,
          CAST(NULL AS NVARCHAR(255)) as company_name,
          aal.action_type,
          aal.entity_type,
          aal.entity_id,
          aal.description,
          aal.ip_address,
          aal.user_agent,
          aal.created_at
        FROM dbo.admin_activity_log aal
        LEFT JOIN dbo.admin_users au ON aal.admin_id = au.id
        WHERE ${adminWhereClause}
        
        UNION ALL
        
        SELECT
          'user' as actor_type,
          ual.id,
          l.contact_name as actor_name,
          l.contact_name as actor_full_name,
          l.email as actor_email,
          l.company_name,
          ual.action_type,
          ual.entity_type,
          CAST(ual.entity_id AS NVARCHAR(50)) as entity_id,
          ual.description,
          ual.ip_address,
          ual.user_agent,
          ual.created_at
        FROM dbo.user_activity_log ual
        INNER JOIN dbo.leads l ON ual.lead_id = l.id
        WHERE ${userWhereClause}
      )
      SELECT *
      FROM CombinedLogs
      ORDER BY created_at DESC
      OFFSET ${offset} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY
    `;
    
    const result = await database.query(sql);
    const logs = Array.isArray(result) ? result : result.recordset;
    
    // Get total count
    const countSql = `
      SELECT COUNT(*) as total FROM (
        SELECT id FROM dbo.admin_activity_log aal WHERE ${adminWhereClause}
        UNION ALL
        SELECT id FROM dbo.user_activity_log ual WHERE ${userWhereClause}
      ) combined
    `;
    const countResult = await database.query(countSql);
    const total = Array.isArray(countResult) ? countResult[0].total : countResult.recordset[0].total;
    
    console.log(`✅ Found ${logs.length} activity logs (Total: ${total})`);
    
    res.json({
      success: true,
      logs,
      pagination: {
        total,
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_items: total,
        items_per_page: parseInt(limit),
        has_prev: page > 1,
        has_next: page < Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs',
      error: error.message
    });
  }
});

// ======================
// ADMIN USER MANAGEMENT (Super Admin Only)
// ======================

// Get all admins
router.get('/admins', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    console.log('📥 GET /api/admin/admins - Fetching all admins');
    
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT id, username, email, full_name, role, is_active, created_at, updated_at
      FROM admin_users
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `);

    console.log('✅ Found', result.recordset.length, 'admins (excluding deleted)');

    res.json({
      success: true,
      admins: result.recordset
    });
  } catch (error) {
    console.error('❌ Error getting admins:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admins'
    });
  }
});

// Create new admin
router.post('/admins', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    console.log('📥 POST /api/admin/admins - Request body:', req.body);
    
    const { username, email, password, full_name, role } = req.body;

    console.log('📥 Create admin request:', { username, email, full_name, role, hasPassword: !!password });

    if (!username || !email) {
      console.log('❌ Validation failed: username or email missing');
      return res.status(400).json({
        success: false,
        message: 'Username and email are required'
      });
    }

    // Check if username or email already exists (including deleted)
    const pool = await sql.connect(dbConfig);
    const existingCheck = await pool.request()
      .input('username', sql.NVarChar, username)
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT id, username, email, deleted_at FROM admin_users 
        WHERE username = @username OR email = @email
      `);

    if (existingCheck.recordset.length > 0) {
      const existing = existingCheck.recordset[0];
      
      // If the admin was previously deleted, restore it
      if (existing.deleted_at) {
        console.log('🔄 Restoring previously deleted admin:', existing.username);
        
        // Generate new temporary password
        const bcrypt = (await import('bcrypt')).default;
        const crypto = (await import('crypto')).default;
        const tempPassword = password || crypto.randomBytes(8).toString('hex');
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        // Restore in admin_users
        await pool.request()
          .input('id', sql.Int, existing.id)
          .input('password_hash', sql.NVarChar, hashedPassword)
          .input('full_name', sql.NVarChar, full_name || null)
          .input('role', sql.NVarChar, role || 'admin')
          .query(`
            UPDATE admin_users 
            SET deleted_at = NULL, is_active = 1, password_hash = @password_hash, 
                full_name = @full_name, role = @role, must_change_password = 1, updated_at = GETDATE()
            WHERE id = @id
          `);
        
        // Restore in admins table
        await pool.request()
          .input('username', sql.NVarChar, existing.username)
          .input('password_hash', sql.NVarChar, hashedPassword)
          .input('full_name', sql.NVarChar, full_name || null)
          .input('role', sql.NVarChar, role || 'admin')
          .query(`
            UPDATE admins 
            SET deleted_at = NULL, is_active = 1, password_hash = @password_hash,
                full_name = @full_name, role = @role, must_change_password = 1, updated_at = GETDATE()
            WHERE username = @username
          `);
        
        // Send email with new credentials
        try {
          await emailService.sendEmail({
            to: existing.email,
            subject: 'Admin Account Restored - SAFE-8',
            html: `
              <h2>Your Admin Account Has Been Restored</h2>
              <p>Your admin account for SAFE-8 has been restored.</p>
              <p><strong>Username:</strong> ${existing.username}</p>
              <p><strong>Temporary Password:</strong> ${tempPassword}</p>
              <p>Please login and change your password immediately.</p>
            `
          });
          console.log('✅ Restoration email sent to:', existing.email);
        } catch (emailError) {
          console.error('❌ Failed to send restoration email:', emailError);
        }
        
        return res.json({
          success: true,
          message: 'Admin account restored successfully',
          admin: {
            id: existing.id,
            username: existing.username,
            email: existing.email,
            full_name: full_name || null,
            role: role || 'admin',
            is_active: true
          },
          tempPassword: tempPassword
        });
      }
      
      // If not deleted, it's a duplicate
      if (existing.username === username) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
      if (existing.email === email) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Generate temporary password if not provided
    const bcrypt = (await import('bcrypt')).default;
    const crypto = (await import('crypto')).default;
    const tempPassword = password || crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    console.log('🔑 Generated temp password for new admin');

    // Insert into admin_users table (for login)
    const insertResult = await pool.request()
      .input('username', sql.NVarChar, username)
      .input('email', sql.NVarChar, email)
      .input('password_hash', sql.NVarChar, hashedPassword)
      .input('full_name', sql.NVarChar, full_name || null)
      .input('role', sql.NVarChar, role || 'admin')
      .query(`
        INSERT INTO admin_users (username, email, password_hash, full_name, role, is_active, must_change_password, created_at, updated_at)
        VALUES (@username, @email, @password_hash, @full_name, @role, 1, 1, GETDATE(), GETDATE());
        SELECT SCOPE_IDENTITY() as id;
      `);

    const adminId = insertResult.recordset[0].id;
    console.log('✅ Inserted into admin_users, ID:', adminId);

    // Also insert into admins table (for super admin management)
    await pool.request()
      .input('username', sql.NVarChar, username)
      .input('email', sql.NVarChar, email)
      .input('password_hash', sql.NVarChar, hashedPassword)
      .input('full_name', sql.NVarChar, full_name || null)
      .input('role', sql.NVarChar, role || 'admin')
      .query(`
        INSERT INTO admins (username, email, password_hash, full_name, role, is_active, created_at, updated_at)
        VALUES (@username, @email, @password_hash, @full_name, @role, 1, GETDATE(), GETDATE());
      `);

    console.log('✅ Inserted into admins table');

    // Send email with credentials
    console.log('📧 Attempting to send email to:', email);
    try {
      const emailResult = await emailService.sendEmail({
        to: email,
        subject: 'Your Admin Account Has Been Created',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #00539F;">Admin Account Created</h2>
            <p>Hello ${full_name || username},</p>
            <p>Your admin account has been created. You can now log in to the admin dashboard.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #00539F; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #00539F;">Login Credentials</h3>
              <p><strong>Username:</strong> ${username}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Temporary Password:</strong> <code style="background: #fff; padding: 4px 8px; border: 1px solid #ddd;">${tempPassword}</code></p>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <p style="margin: 0;"><strong>⚠️ Security Notice:</strong> You will be required to change this password on your first login.</p>
            </div>
            
            <p>If you have any questions, please contact the super administrator.</p>
          </div>
        `
      });
      console.log('✅ Email sent successfully to:', email);
      console.log('📧 Email result:', emailResult);
    } catch (emailError) {
      console.error('❌ Failed to send admin credentials email:', emailError);
      console.error('❌ Email error details:', emailError.message);
      console.error('❌ Email stack:', emailError.stack);
      // Don't fail the admin creation if email fails
    }

    // Log activity
    await Admin.logActivity(req.admin.id, 'CREATE', 'admin', adminId, `Created admin: ${username}`, req.ip, req.headers['user-agent']);

    console.log('✅ Admin created successfully:', username);

    res.json({
      success: true,
      message: 'Admin created successfully',
      adminId,
      tempPassword: !password ? tempPassword : undefined // Only return temp password if it was auto-generated
    });
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating admin'
    });
  }
});

// Deactivate admin
router.post('/admins/:adminId/deactivate', doubleCsrfProtection, authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { adminId } = req.params;

    if (parseInt(adminId) === req.admin.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    const result = await Admin.deactivate(adminId, req.admin.id);

    res.json(result);
  } catch (error) {
    console.error('❌ Error deactivating admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating admin'
    });
  }
});

// Update admin
router.put('/admins/:adminId', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { adminId } = req.params;
    const { username, email, password, full_name, role } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const pool = await sql.connect(dbConfig);
    
    // Get current admin data from admin_users
    const currentAdmin = await pool.request()
      .input('adminId', sql.Int, adminId)
      .query('SELECT * FROM admin_users WHERE id = @adminId');

    if (currentAdmin.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Build update query dynamically
    let updateFields = [];
    let request = pool.request().input('adminId', sql.Int, adminId);

    if (email) {
      updateFields.push('email = @email');
      request.input('email', sql.NVarChar, email);
    }

    if (full_name !== undefined) {
      updateFields.push('full_name = @full_name');
      request.input('full_name', sql.NVarChar, full_name || null);
    }

    if (role) {
      updateFields.push('role = @role');
      request.input('role', sql.NVarChar, role);
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      const bcrypt = (await import('bcrypt')).default;
      hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password_hash = @password_hash');
      request.input('password_hash', sql.NVarChar, hashedPassword);
    }

    updateFields.push('updated_at = GETDATE()');

    const updateQuery = `
      UPDATE admin_users 
      SET ${updateFields.join(', ')}
      WHERE id = @adminId
    `;

    await request.query(updateQuery);

    // Also update in admins table
    let adminUpdateFields = [];
    let adminRequest = pool.request().input('username', sql.NVarChar, currentAdmin.recordset[0].username);

    if (email) {
      adminUpdateFields.push('email = @email');
      adminRequest.input('email', sql.NVarChar, email);
    }

    if (full_name !== undefined) {
      adminUpdateFields.push('full_name = @full_name');
      adminRequest.input('full_name', sql.NVarChar, full_name || null);
    }

    if (role) {
      adminUpdateFields.push('role = @role');
      adminRequest.input('role', sql.NVarChar, role);
    }

    if (hashedPassword) {
      adminUpdateFields.push('password_hash = @password_hash');
      adminRequest.input('password_hash', sql.NVarChar, hashedPassword);
    }

    adminUpdateFields.push('updated_at = GETDATE()');

    const adminUpdateQuery = `
      UPDATE admins 
      SET ${adminUpdateFields.join(', ')}
      WHERE username = @username
    `;

    await adminRequest.query(adminUpdateQuery);

    // Log activity
    await Admin.logActivity(
      req.admin.id,
      'UPDATE',
      'admin',
      adminId,
      `Updated admin: ${currentAdmin.recordset[0].username}`,
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      message: 'Admin updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating admin:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating admin'
    });
  }
});

// Toggle admin status (activate/deactivate)
router.patch('/admins/:adminId/toggle-status', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { adminId } = req.params;

    if (parseInt(adminId) === req.admin.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change status of your own account'
      });
    }

    const pool = await sql.connect(dbConfig);
    
    // Get current status from admin_users
    const currentAdmin = await pool.request()
      .input('adminId', sql.Int, adminId)
      .query('SELECT username, is_active FROM admin_users WHERE id = @adminId');

    if (currentAdmin.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    const currentStatus = currentAdmin.recordset[0].is_active;
    const newStatus = !currentStatus;

    // Update status in admin_users
    await pool.request()
      .input('adminId', sql.Int, adminId)
      .input('newStatus', sql.Bit, newStatus)
      .query('UPDATE admin_users SET is_active = @newStatus, updated_at = GETDATE() WHERE id = @adminId');

    // Also update in admins table
    await pool.request()
      .input('username', sql.NVarChar, currentAdmin.recordset[0].username)
      .input('newStatus', sql.Bit, newStatus)
      .query('UPDATE admins SET is_active = @newStatus, updated_at = GETDATE() WHERE username = @username');

    // Log activity
    await Admin.logActivity(
      req.admin.id,
      newStatus ? 'ACTIVATE' : 'DEACTIVATE',
      'admin',
      adminId,
      `${newStatus ? 'Activated' : 'Deactivated'} admin: ${currentAdmin.recordset[0].username}`,
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      message: `Admin ${newStatus ? 'activated' : 'deactivated'} successfully`,
      is_active: newStatus
    });
  } catch (error) {
    console.error('❌ Error toggling admin status:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling admin status'
    });
  }
});

// Delete admin (soft delete)
router.delete('/admins/:adminId', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { adminId } = req.params;

    if (parseInt(adminId) === req.admin.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const pool = await sql.connect(dbConfig);
    
    // Get admin info before deletion from admin_users
    const adminInfo = await pool.request()
      .input('adminId', sql.Int, adminId)
      .query('SELECT username FROM admin_users WHERE id = @adminId');

    if (adminInfo.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Soft delete: mark as deleted with timestamp in admin_users
    await pool.request()
      .input('adminId', sql.Int, adminId)
      .query('UPDATE admin_users SET deleted_at = GETDATE(), is_active = 0, updated_at = GETDATE() WHERE id = @adminId');

    // Also soft delete in admins table
    await pool.request()
      .input('username', sql.NVarChar, adminInfo.recordset[0].username)
      .query('UPDATE admins SET deleted_at = GETDATE(), is_active = 0, updated_at = GETDATE() WHERE username = @username');

    // Log activity
    await Admin.logActivity(
      req.admin.id,
      'DELETE',
      'admin',
      adminId,
      `Deleted admin: ${adminInfo.recordset[0].username}`,
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting admin'
    });
  }
});


// ======================
// USER CRUD (Missing Endpoints)
// ======================

// Create new user
router.post('/users', authenticateAdmin, async (req, res) => {
  console.log('📥 POST /api/admin/users - Request received');
  console.log('Request body:', req.body);
  
  try {
    const { contact_name, email, company_name, company_size, country, industry, job_title, phone_number, first_name, last_name } = req.body;

    console.log('Extracted fields:', { contact_name, email, company_name, company_size, country, industry, job_title, phone_number, first_name, last_name });

    // Validate required fields (password no longer required - will be auto-generated)
    if (!contact_name || !email) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Contact name and email are required'
      });
    }

    console.log('✅ Validation passed, checking for existing email...');
    
    // Check if email already exists
    const existingUser = await Lead.getByEmail(email);
    if (existingUser) {
      console.log('❌ Email already exists:', email);
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    console.log('✅ Email is unique, generating temporary password...');
    
    // Generate secure temporary password (12 characters: uppercase, lowercase, numbers, symbols)
    const generateTempPassword = () => {
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const numbers = '0123456789';
      const symbols = '!@#$%^&*';
      const allChars = uppercase + lowercase + numbers + symbols;
      
      let password = '';
      // Ensure at least one of each type
      password += uppercase[crypto.randomInt(0, uppercase.length)];
      password += lowercase[crypto.randomInt(0, lowercase.length)];
      password += numbers[crypto.randomInt(0, numbers.length)];
      password += symbols[crypto.randomInt(0, symbols.length)];
      
      // Fill remaining 8 characters randomly
      for (let i = 0; i < 8; i++) {
        password += allChars[crypto.randomInt(0, allChars.length)];
      }
      
      // Shuffle the password
      return password.split('').sort(() => Math.random() - 0.5).join('');
    };
    
    const tempPassword = generateTempPassword();
    console.log('✅ Temporary password generated');
    
    // Create new user
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    console.log('✅ Password hashed, inserting into database...');

    const sql = `
      INSERT INTO leads (contact_name, email, company_name, company_size, country, industry, job_title, phone_number, password_hash, password_must_change, password_created_at, created_at)
      OUTPUT INSERTED.id, INSERTED.contact_name, INSERTED.email, INSERTED.company_name, INSERTED.company_size, INSERTED.country, INSERTED.industry, INSERTED.job_title, INSERTED.phone_number, INSERTED.created_at
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, GETDATE(), GETDATE());
    `;

    const result = await database.query(sql, [
      contact_name,
      email,
      company_name || null,
      company_size || null,
      country || null,
      industry || null,
      job_title || null,
      phone_number || null,
      passwordHash
    ]);

    console.log('✅ Database insert successful');
    
    const newUser = result.recordset[0];

    console.log('📧 Sending welcome email with temporary password...');
    console.log('📧 Email will be sent to:', newUser.email);
    console.log('📧 Contact name:', newUser.contact_name);
    console.log('📧 First name:', first_name);
    
    // Send email with temporary password
    try {
      const emailData = {
        email: newUser.email,
        contact_name: newUser.contact_name,
        first_name: first_name || newUser.contact_name.split(' ')[0],
        company_name: newUser.company_name
      };
      
      console.log('📧 Email data being sent to service:', JSON.stringify(emailData, null, 2));
      
      const emailResult = await emailService.sendAdminCreatedUserEmail(
        emailData,
        tempPassword
      );
      
      console.log('📧 Email service result:', emailResult);
      
      if (emailResult.success) {
        console.log('✅ Welcome email sent successfully to:', emailResult.recipient);
      } else {
        console.warn('⚠️ Welcome email failed but continuing:', emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Error sending welcome email:', emailError);
      console.error('❌ Email error details:', emailError.message);
      // Continue anyway - user creation succeeded
    }

    console.log('📝 Logging admin activity...');
    
    await Admin.logActivity(
      req.admin.id,
      'CREATE',
      'user',
      newUser.id,
      `Created new user: ${email}`,
      req.ip,
      req.headers['user-agent']
    );

    console.log('✅ User created by admin:', newUser.email);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser,
      tempPassword: tempPassword // Return temp password to display to admin
    });
  } catch (error) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  }
});

// Update user
router.put('/users/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { contact_name, email, company_name, company_size, country, industry, job_title, phone_number, password } = req.body;

    // Check if user exists
    const existingUser = await Lead.getById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If email is being changed, check for duplicates
    if (email && email !== existingUser.email) {
      const emailCheck = await Lead.getByEmail(email);
      if (emailCheck && emailCheck.id !== parseInt(userId)) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Build update query
    const updates = [];
    const params = [];

    if (contact_name !== undefined) {
      updates.push('contact_name = ?');
      params.push(contact_name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (company_name !== undefined) {
      updates.push('company_name = ?');
      params.push(company_name);
    }
    if (company_size !== undefined) {
      updates.push('company_size = ?');
      params.push(company_size);
    }
    if (country !== undefined) {
      updates.push('country = ?');
      params.push(country);
    }
    if (industry !== undefined) {
      updates.push('industry = ?');
      params.push(industry);
    }
    if (job_title !== undefined) {
      updates.push('job_title = ?');
      params.push(job_title);
    }
    if (phone_number !== undefined) {
      updates.push('phone_number = ?');
      params.push(phone_number);
    }
    if (password) {
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(password, 12);
      updates.push('password_hash = ?');
      params.push(passwordHash);
      updates.push('password_updated_at = GETDATE()');
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push('updated_at = GETDATE()');
    params.push(userId);

    const sql = `
      UPDATE leads
      SET ${updates.join(', ')}
      OUTPUT INSERTED.id, INSERTED.contact_name, INSERTED.email, INSERTED.company_name, INSERTED.company_size, INSERTED.country, INSERTED.industry, INSERTED.job_title, INSERTED.phone_number, INSERTED.updated_at
      WHERE id = ?;
    `;

    const result = await database.query(sql, params);
    const updatedUser = result.recordset[0];

    await Admin.logActivity(
      req.admin.id,
      'UPDATE',
      'user',
      userId,
      `Updated user: ${updatedUser.email}`,
      req.ip,
      req.headers['user-agent']
    );

    console.log('✅ User updated by admin:', updatedUser.email);

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
});

// Delete user (soft delete)
router.delete('/users/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await Lead.getById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete - mark email as deleted to prevent re-registration with same email
    const deletedEmail = `deleted_${Date.now()}_${user.email}`;
    const sql = `
      UPDATE leads
      SET email = ?,
          contact_name = 'DELETED USER',
          company_name = 'DELETED',
          updated_at = GETDATE()
      WHERE id = ?;
    `;

    await database.query(sql, [deletedEmail, userId]);

    await Admin.logActivity(
      req.admin.id,
      'DELETE',
      'user',
      userId,
      `Deleted user: ${user.email}`,
      req.ip,
      req.headers['user-agent']
    );

    console.log('✅ User deleted by admin:', user.email);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
});

// ======================
// ASSESSMENT MANAGEMENT (Missing Endpoints)
// ======================

// Get all assessments with pagination and filters
router.get('/assessments', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, assessment_type, lead_id } = req.query;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';

    if (assessment_type && assessment_type !== 'all') {
      const escapedType = assessment_type.toUpperCase().replace(/'/g, "''");
      whereClause += ` AND a.assessment_type = '${escapedType}'`;
    }

    if (lead_id) {
      whereClause += ` AND a.lead_id = ${parseInt(lead_id)}`;
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM assessments a ${whereClause}`;
    const countResult = await database.query(countSql);
    const total = Array.isArray(countResult) ? countResult[0].total : countResult.recordset[0].total;

    // Get assessments with dimension_scores
    const sql = `
      SELECT 
        a.id,
        a.lead_id,
        l.contact_name as user_name,
        l.email as user_email,
        a.assessment_type,
        a.industry,
        a.overall_score,
        a.dimension_scores,
        a.responses,
        a.insights,
        a.completed_at,
        a.created_at
      FROM assessments a
      LEFT JOIN leads l ON a.lead_id = l.id
      ${whereClause}
      ORDER BY a.completed_at DESC
      OFFSET ${offset} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY
    `;

    const result = await database.query(sql);
    const assessments = Array.isArray(result) ? result : result.recordset;

    res.json({
      success: true,
      assessments: assessments,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit),
        has_prev: page > 1,
        has_next: page < Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error getting assessments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assessments'
    });
  }
});

// Export assessment as PDF
router.get('/assessments/:assessmentId/export-pdf', authenticateAdmin, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const id = parseInt(assessmentId);

    // Get assessment with user details
    const sql = `
      SELECT 
        a.*,
        l.contact_name,
        l.email,
        l.company_name,
        l.job_title
      FROM assessments a
      LEFT JOIN leads l ON a.lead_id = l.id
      WHERE a.id = @param1
    `;
    
    const result = await database.query(sql, [id]);
    const assessment = Array.isArray(result) ? result[0] : result.recordset[0];
    
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    // Prepare user data
    const userData = {
      contact_name: assessment.contact_name,
      email: assessment.email,
      company_name: assessment.company_name,
      job_title: assessment.job_title
    };

    // Prepare assessment data - with enhanced error handling
    let dimension_scores_parsed = [];
    if (assessment.dimension_scores) {
      if (typeof assessment.dimension_scores === 'string') {
        try {
          dimension_scores_parsed = JSON.parse(assessment.dimension_scores);
        } catch (e) {
          console.error('Failed to parse dimension_scores', e.message);
        }
      } else if (Array.isArray(assessment.dimension_scores)) {
        dimension_scores_parsed = assessment.dimension_scores;
      }
    }

    let insights_parsed = {};
    if (assessment.insights) {
      if (typeof assessment.insights === 'string') {
        try {
          insights_parsed = JSON.parse(assessment.insights);
        } catch (e) {
          console.error('Failed to parse insights', e.message);
        }
      } else if (typeof assessment.insights === 'object') {
        insights_parsed = assessment.insights;
      }
    }

    const assessmentData = {
      overall_score: parseFloat(assessment.overall_score),
      dimension_scores: dimension_scores_parsed,
      insights: insights_parsed,
      assessment_type: assessment.assessment_type || 'GENERAL',
      completed_at: assessment.completed_at || new Date()
    };

    // Generate PDF buffer
    const pdfBuffer = await generateAssessmentPDFBuffer(userData, assessmentData);

    // Set headers for PDF download
    const filename = `SAFE-8_Assessment_${assessment.contact_name.replace(/\s+/g, '_')}_${assessmentId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    console.log('✅ Generated PDF export for assessment:', assessmentId);

    // Send PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    console.error('❌ Error exporting assessment PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting assessment PDF',
      error: error.message
    });
  }
});

// Get single assessment by ID
router.get('/assessments/:assessmentId', authenticateAdmin, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const id = parseInt(assessmentId);

    const sql = `
      SELECT 
        a.*,
        l.contact_name as user_name,
        l.email as user_email,
        l.company_name
      FROM assessments a
      LEFT JOIN leads l ON a.lead_id = l.id
      WHERE a.id = @param1
    `;
    
    const result = await database.query(sql, [id]);
    const assessment = Array.isArray(result) ? result[0] : result.recordset[0];
    
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    console.log('✅ Loaded assessment details:', assessmentId);

    res.json({
      success: true,
      assessment: assessment
    });
  } catch (error) {
    console.error('❌ Error getting assessment details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assessment details'
    });
  }
});

// Delete assessment
router.delete('/assessments/:assessmentId', authenticateAdmin, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const id = parseInt(assessmentId);

    // Check if assessment exists
    const checkSql = `SELECT * FROM assessments WHERE id = @param1`;
    const checkResult = await database.query(checkSql, [id]);
    const assessment = Array.isArray(checkResult) ? checkResult[0] : checkResult.recordset[0];
    
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    // Delete assessment (responses table doesn't exist or isn't used)
    const deleteAssessmentSql = `DELETE FROM assessments WHERE id = @param1`;
    await database.query(deleteAssessmentSql, [id]);

    await Admin.logActivity(
      req.admin.id,
      'DELETE',
      'assessment',
      assessmentId,
      `Deleted assessment: ${assessment.assessment_type} (ID: ${assessmentId})`,
      req.ip,
      req.headers['user-agent']
    );

    console.log('✅ Assessment deleted by admin:', assessmentId);

    res.json({
      success: true,
      message: 'Assessment deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting assessment'
    });
  }
});

// ======================
// QUESTION REORDERING (Missing Endpoint)
// ======================

// Reorder question
router.put('/questions/:questionId/reorder', authenticateAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;
    const { direction, newOrder } = req.body; // 'up' or 'down' OR direct newOrder

    console.log('📋 Reorder request received:', { questionId, direction, newOrder, body: req.body });

    // Get current question
    const getQuestionSql = `SELECT * FROM assessment_questions WHERE id = ?;`;
    const questionResult = await database.query(getQuestionSql, [questionId]);
    
    if (questionResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    const currentQuestion = questionResult.recordset[0];
    const currentOrder = currentQuestion.question_order;

    // Handle direct order assignment (drag and drop)
    if (newOrder !== undefined && newOrder !== null) {
      if (newOrder < 1) {
        return res.status(400).json({
          success: false,
          message: 'Order must be at least 1'
        });
      }

      // Find question at target position (same type and pillar)
      const findTargetSql = `
        SELECT id, question_order FROM assessment_questions 
        WHERE assessment_type = ? 
        AND pillar_name = ? 
        AND question_order = ?
        AND id != ?;
      `;
      const targetResult = await database.query(findTargetSql, [
        currentQuestion.assessment_type,
        currentQuestion.pillar_name,
        newOrder,
        questionId
      ]);

      if (targetResult.recordset.length > 0) {
        const targetQuestionId = targetResult.recordset[0].id;
        
        // Use a 3-step swap to avoid unique constraint violation:
        // 1. Set dragged question to a temporary negative value
        await database.query(
          `UPDATE assessment_questions SET question_order = ? WHERE id = ?;`,
          [-1, questionId]
        );
        
        // 2. Set target question to dragged question's old position
        await database.query(
          `UPDATE assessment_questions SET question_order = ? WHERE id = ?;`,
          [currentOrder, targetQuestionId]
        );
        
        // 3. Set dragged question to its new position
        await database.query(
          `UPDATE assessment_questions SET question_order = ? WHERE id = ?;`,
          [newOrder, questionId]
        );
      } else {
        // No swap needed, just update
        await database.query(
          `UPDATE assessment_questions SET question_order = ? WHERE id = ?;`,
          [newOrder, questionId]
        );
      }

      await Admin.logActivity(
        req.admin.id,
        'UPDATE',
        'question',
        questionId,
        `Reordered question to position ${newOrder}: ${currentQuestion.question_text.substring(0, 50)}...`,
        req.ip,
        req.headers['user-agent']
      );

      console.log('✅ Question reordered to position:', questionId, newOrder);

      return res.json({
        success: true,
        message: 'Question reordered successfully',
        newOrder: newOrder
      });
    }

    // Handle direction-based reordering (arrow buttons)
    if (!direction || !['up', 'down'].includes(direction)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid direction. Must be "up" or "down", or provide newOrder'
      });
    }

    const targetOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;

    if (targetOrder < 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot move question further up'
      });
    }

    // Find question at target position
    const findTargetSql = `
      SELECT id FROM assessment_questions 
      WHERE assessment_type = ? 
      AND pillar_name = ? 
      AND question_order = ?;
    `;
    const targetResult = await database.query(findTargetSql, [
      currentQuestion.assessment_type,
      currentQuestion.pillar_name,
      targetOrder
    ]);

    if (targetResult.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot move question further in that direction'
      });
    }

    const targetQuestionId = targetResult.recordset[0].id;

    // Use a 3-step swap to avoid unique constraint violation:
    // 1. Set current question to a temporary negative value
    await database.query(
      `UPDATE assessment_questions SET question_order = ? WHERE id = ?;`,
      [-1, questionId]
    );
    
    // 2. Set target question to current question's old position
    await database.query(
      `UPDATE assessment_questions SET question_order = ? WHERE id = ?;`,
      [currentOrder, targetQuestionId]
    );
    
    // 3. Set current question to its new position
    await database.query(
      `UPDATE assessment_questions SET question_order = ? WHERE id = ?;`,
      [targetOrder, questionId]
    );

    await Admin.logActivity(
      req.admin.id,
      'UPDATE',
      'question',
      questionId,
      `Reordered question ${direction}: ${currentQuestion.question_text.substring(0, 50)}...`,
      req.ip,
      req.headers['user-agent']
    );

    console.log('✅ Question reordered:', questionId, direction);

    res.json({
      success: true,
      message: 'Question reordered successfully'
    });
  } catch (error) {
    console.error('❌ Error reordering question:', error);
    res.status(500).json({
      success: false,
      message: 'Error reordering question'
    });
  }
});

// ======================
// CONFIGURATION MANAGEMENT
// ======================

// Get all assessment types with full configuration
router.get('/config/assessment-types', authenticateAdmin, async (req, res) => {
  try {
    // Always get all types from questions table (source of truth for what exists)
    const questionsSql = `
      SELECT DISTINCT assessment_type
      FROM assessment_questions
      WHERE is_active = 1
      ORDER BY assessment_type;
    `;
    const questionsResult = await database.query(questionsSql);
    const allTypes = Array.isArray(questionsResult) ? questionsResult.map(r => r.assessment_type) : [];

    // Check if config table exists
    const tableCheckSql = `
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'assessment_types_config'
    `;
    const tableCheck = await database.query(tableCheckSql);
    const tableExists = (tableCheck?.recordset || tableCheck)[0]?.count > 0;

    let assessmentTypeConfigs = [];

    if (tableExists) {
      // Get config data for types that have it
      const configSql = `
        SELECT 
          assessment_type,
          title,
          description,
          duration,
          icon,
          features,
          audience,
          audience_color,
          display_order,
          is_active
        FROM assessment_types_config
        WHERE is_active = 1
        ORDER BY display_order, assessment_type;
      `;
      const configResult = await database.query(configSql);
      const configs = configResult?.recordset || configResult;
      
      assessmentTypeConfigs = Array.isArray(configs) ? configs.map(c => ({
        type: c.assessment_type,
        title: c.title,
        description: c.description,
        duration: c.duration,
        icon: c.icon,
        features: c.features ? JSON.parse(c.features) : [],
        audience: c.audience,
        audienceColor: c.audience_color
      })) : [];
    }
    
    res.json({
      success: true,
      assessmentTypes: allTypes,
      assessmentTypeConfigs: assessmentTypeConfigs
    });
  } catch (error) {
    console.error('❌ Error getting assessment types:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assessment types'
    });
  }
});

// Get all industries
router.get('/config/industries', authenticateAdmin, async (req, res) => {
  try {
    // Check cache first (5 min TTL) - saves Azure SQL queries
    const cacheKey = 'config:industries';
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('⚡ Cache hit: industries');
      return res.json(cached);
    }

    // Check if industries table exists
    const checkTableSql = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'industries';
    `;
    const tableCheck = await database.query(checkTableSql);
    
    if (!Array.isArray(tableCheck) || tableCheck.length === 0) {
      // Return default industries as strings
      return res.json({
        success: true,
        industries: [
          'Financial Services',
          'Technology',
          'Healthcare',
          'Manufacturing',
          'Retail & E-commerce',
          'Energy & Utilities',
          'Government',
          'Education',
          'Professional Services',
          'Other'
        ]
      });
    }
    
    // Get custom industries from database
    const sql = `
      SELECT id, name, is_active
      FROM industries
      WHERE is_active = 1
      ORDER BY name;
    `;
    const result = await database.query(sql);
    
    // Combine default + custom industries
    const defaultIndustries = [
      { id: 'default-1', name: 'Financial Services', is_active: true },
      { id: 'default-2', name: 'Technology', is_active: true },
      { id: 'default-3', name: 'Healthcare', is_active: true },
      { id: 'default-4', name: 'Manufacturing', is_active: true },
      { id: 'default-5', name: 'Retail & E-commerce', is_active: true },
      { id: 'default-6', name: 'Energy & Utilities', is_active: true },
      { id: 'default-7', name: 'Government', is_active: true },
      { id: 'default-8', name: 'Education', is_active: true },
      { id: 'default-9', name: 'Professional Services', is_active: true },
      { id: 'default-10', name: 'Other', is_active: true }
    ];
    
    const customIndustries = Array.isArray(result) ? result : [];
    
    // Remove duplicates - prioritize custom industries over defaults
    const customIndustryNames = new Set(customIndustries.map(i => i.name));
    const uniqueDefaults = defaultIndustries.filter(d => !customIndustryNames.has(d.name));
    
    const allIndustries = [...uniqueDefaults, ...customIndustries];
    
    const response = {
      success: true,
      industries: allIndustries
    };
    
    // Cache for 5 minutes
    cache.set(cacheKey, response, 300);
    
    res.json(response);
  } catch (error) {
    console.error('❌ Error getting industries:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching industries'
    });
  }
});

// Create new assessment type with full configuration
router.post('/config/assessment-types', authenticateAdmin, async (req, res) => {
  try {
    const { 
      assessment_type, 
      title,
      description, 
      duration,
      icon,
      features,
      audience,
      audience_color
    } = req.body;

    if (!assessment_type) {
      return res.status(400).json({
        success: false,
        message: 'Assessment type is required'
      });
    }

    const typeUpper = assessment_type.toUpperCase();

    // Check if already exists in questions table (including inactive ones)
    const checkSql = `
      SELECT COUNT(*) as count
      FROM assessment_questions
      WHERE assessment_type = ?;
    `;
    const checkResult = await database.query(checkSql, [typeUpper]);
    console.log('🔍 Assessment type existence check:', JSON.stringify(checkResult, null, 2));
    
    // Handle result.recordset from parameterized queries
    const checkArray = checkResult?.recordset || checkResult;
    if (Array.isArray(checkArray) && checkArray[0] && checkArray[0].count > 0) {
      return res.status(409).json({
        success: false,
        message: 'Assessment type already exists. If you recently deleted it, please use a different name or wait a moment.'
      });
    }

    // Also check config table
    const configCheckSql = `
      IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'assessment_types_config')
      BEGIN
        SELECT COUNT(*) as count
        FROM assessment_types_config
        WHERE assessment_type = ?;
      END
      ELSE
      BEGIN
        SELECT 0 as count;
      END
    `;
    const configCheckResult = await database.query(configCheckSql, [typeUpper]);
    const configCheckArray = configCheckResult?.recordset || configCheckResult;
    if (Array.isArray(configCheckArray) && configCheckArray[0] && configCheckArray[0].count > 0) {
      return res.status(409).json({
        success: false,
        message: 'Assessment type already exists in configuration. Please use a different name.'
      });
    }

    // Check if config table exists, create if not
    const createTableSql = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'assessment_types_config')
      BEGIN
        CREATE TABLE assessment_types_config (
          id INT PRIMARY KEY IDENTITY(1,1),
          assessment_type NVARCHAR(50) NOT NULL UNIQUE,
          title NVARCHAR(100) NOT NULL,
          description NVARCHAR(MAX),
          duration NVARCHAR(50),
          icon NVARCHAR(50),
          features NVARCHAR(MAX),
          audience NVARCHAR(100),
          audience_color NVARCHAR(20),
          is_active BIT DEFAULT 1,
          display_order INT DEFAULT 0,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE(),
          created_by INT
        );
      END
    `;
    await database.query(createTableSql);

    // Insert into config table with metadata
    const configSql = `
      INSERT INTO assessment_types_config 
        (assessment_type, title, description, duration, icon, features, audience, audience_color, created_by, display_order)
      OUTPUT INSERTED.id
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 
        (SELECT ISNULL(MAX(display_order), 0) + 1 FROM assessment_types_config));
    `;

    const featuresJson = Array.isArray(features) ? JSON.stringify(features) : '[]';

    const configResult = await database.query(configSql, [
      typeUpper,
      title || `${typeUpper} Assessment`,
      description || '',
      duration || '~10 minutes',
      icon || 'fas fa-clipboard-check',
      featuresJson,
      audience || 'All Users',
      audience_color || 'blue',
      req.admin.id
    ]);

    // Create a placeholder question for the new assessment type
    const questionSql = `
      INSERT INTO assessment_questions (
        assessment_type, pillar_name, pillar_short_name, question_text, question_order, created_by, is_active
      )
      OUTPUT INSERTED.id
      VALUES (?, 'Strategy', 'STRAT', ?, 1, ?, 1);
    `;

    const questionResult = await database.query(questionSql, [
      typeUpper,
      description || `Sample question for ${typeUpper} assessment`,
      req.admin.id
    ]);
    
    const resultArray = questionResult?.recordset || questionResult;
    const questionId = Array.isArray(resultArray) && resultArray[0] ? resultArray[0].id : null;

    await Admin.logActivity(
      req.admin.id,
      'CREATE',
      'assessment_type',
      questionId,
      `Created new assessment type with configuration: ${typeUpper}`,
      req.ip,
      req.headers['user-agent']
    );

    console.log('✅ Assessment type created with full configuration:', typeUpper);

    res.json({
      success: true,
      message: 'Assessment type created successfully with card configuration',
      assessmentType: typeUpper
    });
  } catch (error) {
    console.error('❌ Error creating assessment type:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating assessment type',
      error: error.message
    });
  }
});

// Update assessment type
router.put('/config/assessment-types/:oldType', authenticateAdmin, async (req, res) => {
  try {
    const { oldType } = req.params;
    const { new_type } = req.body;

    if (!new_type) {
      return res.status(400).json({
        success: false,
        message: 'New assessment type name is required'
      });
    }

    const newTypeUpper = new_type.toUpperCase();
    const oldTypeUpper = oldType.toUpperCase();

    // Check if new type already exists
    const checkSql = `
      SELECT COUNT(*) as count
      FROM assessment_questions
      WHERE assessment_type = ?;
    `;
    const checkResult = await database.query(checkSql, [newTypeUpper]);
    console.log('🔍 Assessment type check result:', JSON.stringify(checkResult, null, 2));
    
    // Handle result.recordset from parameterized queries
    const checkArray = checkResult?.recordset || checkResult;
    if (Array.isArray(checkArray) && checkArray[0] && checkArray[0].count > 0 && newTypeUpper !== oldTypeUpper) {
      return res.status(409).json({
        success: false,
        message: 'Assessment type already exists'
      });
    }

    // Update all questions with this assessment type
    const sql = `
      UPDATE assessment_questions
      SET assessment_type = ?
      WHERE assessment_type = ?;
    `;

    await database.query(sql, [newTypeUpper, oldTypeUpper]);

    // Update all assessments with this type
    const updateAssessmentsSql = `
      UPDATE assessments
      SET assessment_type = ?
      WHERE assessment_type = ?;
    `;

    await database.query(updateAssessmentsSql, [newTypeUpper, oldTypeUpper]);

    await Admin.logActivity(
      req.admin.id,
      'UPDATE',
      'assessment_type',
      null,
      `Updated assessment type from ${oldTypeUpper} to ${newTypeUpper}`,
      req.ip,
      req.headers['user-agent']
    );

    console.log('✅ Assessment type updated:', oldTypeUpper, '->', newTypeUpper);

    res.json({
      success: true,
      message: 'Assessment type updated successfully',
      assessmentType: newTypeUpper
    });
  } catch (error) {
    console.error('❌ Error updating assessment type:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating assessment type'
    });
  }
});

// Delete assessment type (soft delete by deactivating all questions)
router.delete('/config/assessment-types/:assessmentType', authenticateAdmin, async (req, res) => {
  try {
    const { assessmentType } = req.params;
    const assessmentTypeUpper = assessmentType.toUpperCase();

    // Soft delete by setting is_active = 0 for all questions of this type
    const sql = `
      UPDATE assessment_questions
      SET is_active = 0
      WHERE assessment_type = ?;
    `;

    await database.query(sql, [assessmentTypeUpper]);

    // Also delete from config table if it exists
    const deleteConfigSql = `
      IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'assessment_types_config')
      BEGIN
        DELETE FROM assessment_types_config
        WHERE assessment_type = ?;
      END
    `;

    await database.query(deleteConfigSql, [assessmentTypeUpper]);

    await Admin.logActivity(
      req.admin.id,
      'DELETE',
      'assessment_type',
      null,
      `Deleted assessment type: ${assessmentTypeUpper}`,
      req.ip,
      req.headers['user-agent']
    );

    console.log('✅ Assessment type deleted:', assessmentTypeUpper);

    res.json({
      success: true,
      message: 'Assessment type deleted successfully (all questions deactivated)'
    });
  } catch (error) {
    console.error('❌ Error deleting assessment type:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting assessment type'
    });
  }
});

// Add new industry
router.post('/config/industries', authenticateAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Industry name is required'
      });
    }

    // Create industries table if it doesn't exist
    const createTableSql = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'industries')
      BEGIN
        CREATE TABLE industries (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100) NOT NULL UNIQUE,
          is_active BIT DEFAULT 1,
          created_at DATETIME2 DEFAULT GETDATE(),
          created_by NVARCHAR(50)
        );
      END
    `;
    await database.query(createTableSql);

    // Insert new industry
    const sql = `
      INSERT INTO industries (name, created_by)
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.is_active
      VALUES (?, ?);
    `;

    console.log('🔍 Executing industry insert with name:', name, 'admin:', req.admin.id);
    const result = await database.query(sql, [name, req.admin.id]);
    console.log('🔍 Raw result from database:', JSON.stringify(result, null, 2));
    
    // Handle result - could be result.recordset or direct array
    let industry = null;
    if (result && result.recordset && Array.isArray(result.recordset) && result.recordset.length > 0) {
      industry = result.recordset[0];
    } else if (Array.isArray(result) && result.length > 0) {
      industry = result[0];
    }
    
    console.log('🔍 Parsed industry:', industry);

    if (!industry || !industry.id) {
      console.error('❌ Failed to get industry from result. Result was:', result);
      // Still return success but with warning
      return res.json({
        success: true,
        message: 'Industry created successfully (verification pending)',
        industry: { name, is_active: true }
      });
    }

    // Log activity (non-blocking)
    try {
      await Admin.logActivity(
        req.admin.id,
        'CREATE',
        'industry',
        industry.id,
        `Created new industry: ${name}`,
        req.ip,
        req.headers['user-agent']
      );
    } catch (logError) {
      console.warn('⚠️ Failed to log activity:', logError.message);
    }

    console.log('✅ Industry created successfully:', industry);

    // Invalidate cache
    cache.delete('config:industries');

    res.json({
      success: true,
      message: 'Industry created successfully',
      industry
    });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json({
        success: false,
        message: 'Industry already exists'
      });
    }
    console.error('❌ Error creating industry:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Error creating industry',
      error: error.message // Send error to client for debugging
    });
  }
});

// Update industry
router.put('/config/industries/:industryId', authenticateAdmin, async (req, res) => {
  try {
    const { industryId } = req.params;
    const { name, is_active } = req.body;

    // Check if trying to update a default industry
    if (industryId && industryId.startsWith('default-')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify default industries'
      });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(industryId);

    const sql = `
      UPDATE industries
      SET ${updates.join(', ')}
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.is_active
      WHERE id = ?;
    `;

    const result = await database.query(sql, params);
    console.log('🔍 Update result:', JSON.stringify(result, null, 2));

    // Handle result.recordset from parameterized queries
    const resultArray = result?.recordset || result;
    if (!Array.isArray(resultArray) || resultArray.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Industry not found'
      });
    }

    const industry = resultArray[0];

    await Admin.logActivity(
      req.admin.id,
      'UPDATE',
      'industry',
      industryId,
      `Updated industry: ${industry.name}`,
      req.ip,
      req.headers['user-agent']
    );

    console.log('✅ Industry updated:', industry.name);

    // Invalidate cache
    cache.delete('config:industries');

    res.json({
      success: true,
      message: 'Industry updated successfully',
      industry
    });
  } catch (error) {
    console.error('❌ Error updating industry:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating industry'
    });
  }
});

// Delete industry
router.delete('/config/industries/:industryId', authenticateAdmin, async (req, res) => {
  try {
    const { industryId } = req.params;

    // Check if trying to delete a default industry
    if (industryId && industryId.startsWith('default-')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete default industries'
      });
    }

    // Soft delete by setting is_active = 0
    const sql = `
      UPDATE industries
      SET is_active = 0
      OUTPUT DELETED.name
      WHERE id = ?;
    `;

    const result = await database.query(sql, [industryId]);
    console.log('🔍 Delete result:', JSON.stringify(result, null, 2));

    // Handle result.recordset from parameterized queries
    const resultArray = result?.recordset || result;
    if (!Array.isArray(resultArray) || resultArray.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Industry not found'
      });
    }

    const industryName = resultArray[0].name;

    await Admin.logActivity(
      req.admin.id,
      'DELETE',
      'industry',
      industryId,
      `Deleted industry: ${industryName}`,
      req.ip,
      req.headers['user-agent']
    );

    console.log('✅ Industry deleted:', industryName);

    // Invalidate cache
    cache.delete('config:industries');

    res.json({
      success: true,
      message: 'Industry deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting industry:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting industry'
    });
  }
});

// ======================
// PILLAR MANAGEMENT
// ======================

// Get all pillars
router.get('/config/pillars', authenticateAdmin, async (req, res) => {
  try {
    // Always get pillars from assessment_questions as the base
    const questionPillarsSql = `
      SELECT DISTINCT pillar_name as name, pillar_short_name as short_name
      FROM assessment_questions
      WHERE is_active = 1
      ORDER BY pillar_name;
    `;
    const questionPillars = await database.query(questionPillarsSql);
    
    // Check if custom pillars table exists
    const checkTableSql = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'pillars';
    `;
    const tableCheck = await database.query(checkTableSql);
    
    if (!Array.isArray(tableCheck) || tableCheck.length === 0) {
      // Return only pillars from questions with IDs
      const pillarsWithIds = Array.isArray(questionPillars) 
        ? questionPillars.map((p, index) => ({ 
            id: `question-${index + 1}`, 
            ...p 
          })) 
        : [];
      return res.json({
        success: true,
        pillars: pillarsWithIds
      });
    }
    
    // Get custom pillars from table
    const customPillarsSql = `
      SELECT id, name, short_name, is_active
      FROM pillars
      WHERE is_active = 1
      ORDER BY name;
    `;
    const customPillars = await database.query(customPillarsSql);
    
    // Combine question pillars + custom pillars, removing duplicates
    // Prioritize custom pillars (they have real IDs)
    const basePillars = Array.isArray(questionPillars) ? questionPillars : [];
    const customList = Array.isArray(customPillars) ? customPillars : [];
    
    // Create a map of pillar names from custom pillars
    const customPillarNames = new Set(customList.map(p => p.name));
    
    // Filter out question pillars that already exist in custom pillars
    const uniqueQuestionPillars = basePillars
      .filter(p => !customPillarNames.has(p.name))
      .map((p, index) => ({ 
        id: `question-${index + 1}`, 
        ...p 
      }));
    
    const allPillars = [...uniqueQuestionPillars, ...customList];
    
    res.json({
      success: true,
      pillars: allPillars
    });
  } catch (error) {
    console.error('❌ Error getting pillars:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pillars'
    });
  }
});

// Create new pillar
router.post('/config/pillars', authenticateAdmin, async (req, res) => {
  try {
    const { name, short_name } = req.body;

    if (!name || !short_name) {
      return res.status(400).json({
        success: false,
        message: 'Pillar name and short name are required'
      });
    }

    // Create pillars table if it doesn't exist
    const createTableSql = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'pillars')
      BEGIN
        CREATE TABLE pillars (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100) NOT NULL UNIQUE,
          short_name NVARCHAR(10) NOT NULL UNIQUE,
          is_active BIT DEFAULT 1,
          created_at DATETIME2 DEFAULT GETDATE(),
          created_by NVARCHAR(50)
        );
      END
    `;
    await database.query(createTableSql);

    // Insert new pillar
    const sql = `
      INSERT INTO pillars (name, short_name, created_by)
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.short_name, INSERTED.is_active
      VALUES (?, ?, ?);
    `;

    const result = await database.query(sql, [name, short_name.toUpperCase(), req.admin.id]);
    console.log('🔍 Pillar create result:', JSON.stringify(result, null, 2));
    
    // Handle result.recordset from parameterized queries
    const resultArray = result?.recordset || result;
    const pillar = Array.isArray(resultArray) && resultArray[0] ? resultArray[0] : null;

    if (!pillar || !pillar.id) {
      return res.json({
        success: true,
        message: 'Pillar created successfully',
        pillar: { name, short_name: short_name.toUpperCase(), is_active: true }
      });
    }

    await Admin.logActivity(
      req.admin.id,
      'CREATE',
      'pillar',
      pillar.id,
      `Created new pillar: ${name} (${short_name})`,
      req.ip,
      req.headers['user-agent']
    );

    console.log('✅ Pillar created:', name);

    res.json({
      success: true,
      message: 'Pillar created successfully',
      pillar
    });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json({
        success: false,
        message: 'Pillar name or short name already exists'
      });
    }
    console.error('❌ Error creating pillar:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating pillar'
    });
  }
});

// Update pillar
router.put('/config/pillars/:pillarId', authenticateAdmin, async (req, res) => {
  try {
    const { pillarId } = req.params;
    const { name, short_name, is_active } = req.body;

    console.log('📋 Updating pillar:', { pillarId, name, short_name, is_active });

    // Check if trying to update a default pillar
    if (pillarId && pillarId.startsWith('question-')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify pillars from assessment questions. Create a custom pillar instead.'
      });
    }

    // Get current pillar data BEFORE updating
    const currentPillarSql = `SELECT * FROM pillars WHERE id = ?`;
    const currentResult = await database.query(currentPillarSql, [pillarId]);
    
    if (!currentResult.recordset || currentResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pillar not found'
      });
    }

    const currentPillar = currentResult.recordset[0];
    console.log('📋 Current pillar:', currentPillar);

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (short_name !== undefined) {
      updates.push('short_name = ?');
      params.push(short_name.toUpperCase());
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(pillarId);

    const sql = `
      UPDATE pillars
      SET ${updates.join(', ')}
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.short_name, INSERTED.is_active
      WHERE id = ?;
    `;

    const result = await database.query(sql, params);
    console.log('🔍 Pillar update result:', JSON.stringify(result, null, 2));

    // Handle result.recordset from parameterized queries
    const resultArray = result?.recordset || result;
    if (!Array.isArray(resultArray) || resultArray.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pillar not found'
      });
    }

    const pillar = resultArray[0];

    // Update all questions using this pillar if name changed
    if (name !== undefined && name !== currentPillar.name) {
      console.log(`📋 Updating questions from "${currentPillar.name}" to "${name}"`);
      const updateQuestionsNameSql = `
        UPDATE assessment_questions
        SET pillar_name = ?
        WHERE pillar_name = ?;
      `;
      await database.query(updateQuestionsNameSql, [name, currentPillar.name]);
    }

    // Update all questions using this pillar if short_name changed
    if (short_name !== undefined && short_name.toUpperCase() !== currentPillar.short_name) {
      console.log(`📋 Updating questions short name from "${currentPillar.short_name}" to "${short_name.toUpperCase()}"`);
      const updateQuestionsShortSql = `
        UPDATE assessment_questions
        SET pillar_short_name = ?
        WHERE pillar_short_name = ?;
      `;
      await database.query(updateQuestionsShortSql, [short_name.toUpperCase(), currentPillar.short_name]);
    }

    await Admin.logActivity(
      req.admin.id,
      'UPDATE',
      'pillar',
      pillarId,
      `Updated pillar: ${pillar.name}`,
      req.ip,
      req.headers['user-agent']
    );

    console.log('✅ Pillar updated:', pillar.name);

    res.json({
      success: true,
      message: 'Pillar updated successfully',
      pillar
    });
  } catch (error) {
    console.error('❌ Error updating pillar:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating pillar'
    });
  }
});

// Delete pillar (soft delete)
router.delete('/config/pillars/:pillarId', authenticateAdmin, async (req, res) => {
  try {
    const { pillarId } = req.params;

    // Check if trying to delete a default pillar
    if (pillarId && pillarId.startsWith('question-')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete pillars from assessment questions'
      });
    }

    // Soft delete by setting is_active = 0
    const sql = `
      UPDATE pillars
      SET is_active = 0
      OUTPUT DELETED.name
      WHERE id = ?;
    `;

    const result = await database.query(sql, [pillarId]);
    console.log('🔍 Pillar delete result:', JSON.stringify(result, null, 2));

    // Handle result.recordset from parameterized queries
    const resultArray = result?.recordset || result;
    if (!Array.isArray(resultArray) || resultArray.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pillar not found'
      });
    }

    const pillarName = resultArray[0].name;

    await Admin.logActivity(
      req.admin.id,
      'DELETE',
      'pillar',
      pillarId,
      `Deleted pillar: ${pillarName}`,
      req.ip,
      req.headers['user-agent']
    );

    console.log('✅ Pillar deleted:', pillarName);

    res.json({
      success: true,
      message: 'Pillar deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting pillar:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting pillar'
    });
  }
});

/**
 * Generate ITAC Review PDF
 */
router.post('/itac-review/generate-pdf', async (req, res) => {
  try {
    const formData = req.body;

    console.log('📄 Generating ITAC Review PDF...');

    // Generate PDF buffer
    const pdfBuffer = await generateITACReviewPDFBuffer(formData);

    // Set response headers for PDF download
    const filename = `ITAC_Review_${formData.toolName?.replace(/[^a-z0-9]/gi, '_') || 'Document'}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

    console.log('✅ ITAC Review PDF generated and sent successfully');
  } catch (error) {
    console.error('❌ Error generating ITAC Review PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating ITAC Review PDF',
      error: error.message
    });
  }
});

/**
 * Generate Application Documentation PDF
 */
router.get('/documentation/generate-pdf', async (req, res) => {
  try {
    console.log('📄 Generating SAFE-8 Application Documentation PDF...');

    // Generate PDF buffer
    const pdfBuffer = await generateAppDocumentationPDFBuffer();

    // Set response headers for PDF download
    const filename = `SAFE8_Documentation_${new Date().toISOString().split('T')[0]}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

    console.log('✅ Application Documentation PDF generated and sent successfully');
  } catch (error) {
    console.error('❌ Error generating Application Documentation PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating Application Documentation PDF',
      error: error.message
    });
  }
});

export default router;
