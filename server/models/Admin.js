import database from "../config/database.js";
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = 10;
const SESSION_DURATION_HOURS = 8;

class Admin {
  // Create new admin user
  static async create(adminData) {
    const {
      username,
      email,
      password,
      full_name,
      role = 'admin',
      created_by
    } = adminData;

    // Hash the password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    const sql = `
      INSERT INTO admins (
        username, email, password_hash, full_name, role, created_by
      ) OUTPUT INSERTED.id
      VALUES (?, ?, ?, ?, ?, ?);
    `;

    try {
      const result = await database.query(sql, [
        username, email, passwordHash, full_name, role, created_by
      ]);
      
      return { 
        success: true, 
        adminId: result.recordset[0]?.id 
      };
    } catch (error) {
      console.error('❌ Error creating admin:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // Update or Create admin
  static async updateOrCreate(adminData) {
    const existingAdmin = await this.getByEmail(adminData.email);
    
    if (existingAdmin) {
      // Update existing admin (excluding password unless provided)
      const updates = [];
      const params = [];
      
      if (adminData.full_name) {
        updates.push('full_name = ?');
        params.push(adminData.full_name);
      }
      
      if (adminData.role) {
        updates.push('role = ?');
        params.push(adminData.role);
      }
      
      if (adminData.password) {
        const passwordHash = await bcrypt.hash(adminData.password, SALT_ROUNDS);
        updates.push('password_hash = ?');
        params.push(passwordHash);
      }
      
      if (adminData.is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(adminData.is_active ? 1 : 0);
      }
      
      updates.push('updated_at = GETDATE()');
      params.push(adminData.email);
      
      const sql = `UPDATE admin_users SET ${updates.join(', ')} WHERE email = ?;`;
      
      try {
        await database.query(sql, params);
        return { 
          success: true, 
          adminId: existingAdmin.id,
          isNew: false
        };
      } catch (error) {
        console.error('❌ Error updating admin:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Create new admin
      const createResult = await this.create(adminData);
      return createResult.success ? { ...createResult, isNew: true } : createResult;
    }
  }

  // Authenticate admin
  static async authenticate(usernameOrEmail, password, ipAddress, userAgent) {
    try {
      // Get admin by username or email - use direct SQL to avoid date issues
      const adminSql = `
        SELECT id, username, email, password_hash, full_name, role, is_active, 
               login_attempts, account_locked,
               ISNULL(must_change_password, 0) as must_change_password,
               CASE 
                 WHEN locked_until IS NULL THEN NULL
                 WHEN locked_until > GETDATE() THEN 1
                 ELSE 0
               END as is_currently_locked,
               CASE 
                 WHEN locked_until IS NOT NULL AND locked_until > GETDATE() 
                 THEN DATEDIFF(MINUTE, GETDATE(), locked_until)
                 ELSE 0
               END as minutes_locked
        FROM admin_users 
        WHERE username = ? OR email = ?
      `;
      
      const adminResult = await database.query(adminSql, [usernameOrEmail, usernameOrEmail]);
      const admin = adminResult.recordset[0];
      
      if (!admin) {
        return { 
          success: false, 
          message: 'Invalid credentials' 
        };
      }

      // Check if account is active
      if (!admin.is_active) {
        return { 
          success: false, 
          message: 'Account is deactivated. Contact super admin.' 
        };
      }

      // Check if account is locked
      if (admin.account_locked && admin.is_currently_locked === 1) {
        return { 
          success: false, 
          message: `Account is locked. Try again in ${admin.minutes_locked} minutes.`,
          locked: true 
        };
      }

      // Verify password
      const isValid = await bcrypt.compare(password, admin.password_hash);
      
      if (isValid) {
        // Reset failed attempts and generate session token
        await database.query(`
          UPDATE admin_users 
          SET login_attempts = 0, 
              account_locked = 0, 
              locked_until = NULL,
              last_login_at = GETDATE()
          WHERE id = ?
        `, [admin.id]);
        
        // Create session token
        const sessionToken = crypto.randomBytes(32).toString('hex');
        
        // Insert session with SQL Server date calculation
        await database.query(`
          INSERT INTO admin_sessions (admin_id, session_token, ip_address, user_agent, expires_at)
          VALUES (?, ?, ?, ?, DATEADD(HOUR, ${SESSION_DURATION_HOURS}, GETDATE()))
        `, [admin.id, sessionToken, ipAddress, userAgent]);
        
        // Log login activity
        await this.logActivity(admin.id, 'LOGIN', 'admin', admin.id, 'Admin logged in', ipAddress, userAgent);
        
        return { 
          success: true, 
          admin: {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            full_name: admin.full_name,
            role: admin.role,
            mustChangePassword: admin.must_change_password === 1
          },
          sessionToken,
          expiresAt: new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000),
          mustChangePassword: admin.must_change_password === 1
        };
      } else {
        // Increment failed attempts with SQL Server date calculation
        const newAttempts = (admin.login_attempts || 0) + 1;
        const shouldLock = newAttempts >= 5;
        
        await database.query(`
          UPDATE admin_users 
          SET login_attempts = ?,
              account_locked = ?,
              locked_until = CASE WHEN ? = 1 THEN DATEADD(MINUTE, 30, GETDATE()) ELSE NULL END
          WHERE id = ?
        `, [
          newAttempts,
          shouldLock ? 1 : 0,
          shouldLock ? 1 : 0,
          admin.id
        ]);
        
        return { 
          success: false, 
          message: shouldLock 
            ? 'Too many failed attempts. Account locked for 30 minutes.'
            : `Invalid credentials. ${5 - newAttempts} attempts remaining.`,
          attemptsRemaining: 5 - newAttempts
        };
      }
    } catch (error) {
      console.error('❌ Error authenticating admin:', error);
      return { success: false, message: 'Authentication error' };
    }
  }

  // Verify session token
  static async verifySession(sessionToken) {
    try {
      const sql = `
        SELECT au.*, s.expires_at
        FROM admin_users au
        INNER JOIN admin_sessions s ON au.id = s.admin_id
        WHERE s.session_token = ? AND s.expires_at > GETDATE() AND au.is_active = 1;
      `;
      
      const result = await database.query(sql, [sessionToken]);
      
      if (result.recordset && result.recordset.length > 0) {
        const admin = result.recordset[0];
        return {
          success: true,
          admin: {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            full_name: admin.full_name,
            role: admin.role
          }
        };
      }
      
      return { success: false, message: 'Invalid or expired session' };
    } catch (error) {
      console.error('❌ Error verifying session:', error);
      return { success: false, message: 'Session verification error' };
    }
  }

  // Logout admin
  static async logout(sessionToken) {
    try {
      await database.query('DELETE FROM admin_sessions WHERE session_token = ?', [sessionToken]);
      return { success: true };
    } catch (error) {
      console.error('❌ Error logging out:', error);
      return { success: false, error: error.message };
    }
  }

  // Get admin by username or email
  static async getByUsernameOrEmail(usernameOrEmail) {
    const sql = `
      SELECT * FROM admin_users 
      WHERE username = ? OR email = ?;
    `;

    try {
      const result = await database.query(sql, [usernameOrEmail, usernameOrEmail]);
      return result.recordset[0] || null;
    } catch (error) {
      console.error('❌ Error getting admin:', error);
      return null;
    }
  }

  // Get admin by email
  static async getByEmail(email) {
    const sql = `SELECT * FROM admin_users WHERE email = ?;`;

    try {
      const result = await database.query(sql, [email]);
      return result.recordset[0] || null;
    } catch (error) {
      console.error('❌ Error getting admin by email:', error);
      return null;
    }
  }

  // Get admin by ID
  static async getById(adminId) {
    const sql = `
      SELECT id, username, email, full_name, role, is_active, last_login_at, created_at
      FROM admin_users 
      WHERE id = ?;
    `;

    try {
      const result = await database.query(sql, [adminId]);
      return result.recordset[0] || null;
    } catch (error) {
      console.error('❌ Error getting admin by ID:', error);
      return null;
    }
  }

  // Get all admins
  static async getAll() {
    const sql = `
      SELECT id, username, email, full_name, role, is_active, last_login_at, created_at
      FROM admin_users 
      ORDER BY created_at DESC;
    `;

    try {
      const result = await database.query(sql);
      return result.recordset || [];
    } catch (error) {
      console.error('❌ Error getting all admins:', error);
      return [];
    }
  }

  // Change password
  static async changePassword(adminId, oldPassword, newPassword) {
    try {
      const admin = await this.getById(adminId);
      if (!admin) {
        return { success: false, message: 'Admin not found' };
      }

      // Verify old password
      const sql = `SELECT password_hash FROM admin_users WHERE id = ?`;
      const result = await database.query(sql, [adminId]);
      const isValid = await bcrypt.compare(oldPassword, result.recordset[0].password_hash);
      
      if (!isValid) {
        return { success: false, message: 'Current password is incorrect' };
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      
      await database.query(`
        UPDATE admin_users 
        SET password_hash = ?, must_change_password = 0, updated_at = GETDATE()
        WHERE id = ?
      `, [passwordHash, adminId]);

      // ✅ SECURITY: Revoke all existing sessions after password change
      await database.query(`
        DELETE FROM admin_sessions WHERE admin_id = ?
      `, [adminId]);

      return { success: true, message: 'Password changed successfully. Please log in again.' };
    } catch (error) {
      console.error('❌ Error changing password:', error);
      return { success: false, error: error.message };
    }
  }

  // Log admin activity
  static async logActivity(adminId, actionType, entityType, entityId, description, ipAddress, userAgent) {
    try {
      await database.query(`
        INSERT INTO admin_activity_log (admin_id, action_type, entity_type, entity_id, description, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [adminId, actionType, entityType, entityId, description, ipAddress, userAgent]);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error logging activity:', error);
      return { success: false };
    }
  }

  // Get activity log
  static async getActivityLog(filters = {}) {
    const { adminId, actionType, entityType, limit = 100, offset = 0 } = filters;
    
    let whereConditions = [];
    let params = [];
    
    if (adminId) {
      whereConditions.push('admin_id = ?');
      params.push(adminId);
    }
    
    if (actionType) {
      whereConditions.push('action_type = ?');
      params.push(actionType);
    }
    
    if (entityType) {
      whereConditions.push('entity_type = ?');
      params.push(entityType);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const sql = `
      SELECT aal.*, au.username, au.full_name
      FROM admin_activity_log aal
      INNER JOIN admin_users au ON aal.admin_id = au.id
      ${whereClause}
      ORDER BY aal.created_at DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY;
    `;
    
    params.push(offset, limit);

    try {
      const result = await database.query(sql, params);
      return result.recordset || [];
    } catch (error) {
      console.error('❌ Error getting activity log:', error);
      return [];
    }
  }

  // Get dashboard statistics
  static async getDashboardStats() {
    try {
      // Get comprehensive dashboard statistics from actual tables
      const statsQueries = await Promise.all([
        // Total users
        database.query(`SELECT COUNT(*) as total_users FROM leads`),
        
        // Total assessments
        database.query(`SELECT COUNT(*) as total_assessments FROM assessments`),
        
        // Total questions (check both is_active = 1 and is_active IS NULL for compatibility)
        database.query(`SELECT COUNT(*) as total_questions FROM assessment_questions WHERE is_active = 1 OR is_active IS NULL`),
        
        // Average score
        database.query(`SELECT AVG(overall_score) as avg_score FROM assessments`),
        
        // Assessment type breakdown
        database.query(`
          SELECT 
            assessment_type,
            COUNT(*) as count,
            AVG(overall_score) as avg_score
          FROM assessments
          GROUP BY assessment_type
          ORDER BY assessment_type
        `),
        
        // Recent activity (last 10)
        database.query(`
          SELECT TOP 10
            al.id,
            al.action_type,
            al.entity_type,
            al.entity_id,
            al.description,
            al.created_at,
            au.username as admin_username
          FROM admin_activity_log al
          LEFT JOIN admin_users au ON al.admin_id = au.id
          ORDER BY al.created_at DESC
        `)
      ]);

      console.log('📊 Stats queries completed, processing results...');
      
      // Handle both recordset and result structures
      const getResult = (queryResult) => {
        if (queryResult && queryResult.recordset) {
          return queryResult.recordset;
        } else if (queryResult && Array.isArray(queryResult)) {
          return queryResult;
        }
        return [];
      };

      const stats = {
        total_users: getResult(statsQueries[0])[0]?.total_users || 0,
        total_assessments: getResult(statsQueries[1])[0]?.total_assessments || 0,
        total_questions: getResult(statsQueries[2])[0]?.total_questions || 0,
        avg_score: getResult(statsQueries[3])[0]?.avg_score || 0,
        assessment_type_breakdown: getResult(statsQueries[4]) || [],
        recent_activity: getResult(statsQueries[5]) || []
      };

      console.log('📊 Dashboard stats generated:', {
        users: stats.total_users,
        assessments: stats.total_assessments,
        questions: stats.total_questions,
        avg_score: stats.avg_score?.toFixed(2)
      });

      return stats;
    } catch (error) {
      console.error('❌ Error getting dashboard stats:', error);
      return {
        total_users: 0,
        total_assessments: 0,
        total_questions: 0,
        avg_score: 0,
        assessment_type_breakdown: [],
        recent_activity: []
      };
    }
  }

  // Deactivate admin
  static async deactivate(adminId, deactivatedBy) {
    try {
      await database.query(`
        UPDATE admin_users 
        SET is_active = 0, updated_at = GETDATE()
        WHERE id = ?
      `, [adminId]);

      // Delete all sessions
      await database.query('DELETE FROM admin_sessions WHERE admin_id = ?', [adminId]);

      // Log activity
      await this.logActivity(deactivatedBy, 'UPDATE', 'admin', adminId, 'Admin deactivated', null, null);

      return { success: true };
    } catch (error) {
      console.error('❌ Error deactivating admin:', error);
      return { success: false, error: error.message };
    }
  }
}

export default Admin;
