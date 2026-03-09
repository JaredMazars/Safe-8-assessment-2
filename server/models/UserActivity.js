/**
 * User Activity Logging Model
 * Tracks user actions for audit trail
 */

import database from '../config/database.js';
import logger from '../utils/logger.js';

class UserActivity {
  /**
   * Log a user activity
   */
  static async log(leadId, actionType, entityType, entityId, description, ipAddress, userAgent) {
    try {
      const sql = `
        INSERT INTO user_activity_log (
          lead_id, action_type, entity_type, entity_id, 
          description, ip_address, user_agent
        )
        VALUES (@param1, @param2, @param3, @param4, @param5, @param6, @param7)
      `;

      await database.query(sql, [
        leadId,
        actionType,
        entityType || null,
        entityId || null,
        description,
        ipAddress || null,
        userAgent || null
      ]);

      logger.info('User activity logged', { leadId, actionType, entityType });
      return { success: true };
    } catch (error) {
      logger.error('Error logging user activity', { error: error.message, leadId, actionType });
      // Don't throw - activity logging should not break main functionality
      return { success: false, error: error.message };
    }
  }

  /**
   * Get activities for a specific user
   */
  static async getByLeadId(leadId, limit = 50) {
    try {
      const sql = `
        SELECT TOP (@param2)
          ual.*,
          l.contact_name,
          l.email,
          l.company_name
        FROM user_activity_log ual
        INNER JOIN leads l ON ual.lead_id = l.id
        WHERE ual.lead_id = @param1
        ORDER BY ual.created_at DESC
      `;

      const result = await database.query(sql, [leadId, limit]);
      return Array.isArray(result) ? result : result.recordset;
    } catch (error) {
      logger.error('Error fetching user activities', { error: error.message, leadId });
      throw error;
    }
  }

  /**
   * Get all user activities with pagination and filters
   */
  static async getAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        actionType = null,
        entityType = null,
        leadId = null
      } = options;

      const pageNum  = Math.max(1, parseInt(page));
      const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
      const offset   = (pageNum - 1) * limitNum;

      // SECURITY FIX: use ? parameterized placeholders — no string interpolation
      const filterConditions = [];
      const filterParams     = [];

      if (actionType && actionType !== 'all') {
        filterConditions.push('ual.action_type = ?');
        filterParams.push(actionType);
      }
      if (entityType && entityType !== 'all') {
        filterConditions.push('ual.entity_type = ?');
        filterParams.push(entityType);
      }
      if (leadId) {
        filterConditions.push('ual.lead_id = ?');
        filterParams.push(parseInt(leadId));
      }

      const whereClause = filterConditions.length > 0
        ? `WHERE ${filterConditions.join(' AND ')}`
        : '';

      // Get total count
      const countSql = `
        SELECT COUNT(*) as total
        FROM user_activity_log ual
        ${whereClause}
      `;
      const countResult = await database.query(countSql, [...filterParams]);
      const total = Array.isArray(countResult)
        ? countResult[0].total
        : countResult.recordset[0].total;

      // Get activities — OFFSET parameterized too
      const sql = `
        SELECT
          ual.id,
          ual.lead_id,
          l.contact_name as user_name,
          l.email as user_email,
          l.company_name,
          ual.action_type,
          ual.entity_type,
          ual.entity_id,
          ual.description,
          ual.ip_address,
          ual.user_agent,
          ual.created_at
        FROM user_activity_log ual
        INNER JOIN leads l ON ual.lead_id = l.id
        ${whereClause}
        ORDER BY ual.created_at DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
      `;

      const result = await database.query(sql, [...filterParams, offset, limitNum]);
      const activities = Array.isArray(result) ? result : result.recordset;

      return {
        activities,
        pagination: {
          current_page: pageNum,
          total_pages: Math.ceil(total / limitNum),
          total_items: total,
          items_per_page: limitNum,
          has_prev: pageNum > 1,
          has_next: pageNum < Math.ceil(total / limitNum)
        }
      };
    } catch (error) {
      logger.error('Error fetching all user activities', { error: error.message });
      throw error;
    }
  }
}

export default UserActivity;
