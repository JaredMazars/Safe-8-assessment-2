import database from "../config/database.js";
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import logger from '../utils/logger.js';

const SALT_ROUNDS = 12; // Industry standard for 2026

/**
 * Lead Model - Handles lead/user data persistence and authentication
 * @class Lead
 * @description Manages lead creation, updates, authentication, and password reset functionality
 */
class Lead {
  
  /**
   * Create a new lead in the database
   * @async
   * @param {Object} leadData - Lead information
   * @param {string} leadData.contactName - Contact person's full name
   * @param {string} [leadData.jobTitle] - Job title/position
   * @param {string} leadData.email - Email address (unique identifier)
   * @param {string} [leadData.phoneNumber] - Contact phone number
   * @param {string} leadData.companyName - Company/organization name
   * @param {string} [leadData.companySize] - Company size category
   * @param {string} [leadData.country] - Country location
   * @param {string} [leadData.industry] - Industry/sector
   * @param {string} leadData.password - Plain text password (will be hashed)
   * @returns {Promise<Object>} Result object with success status and lead ID
   * @throws {Error} If database operation fails or password hashing times out
   */
  static async create({
    contactName, jobTitle, email, phoneNumber,
    companyName, companySize, country, industry, password
  }) {
    logger.info('Creating new lead', { email, companyName });
    try {
      // Hash the password before storing with timeout protection
      logger.debug('Starting password hash');
      const hashPromise = password ? bcrypt.hash(password, SALT_ROUNDS) : Promise.resolve(null);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Password hashing timeout')), 5000)
      );
      
      const passwordHash = await Promise.race([hashPromise, timeoutPromise]);
      logger.debug('Password hashed successfully');
      
      // Import getPool and sql from database
      const { getPool, sql } = await import('../config/database.js');
      logger.debug('Getting database pool');
      const pool = await getPool();
      const request = pool.request();
      request.timeout = 10000; // 10 second timeout
      
      // Use named parameters directly - NO ? placeholders
      logger.debug('Adding input parameters');
      request.input('contactName', sql.NVarChar, contactName);
      request.input('jobTitle', sql.NVarChar, jobTitle || '');
      request.input('email', sql.NVarChar, email);
      request.input('phoneNumber', sql.NVarChar, phoneNumber || '');
      request.input('companyName', sql.NVarChar, companyName);
      request.input('companySize', sql.NVarChar, companySize || '');
      request.input('country', sql.NVarChar, country || '');
      request.input('industry', sql.NVarChar, industry || '');
      request.input('passwordHash', sql.NVarChar, passwordHash);
      console.log('  ✓ passwordHash');
      console.log('🔍 All parameters added');
      
      const sqlQuery = `
        INSERT INTO leads (
          contact_name, job_title, email, phone_number,
          company_name, company_size, country, industry, lead_source,
          password_hash, password_created_at
        ) 
        OUTPUT INSERTED.id
        VALUES (
          @contactName, @jobTitle, @email, @phoneNumber,
          @companyName, @companySize, @country, @industry, 'WEBSITE',
          @passwordHash, GETDATE()
        );
      `;
      
      console.log('🔍 Executing INSERT...');
      const queryPromise = request.query(sqlQuery);
      const queryTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout after 10s')), 10000)
      );
      
      const result = await Promise.race([queryPromise, queryTimeout]);
      console.log('✅ INSERT success, ID:', result.recordset[0]?.id);
      
      return { 
        success: true, 
        leadId: result.recordset[0]?.id 
      };
    } catch (error) {
      console.error('❌ Error creating lead:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  static async getAll() {
    const sql = `
      SELECT id, contact_name, job_title, email, phone_number,
             company_name, company_size, country, industry, lead_source, created_at
      FROM leads
      ORDER BY created_at DESC;
    `;

    try {
      const result = await database.query(sql);
      return result.recordset || [];
    } catch (error) {
      console.error('Error getting all leads:', error);
      return [];
    }
  }

  static async getById(leadId) {
    const sql = `
      SELECT * FROM leads WHERE id = ?;
    `;

    try {
      const result = await database.query(sql, [leadId]);
      return result.recordset[0] || null;
    } catch (error) {
      console.error('Error getting lead by ID:', error);
      return null;
    }
  }

  static async getByEmail(email) {
    logger.debug('Getting lead by email', { email });
    try {
      const { getPool, sql } = await import('../config/database.js');
      const pool = await getPool();
      const request = pool.request();
      request.input('email', sql.NVarChar, email);
      
      const sqlQuery = 'SELECT * FROM leads WHERE email = @email;';
      
      console.log('🔍 Executing SELECT...');
      const result = await request.query(sqlQuery);
      console.log('✅ SELECT success, rows:', result.recordset.length);
      
      return result.recordset[0] || null;
    } catch (error) {
      console.error('❌ Error getting lead by email:', error.message);
      return null;
    }
  }

  static async updateOrCreate(leadData) {
    console.log('🔍 updateOrCreate called with:', { email: leadData.email });
    try {
      // First check if lead exists
      console.log('🔍 Checking if lead exists...');
      const existingLead = await this.getByEmail(leadData.email);
      console.log('🔍 Existing lead result:', existingLead ? `Found: ${existingLead.id}` : 'Not found');
    
    if (existingLead) {
      // Hash password if provided
      const passwordHash = leadData.password ? await bcrypt.hash(leadData.password, SALT_ROUNDS) : null;
      
      // Update existing lead
      const sql = passwordHash 
        ? `
          UPDATE leads SET
            contact_name = ?, job_title = ?, phone_number = ?,
            company_name = ?, company_size = ?, country = ?, 
            industry = ?, password_hash = ?, password_updated_at = GETDATE(), updated_at = GETDATE()
          WHERE email = ?;
        `
        : `
          UPDATE leads SET
            contact_name = ?, job_title = ?, phone_number = ?,
            company_name = ?, company_size = ?, country = ?, 
            industry = ?, updated_at = GETDATE()
          WHERE email = ?;
        `;
      
      try {
        const params = passwordHash
          ? [leadData.contactName, leadData.jobTitle, leadData.phoneNumber,
             leadData.companyName, leadData.companySize, leadData.country,
             leadData.industry, passwordHash, leadData.email]
          : [leadData.contactName, leadData.jobTitle, leadData.phoneNumber,
             leadData.companyName, leadData.companySize, leadData.country,
             leadData.industry, leadData.email];
             
        await database.query(sql, params);
        return { 
          success: true, 
          leadId: existingLead.id,
          isNew: false
        };
      } catch (error) {
        console.error('Error updating lead:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Create new lead
      console.log('🔍 Creating new lead...');
      const createResult = await this.create(leadData);
      console.log('🔍 Create result:', createResult);
      if (createResult.success) {
        return { 
          ...createResult, 
          isNew: true 
        };
      }
      return createResult;
    }
    } catch (error) {
      console.error('❌ Error in updateOrCreate:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  static async verifyPassword(email, password) {
    try {
      const lead = await this.getByEmail(email);
      
      if (!lead) {
        return { success: false, message: 'User not found' };
      }

      // Check if account is locked
      if (lead.account_locked && lead.locked_until && new Date(lead.locked_until) > new Date()) {
        return { 
          success: false, 
          message: 'Account is locked. Please try again later.',
          locked: true 
        };
      }

      // Check if password exists
      if (!lead.password_hash) {
        return { 
          success: false, 
          message: 'No password set for this account. Please reset your password.' 
        };
      }

      // Verify password
      const isValid = await bcrypt.compare(password, lead.password_hash);
      
      // Update login attempts
      if (isValid) {
        // Reset failed attempts on successful login
        await database.query(`
          UPDATE leads 
          SET login_attempts = 0, 
              account_locked = 0, 
              locked_until = NULL,
              last_login_at = GETDATE()
          WHERE email = ?
        `, [email]);
        
        return { success: true, lead };
      } else {
        // Increment failed attempts
        const newAttempts = (lead.login_attempts || 0) + 1;
        const shouldLock = newAttempts >= 5;
        
        await database.query(`
          UPDATE leads 
          SET login_attempts = ?,
              account_locked = ?,
              locked_until = ?
          WHERE email = ?
        `, [
          newAttempts,
          shouldLock ? 1 : 0,
          shouldLock ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null,
          email
        ]);
        
        return { 
          success: false, 
          message: shouldLock 
            ? 'Too many failed attempts. Account locked for 30 minutes.'
            : `Invalid password. ${5 - newAttempts} attempts remaining.`,
          attemptsRemaining: 5 - newAttempts
        };
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      return { success: false, message: 'Error verifying credentials' };
    }
  }

  /**
   * Create a password reset token for a user
   * Token expires in 1 hour
   */
  static async createPasswordResetToken(email) {
    try {
      const lead = await this.getByEmail(email);
      
      if (!lead) {
        return { success: false, message: 'User not found' };
      }

      // Generate secure random token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Store token in database
      const { getPool, sql } = await import('../config/database.js');
      const pool = await getPool();
      const request = pool.request();
      
      request.input('email', sql.NVarChar, email);
      request.input('tokenHash', sql.NVarChar, tokenHash);
      request.input('expiresAt', sql.DateTime, expiresAt);

      const updateQuery = `
        UPDATE leads 
        SET reset_token_hash = @tokenHash,
            reset_token_expires = @expiresAt
        WHERE email = @email;
      `;

      await request.query(updateQuery);

      console.log('✅ Password reset token created for:', email);

      return {
        success: true,
        resetToken: resetToken, // Return unhashed token to send via email
        lead: {
          contact_name: lead.contact_name,
          email: lead.email,
          company_name: lead.company_name
        }
      };
    } catch (error) {
      console.error('❌ Error creating reset token:', error.message);
      return { success: false, message: 'Error creating reset token' };
    }
  }

  /**
   * Verify a password reset token
   */
  static async verifyResetToken(token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const { getPool, sql } = await import('../config/database.js');
      const pool = await getPool();
      const request = pool.request();
      
      request.input('tokenHash', sql.NVarChar, tokenHash);

      const query = `
        SELECT * FROM leads 
        WHERE reset_token_hash = @tokenHash
        AND reset_token_expires > GETDATE();
      `;

      const result = await request.query(query);
      const lead = result.recordset[0];

      if (!lead) {
        return { success: false, message: 'Invalid or expired reset token' };
      }

      return {
        success: true,
        email: lead.email,
        leadId: lead.id
      };
    } catch (error) {
      console.error('❌ Error verifying reset token:', error.message);
      return { success: false, message: 'Error verifying token' };
    }
  }

  /**
   * Reset password using valid token
   */
  static async resetPassword(token, newPassword) {
    try {
      // Verify token first
      const verifyResult = await this.verifyResetToken(token);
      
      if (!verifyResult.success) {
        return verifyResult;
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update password and clear reset token
      const { getPool, sql } = await import('../config/database.js');
      const pool = await getPool();
      const request = pool.request();
      
      request.input('email', sql.NVarChar, verifyResult.email);
      request.input('passwordHash', sql.NVarChar, passwordHash);

      const updateQuery = `
        UPDATE leads 
        SET password_hash = @passwordHash,
            password_updated_at = GETDATE(),
            reset_token_hash = NULL,
            reset_token_expires = NULL,
            login_attempts = 0,
            account_locked = 0,
            locked_until = NULL
        WHERE email = @email;
      `;

      await request.query(updateQuery);

      console.log('✅ Password reset successful for:', verifyResult.email);

      return {
        success: true,
        email: verifyResult.email,
        message: 'Password has been reset successfully'
      };
    } catch (error) {
      console.error('❌ Error resetting password:', error.message);
      return { success: false, message: 'Error resetting password' };
    }
  }
}

export default Lead;