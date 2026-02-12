import database from './config/database.js';

async function checkExistingData() {
  console.log('🔍 Checking Existing Data in Database...\n');

  try {
    // Check users in leads table
    console.log('===== USERS IN LEADS TABLE =====');
    const usersResult = await database.query(`
      SELECT 
        id,
        full_name,
        email,
        company_name,
        industry,
        position,
        is_verified,
        created_at,
        last_login_at
      FROM leads
      ORDER BY created_at DESC
    `);
    
    const users = usersResult.recordset;
    console.log(`Found ${users.length} users:\n`);
    
    users.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.full_name} (${user.email})`);
      console.log(`   Company: ${user.company_name || 'N/A'}`);
      console.log(`   Industry: ${user.industry || 'N/A'}`);
      console.log(`   Verified: ${user.is_verified ? 'Yes' : 'No'}`);
      console.log(`   Registered: ${user.created_at}`);
      console.log('');
    });

    // Check assessments
    console.log('\n===== ASSESSMENTS =====');
    const assessmentsResult = await database.query(`
      SELECT 
        a.id,
        a.lead_user_id,
        l.full_name as user_name,
        l.email as user_email,
        a.assessment_type,
        a.industry,
        a.overall_score,
        a.completed_at,
        a.created_at
      FROM assessments a
      LEFT JOIN leads l ON a.lead_user_id = l.id
      ORDER BY a.completed_at DESC
    `);
    
    const assessments = assessmentsResult.recordset;
    console.log(`Found ${assessments.length} assessments:\n`);
    
    assessments.forEach((assessment, idx) => {
      console.log(`${idx + 1}. ${assessment.user_name} (${assessment.user_email})`);
      console.log(`   Type: ${assessment.assessment_type}`);
      console.log(`   Score: ${assessment.overall_score?.toFixed(2)}%`);
      console.log(`   Industry: ${assessment.industry || 'N/A'}`);
      console.log(`   Completed: ${assessment.completed_at}`);
      console.log('');
    });

    // Check for specific user
    console.log('\n===== JARED MOODLEY DATA =====');
    const jaredResult = await database.query(`
      SELECT 
        id,
        full_name,
        email,
        company_name,
        industry,
        position,
        is_verified,
        created_at
      FROM leads
      WHERE email LIKE '%jared%' OR email LIKE '%moodley%'
    `);
    
    if (jaredResult.recordset.length > 0) {
      const jared = jaredResult.recordset[0];
      console.log(`User: ${jared.full_name}`);
      console.log(`Email: ${jared.email}`);
      console.log(`Company: ${jared.company_name || 'N/A'}`);
      console.log(`ID: ${jared.id}`);
      
      // Get Jared's assessments
      const jaredAssessments = await database.query(`
        SELECT 
          id,
          assessment_type,
          industry,
          overall_score,
          dimension_scores,
          insights,
          completed_at
        FROM assessments
        WHERE lead_user_id = ?
        ORDER BY completed_at DESC
      `, [jared.id]);
      
      console.log(`\nAssessments: ${jaredAssessments.recordset.length}`);
      jaredAssessments.recordset.forEach((a, idx) => {
        console.log(`\n  Assessment ${idx + 1}:`);
        console.log(`    Type: ${a.assessment_type}`);
        console.log(`    Score: ${a.overall_score?.toFixed(2)}%`);
        console.log(`    Completed: ${a.completed_at}`);
        
        if (a.dimension_scores) {
          try {
            const scores = JSON.parse(a.dimension_scores);
            console.log(`    Pillar Scores:`);
            scores.forEach(s => {
              console.log(`      - ${s.pillar_name}: ${s.score?.toFixed(1)}%`);
            });
          } catch (e) {
            console.log(`    Pillar Scores: Unable to parse`);
          }
        }
      });
    } else {
      console.log('⚠️  User not found. Searching all emails...');
      const allEmails = await database.query(`SELECT email FROM leads`);
      console.log('\nAll emails in database:');
      allEmails.recordset.forEach(e => console.log(`  - ${e.email}`));
    }

    // Check questions
    console.log('\n\n===== QUESTIONS =====');
    const questionsResult = await database.query(`
      SELECT 
        assessment_type,
        COUNT(*) as count
      FROM assessment_questions
      WHERE is_active = 1
      GROUP BY assessment_type
      ORDER BY assessment_type
    `);
    
    console.log('Questions by type:');
    questionsResult.recordset.forEach(q => {
      console.log(`  ${q.assessment_type}: ${q.count} questions`);
    });

    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total Users: ${users.length}`);
    console.log(`Total Assessments: ${assessments.length}`);
    console.log(`Total Questions: ${questionsResult.recordset.reduce((sum, q) => sum + q.count, 0)}`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    process.exit(0);
  }
}

checkExistingData();
