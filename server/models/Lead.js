import bcrypt from 'bcrypt';
import crypto from 'crypto';
import logger from '../utils/logger.js';

const SALT_ROUNDS = 12; // Industry standard for 2026

// Prevents timing-based user enumeration: always run bcrypt.compare even when no user is found
const DUMMY_HASH = '$2b$12$invalidhashfortimingprotectionXXXXXXXXXXXXXXXXXXXXXXXX';

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
    logger.info('Creating new lead', { companyName });
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
      logger.debug('All parameters added');
      
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
      
      const queryPromise = request.query(sqlQuery);
      const queryTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout after 10s')), 10000)
      );
      
      const result = await Promise.race([queryPromise, queryTimeout]);
      logger.info('Lead created successfully');
      
      return { 
        success: true, 
        leadId: result.recordset[0]?.id 
      };
    } catch (error) {
      logger.error('Error creating lead', { error: error.message });
      // SQL Server unique constraint violation codes
      if (error.number === 2627 || error.number === 2601) {
        return { success: false, duplicate: true, error: 'Email already registered' };
      }
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  static async getAll() {
    try {
      const { getPool, sql } = await import('../config/database.js');
      const pool = await getPool();
      const request = pool.request();
      const result = await request.query(`
        SELECT id, contact_name, job_title, email, phone_number,
               company_name, company_size, country, industry, lead_source, created_at
        FROM leads
        ORDER BY created_at DESC;
      `);
      return result.recordset || [];
    } catch (error) {
      logger.error('Error getting all leads', { error: error.message });
      return [];
    }
  }

  static async getById(leadId) {
    try {
      const { getPool, sql } = await import('../config/database.js');
      const pool = await getPool();
      const request = pool.request();
      request.input('leadId', sql.Int, leadId);
      const result = await request.query(`
        SELECT id, contact_name, job_title, email, phone_number,
               company_name, company_size, country, industry, lead_source,
               account_locked, login_attempts, must_change_password,
               last_login_at, created_at, updated_at
        FROM leads WHERE id = @leadId;
      `);
      return result.recordset[0] || null;
    } catch (error) {
      logger.error('Error getting lead by ID', { error: error.message });
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
      
      // NOTE: password_hash intentionally included — callers that need auth use this method
      const sqlQuery = `
        SELECT id, contact_name, job_title, email, phone_number,
               company_name, company_size, country, industry, lead_source,
               password_hash, account_locked, locked_until, login_attempts,
               must_change_password, password_reset_token, password_reset_expires,
               last_login_at, created_at, updated_at
        FROM leads WHERE email = @email;
      `;
      
      const result = await request.query(sqlQuery);
      return result.recordset[0] || null;
    } catch (error) {
      logger.error('Error getting lead by email', { error: error.message });
      throw error;
    }
  }

  static async updateOrCreate(leadData) {
    logger.debug('updateOrCreate called');
    try {
      const existingLead = await this.getByEmail(leadData.email);

      if (existingLead) {
        const passwordHash = leadData.password
          ? await bcrypt.hash(leadData.password, SALT_ROUNDS)
          : null;

        const { getPool, sql } = await import('../config/database.js');
        const pool = await getPool();
        const request = pool.request();

        request.input('contactName', sql.NVarChar, leadData.contactName);
        request.input('jobTitle',    sql.NVarChar, leadData.jobTitle    || '');
        request.input('phoneNumber', sql.NVarChar, leadData.phoneNumber || '');
        request.input('companyName', sql.NVarChar, leadData.companyName);
        request.input('companySize', sql.NVarChar, leadData.companySize || '');
        request.input('country',     sql.NVarChar, leadData.country     || '');
        request.input('industry',    sql.NVarChar, leadData.industry    || '');
        request.input('email',       sql.NVarChar, leadData.email);

        let updateQuery;
        if (passwordHash) {
          request.input('passwordHash', sql.NVarChar, passwordHash);
          updateQuery = `
            UPDATE leads SET
              contact_name = @contactName, job_title = @jobTitle, phone_number = @phoneNumber,
              company_name = @companyName, company_size = @companySize, country = @country,
              industry = @industry, password_hash = @passwordHash,
              password_updated_at = GETDATE(), updated_at = GETDATE()
            WHERE email = @email;
          `;
        } else {
          updateQuery = `
            UPDATE leads SET
              contact_name = @contactName, job_title = @jobTitle, phone_number = @phoneNumber,
              company_name = @companyName, company_size = @companySize, country = @country,
              industry = @industry, updated_at = GETDATE()
            WHERE email = @email;
          `;
        }

        await request.query(updateQuery);
        return { success: true, leadId: existingLead.id, isNew: false };

      } else {
        const createResult = await this.create(leadData);
        return createResult.success ? { ...createResult, isNew: true } : createResult;
      }
    } catch (error) {
      logger.error('Error in updateOrCreate', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  static async verifyPassword(email, password) {
    try {
      const lead = await this.getByEmail(email);

      // FIX: Always run bcrypt.compare to prevent timing-based user enumeration
      const hashToCompare = lead?.password_hash || DUMMY_HASH;
      const isValid = await bcrypt.compare(password, hashToCompare);

      // FIX: Generic message — never confirm whether email exists
      if (!lead) {
        return { success: false, message: 'Invalid credentials' };
      }

      // FIX: Lock if account_locked=1 regardless of whether locked_until is set
      if (lead.account_locked) {
        const isPermanentLock = !lead.locked_until;
        const isTimedLock = lead.locked_until && new Date(lead.locked_until) > new Date();
        if (isPermanentLock || isTimedLock) {
          return {
            success: false,
            message: 'Account is locked. Please contact support or reset your password.',
            locked: true
          };
        }
      }

      if (!lead.password_hash) {
        return {
          success: false,
          message: 'No password set for this account. Please reset your password.'
        };
      }

      const { getPool, sql } = await import('../config/database.js');
      const pool = await getPool();

      if (isValid) {
        // FIX: Use parameterised queries — not ? placeholders
        const request = pool.request();
        request.input('email', sql.NVarChar, email);
        await request.query(`
          UPDATE leads
          SET login_attempts = 0,
              account_locked = 0,
              locked_until   = NULL,
              last_login_at  = GETDATE()
          WHERE email = @email;
        `);

        // FIX: Re-hash transparently on login if SALT_ROUNDS has increased
        const currentRounds = bcrypt.getRounds(lead.password_hash);
        if (currentRounds < SALT_ROUNDS) {
          const newHash = await bcrypt.hash(password, SALT_ROUNDS);
          const rehashReq = pool.request();
          rehashReq.input('email',        sql.NVarChar, email);
          rehashReq.input('passwordHash', sql.NVarChar, newHash);
          await rehashReq.query(
            'UPDATE leads SET password_hash = @passwordHash WHERE email = @email;'
          );
          logger.info('Password re-hashed with updated salt rounds');
        }

        return { success: true, lead };

      } else {
        const newAttempts = (lead.login_attempts || 0) + 1;
        const shouldLock  = newAttempts >= 5;

        const request = pool.request();
        request.input('email',       sql.NVarChar, email);
        request.input('newAttempts', sql.Int,      newAttempts);
        request.input('shouldLock',  sql.Bit,      shouldLock ? 1 : 0);
        request.input('lockedUntil', sql.DateTime,
          shouldLock ? new Date(Date.now() + 30 * 60 * 1000) : null
        );
        await request.query(`
          UPDATE leads
          SET login_attempts = @newAttempts,
              account_locked = @shouldLock,
              locked_until   = @lockedUntil
          WHERE email = @email;
        `);

        return {
          success: false,
          message: shouldLock
            ? 'Too many failed attempts. Account locked for 30 minutes.'
            : 'Invalid credentials.',
          // FIX: Don't leak remaining attempts after lockout threshold
          attemptsRemaining: shouldLock ? 0 : 5 - newAttempts
        };
      }
    } catch (error) {
      logger.error('Error verifying password', { error: error.message });
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
      
      // FIX: Generic message — never confirm whether email exists
      if (!lead) {
        logger.info('Reset token requested for unknown email (suppressed)');
        return { success: true, message: 'If that email exists, a reset link has been sent.' };
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

      logger.info('Password reset token created');

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
      logger.error('Error creating reset token', { error: error.message });
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
      logger.error('Error verifying reset token', { error: error.message });
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

      logger.info('Password reset successful');

      return {
        success: true,
        email: verifyResult.email,
        message: 'Password has been reset successfully'
      };
    } catch (error) {
      logger.error('Error resetting password', { error: error.message });
      return { success: false, message: 'Error resetting password' };
    }
  }
}

export default Lead;