import database from './config/database.js';

async function checkUsers() {
  try {
    console.log('🔍 Checking for users in database...\n');
    
    // Simple count query
    const countResult = await database.query('SELECT COUNT(*) as total FROM leads');
    const count = Array.isArray(countResult) ? countResult[0].total : countResult.recordset[0].total;
    console.log(`📊 Total leads in database: ${count}\n`);
    
    if (count > 0) {
      // Get all users
      const usersResult = await database.query(`
        SELECT 
          id, 
          email, 
          contact_name, 
          company_name, 
          job_title,
          created_at
        FROM leads
        ORDER BY created_at DESC
      `);
      
      const users = Array.isArray(usersResult) ? usersResult : usersResult.recordset;
      console.log('👥 Users found:');
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.contact_name || 'No name'}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Company: ${user.company_name || 'N/A'}`);
        console.log(`   Job: ${user.job_title || 'N/A'}`);
        console.log(`   Created: ${user.created_at}`);
      });
      
      // Check for Jared specifically
      const jaredResult = await database.query(`
        SELECT * FROM leads 
        WHERE email = 'Jared.Moodley123123@mazars.co.za'
      `);
      const jared = Array.isArray(jaredResult) ? jaredResult : jaredResult.recordset;
      
      if (jared && jared.length > 0) {
        console.log('\n\n🎯 Found Jared Moodley:');
        console.log(JSON.stringify(jared[0], null, 2));
        
        // Check assessments for Jared
        const assessmentsResult = await database.query(`
          SELECT * FROM assessments 
          WHERE lead_user_id = ${jared[0].id}
        `);
        const assessments = Array.isArray(assessmentsResult) ? assessmentsResult : assessmentsResult.recordset;
        console.log(`\n📋 Jared's assessments: ${assessments.length}`);
        if (assessments.length > 0) {
          assessments.forEach((a, i) => {
            console.log(`\n${i + 1}. ${a.assessment_type} - Score: ${a.overall_score}`);
          });
        }
      } else {
        console.log('\n\n❌ Jared Moodley not found in database');
      }
    } else {
      console.log('❌ No users found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await database.closePool();
    process.exit(0);
  }
}

checkUsers();
