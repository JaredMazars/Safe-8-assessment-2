import database from './config/database.js';

async function verifyActivityLogging() {
  try {
    console.log('\n📊 ACTIVITY LOGGING VERIFICATION\n');
    console.log('='.repeat(60));

    // Check admin activity logs
    const adminLogsQuery = `
      SELECT TOP 5
        aal.action_type,
        aal.entity_type,
        aal.description,
        au.username as admin_username,
        FORMAT(aal.created_at, 'yyyy-MM-dd HH:mm:ss') as timestamp
      FROM admin_activity_log aal
      LEFT JOIN admin_users au ON aal.admin_id = au.id
      ORDER BY aal.created_at DESC
    `;
    
    const adminLogs = await database.query(adminLogsQuery);
    
    console.log('\n👤 ADMIN ACTIVITY LOGS (Last 5):');
    console.log('-'.repeat(60));
    if (adminLogs && adminLogs.recordset && adminLogs.recordset.length > 0) {
      adminLogs.recordset.forEach(log => {
        console.log(`[${log.timestamp}] ${log.admin_username || 'Unknown'}`);
        console.log(`  Action: ${log.action_type} | Entity: ${log.entity_type}`);
        console.log(`  Description: ${log.description}`);
        console.log();
      });
    } else {
      console.log('No admin activity logs found.');
    }

    // Check user activity logs
    const userLogsQuery = `
      SELECT TOP 5
        ual.action_type,
        ual.entity_type,
        ual.description,
        l.contact_name,
        l.company_name,
        FORMAT(ual.created_at, 'yyyy-MM-dd HH:mm:ss') as timestamp
      FROM user_activity_log ual
      LEFT JOIN leads l ON ual.lead_id = l.id
      ORDER BY ual.created_at DESC
    `;
    
    const userLogs = await database.query(userLogsQuery);
    
    console.log('\n👥 USER ACTIVITY LOGS (Last 5):');
    console.log('-'.repeat(60));
    if (userLogs && userLogs.recordset && userLogs.recordset.length > 0) {
      userLogs.recordset.forEach(log => {
        const userInfo = log.contact_name ? 
          `${log.contact_name}${log.company_name ? ' (' + log.company_name + ')' : ''}` : 
          'Unknown User';
        console.log(`[${log.timestamp}] ${userInfo}`);
        console.log(`  Action: ${log.action_type} | Entity: ${log.entity_type}`);
        console.log(`  Description: ${log.description}`);
        console.log();
      });
    } else {
      console.log('No user activity logs found.');
    }

    // Action type statistics
    console.log('\n📈 ACTION TYPE STATISTICS:');
    console.log('-'.repeat(60));
    
    const statsQuery = `
      SELECT 
        'Admin' as source,
        action_type,
        COUNT(*) as count
      FROM admin_activity_log
      GROUP BY action_type
      UNION ALL
      SELECT 
        'User' as source,
        action_type,
        COUNT(*) as count
      FROM user_activity_log
      GROUP BY action_type
      ORDER BY source, action_type
    `;
    
    const stats = await database.query(statsQuery);
    
    let currentSource = '';
    if (stats && stats.recordset) {
      stats.recordset.forEach(stat => {
        if (stat.source !== currentSource) {
          currentSource = stat.source;
          console.log(`\n${stat.source} Activities:`);
        }
        console.log(`  ${stat.action_type}: ${stat.count}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Verification complete!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error verifying activity logging:', error);
    process.exit(1);
  }
}

verifyActivityLogging();
