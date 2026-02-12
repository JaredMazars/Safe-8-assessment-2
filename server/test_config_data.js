import database from './config/database.js';

(async () => {
  try {
    console.log('Testing configuration data...\n');
    
    // First, check if we have any questions
    const totalQuestions = await database.query(`
      SELECT COUNT(*) as count 
      FROM assessment_questions
    `);
    console.log('TOTAL QUESTIONS:', Array.isArray(totalQuestions) ? totalQuestions[0].count : 0);
    
    // Get assessment types
    const types = await database.query(`
      SELECT DISTINCT assessment_type 
      FROM assessment_questions 
      ORDER BY assessment_type
    `);
    console.log('\nASSESSMENT TYPES:', JSON.stringify(Array.isArray(types) ? types.map(t => t.assessment_type) : [], null, 2));
    
    // Get pillars
    const pillars = await database.query(`
      SELECT DISTINCT pillar_name as name, pillar_short_name as short_name
      FROM assessment_questions 
      ORDER BY pillar_name
    `);
    console.log('\nPILLARS:', JSON.stringify(Array.isArray(pillars) ? pillars : [], null, 2));
    
    // Check industries table
    const checkTable = await database.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'industries'
    `);
    console.log('\nINDUSTRIES TABLE EXISTS:', Array.isArray(checkTable) && checkTable.length > 0);
    
    // If industries table exists, get data
    if (Array.isArray(checkTable) && checkTable.length > 0) {
      const industries = await database.query(`
        SELECT id, name, is_active FROM industries ORDER BY name
      `);
      console.log('INDUSTRIES:', JSON.stringify(Array.isArray(industries) ? industries : [], null, 2));
    } else {
      console.log('Returning default industries list');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
