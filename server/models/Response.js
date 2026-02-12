// models/Response.js
import database from "../config/database.js";

class Response {
  // Create new response
  static async create(responseData) {
    const { leadUserId, questionId, responseValue } = responseData;
    
    const sql = `
      INSERT INTO assessment_responses (lead_user_id, question_id, response_value)
      OUTPUT INSERTED.id
      VALUES (?, ?, ?);
    `;

    try {
      const result = await database.query(sql, [leadUserId, questionId, responseValue]);
      return { 
        success: true, 
        responseId: result.recordset[0]?.id 
      };
    } catch (error) {
      console.error('Error creating response:', error);
      return { success: false, error: error.message };
    }
  }

  // Update or Create response
  static async updateOrCreate(responseData) {
    const { leadUserId, questionId, responseValue } = responseData;
    
    // First check if response exists
    const existingResponse = await this.getByUserAndQuestion(leadUserId, questionId);
    
    if (existingResponse) {
      // Update existing response
      const sql = `
        UPDATE assessment_responses 
        SET response_value = ?, updated_at = GETDATE()
        WHERE lead_user_id = ? AND question_id = ?;
      `;
      
      try {
        await database.query(sql, [responseValue, leadUserId, questionId]);
        return { 
          success: true, 
          responseId: existingResponse.id,
          isNew: false
        };
      } catch (error) {
        console.error('Error updating response:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Create new response
      const createResult = await this.create(responseData);
      if (createResult.success) {
        return { 
          ...createResult, 
          isNew: true 
        };
      }
      return createResult;
    }
  }

  // Get response by user and question
  static async getByUserAndQuestion(leadUserId, questionId) {
    const sql = `
      SELECT * FROM assessment_responses 
      WHERE lead_user_id = ? AND question_id = ?;
    `;

    try {
      const result = await database.query(sql, [leadUserId, questionId]);
      return result.recordset[0] || null;
    } catch (error) {
      console.error('Error getting response:', error);
      return null;
    }
  }

    static async getAll() {
    const sql = `
        SELECT * 
        FROM assessment_questions 
        ORDER BY assessment_type, pillar_name, question_order;
    `;

    try {
        const result = await database.query(sql);
        console.log('Raw DB result:', result); // ✅ Add this for debugging
        return result
    } catch (error) {
        console.error('Database query failed:', error.message);
        throw error;
    }
}

  static async getByUser(leadUserId) {
    const sql = `
      SELECT ar.*, aq.question_text, aq.pillar_name, aq.assessment_type
      FROM assessment_responses ar
      JOIN assessment_questions aq ON ar.question_id = aq.id
      WHERE ar.lead_user_id = ${leadUserId}
      ORDER BY aq.pillar_name, aq.question_order;
    `;
    const result = await database.query(sql);
    return result.recordset;
  }


}

export default Response;
