import database from './config/database.js';

async function checkConfig() {
  try {
    const sql = `
      SELECT 
        assessment_type,
        title,
        is_active,
        display_order,
        icon,
        audience,
        audience_color
      FROM assessment_types_config
      ORDER BY display_order, assessment_type
    `;
    
    const result = await database.query(sql);
    console.log('\n📊 Assessment Types Configuration:');
    console.table(result.recordset || result);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkConfig();
