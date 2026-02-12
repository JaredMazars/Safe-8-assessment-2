import database from './config/database.js';

async function findTestUser() {
  try {
    const sql = `
      SELECT 
        id,
        email,
        contactName,
        companyName
      FROM leads
      WHERE email LIKE '%test%' OR contactName LIKE '%test%'
      ORDER BY createdAt DESC
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

findTestUser();
