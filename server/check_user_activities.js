import database from './config/database.js';

async function checkUserActivityLogs() {
  try {
    console.log('🔍 Checking user_activity_log table...\n');
    
    // Count total logs
    const countQuery = 'SELECT COUNT(*) as total FROM dbo.user_activity_log';
    const countResult = await database.query(countQuery);
    const count = Array.isArray(countResult) ? countResult[0].total : countResult.recordset[0].total;
    
    console.log(`📊 Total user activity logs: ${count}\n`);
    
    if (count > 0) {
      // Get recent logs
      const logsQuery = `
        SELECT TOP 10
          ual.id,
          l.contact_name,
          l.company_name,
          ual.action_type,
          ual.entity_type,
          ual.description,
          ual.created_at
        FROM dbo.user_activity_log ual
        INNER JOIN dbo.leads l ON ual.lead_id = l.id
        ORDER BY ual.created_at DESC
      `;
      
      const logsResult = await database.query(logsQuery);
      const logs = Array.isArray(logsResult) ? logsResult : logsResult.recordset;
      
      console.log('📋 Recent User Activities:');
      console.log('='.repeat(80));
      logs.forEach(log => {
        const date = new Date(log.created_at).toLocaleString();
        console.log(`[${date}] ${log.contact_name} (${log.company_name})`);
        console.log(`  Action: ${log.action_type} | Entity: ${log.entity_type}`);
        console.log(`  Description: ${log.description}`);
        console.log('-'.repeat(80));
      });
    } else {
      console.log('ℹ️  No user activity logs found yet.');
      console.log('\n💡 User activities will be logged when:');
      console.log('   1. A user logs in (action_type: LOGIN)');
      console.log('   2. A user completes an assessment (action_type: ASSESSMENT_COMPLETE)');
      console.log('   3. A user updates an existing assessment (action_type: ASSESSMENT_UPDATE)');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkUserActivityLogs();
