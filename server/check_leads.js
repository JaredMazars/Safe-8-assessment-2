import database from './config/database.js';

async function checkLeadsTable() {
  try {
    const sql = `
      SELECT TOP 5 *
      FROM leads
      WHERE email LIKE '%test%'
    `;
    
    const result = await database.query(sql);
    console.log('\n📊 Test Users:');
    console.table(result.recordset || result);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkLeadsTable();
