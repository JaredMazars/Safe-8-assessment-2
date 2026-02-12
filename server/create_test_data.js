import database from './config/database.js';
import bcrypt from 'bcrypt';

async function createTestData() {
  console.log('🌱 Creating Test Data for Admin Dashboard...\n');

  try {
    // Create test users (leads)
    console.log('Step 1: Creating test users...');
    const passwordHash = await bcrypt.hash('Test123!', 12);
    
    const users = [
      { name: 'John Smith', email: 'john.smith@example.com', company: 'Tech Corp', industry: 'Technology', position: 'CTO' },
      { name: 'Sarah Johnson', email: 'sarah.j@company.com', company: 'Finance Plus', industry: 'Financial Services', position: 'CFO' },
      { name: 'Mike Chen', email: 'mike.chen@startup.io', company: 'AI Startup', industry: 'Technology', position: 'CEO' },
      { name: 'Emma Davis', email: 'emma.d@manufacturing.com', company: 'Manufacturing Co', industry: 'Manufacturing', position: 'Operations Director' },
      { name: 'Robert Wilson', email: 'robert.w@healthcare.org', company: 'Healthcare Systems', industry: 'Healthcare', position: 'IT Manager' }
    ];

    const createdUsers = [];
    for (const user of users) {
      const result = await database.query(`
        INSERT INTO leads (full_name, email, company_name, industry, position, phone_number, password_hash, is_verified)
        OUTPUT INSERTED.id, INSERTED.full_name, INSERTED.email
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `, [user.name, user.email, user.company, user.industry, user.position, '+1-555-0100', passwordHash]);
      
      createdUsers.push(result.recordset[0]);
      console.log(`   ✅ Created user: ${user.name} (${user.email})`);
    }
    console.log(`✅ Created ${createdUsers.length} users\n`);

    // Check if questions exist
    console.log('Step 2: Checking questions...');
    const questionsCheck = await database.query(`SELECT COUNT(*) as count FROM assessment_questions WHERE is_active = 1`);
    const questionCount = questionsCheck.recordset[0].count;
    
    if (questionCount === 0) {
      console.log('   ⚠️  No questions found! Creating sample questions...');
      
      const sampleQuestions = [
        { type: 'CORE', pillar: 'Strategy', short: 'STRAT', text: 'How mature is your AI strategy?', order: 1 },
        { type: 'CORE', pillar: 'Architecture', short: 'ARCH', text: 'Do you have a defined AI architecture?', order: 2 },
        { type: 'CORE', pillar: 'Foundation', short: 'FOUND', text: 'Is your data infrastructure ready for AI?', order: 3 },
        { type: 'CORE', pillar: 'Ethics', short: 'ETHIC', text: 'Do you have AI ethics guidelines?', order: 4 },
        { type: 'CORE', pillar: 'Culture', short: 'CULT', text: 'Is your organization AI-ready culturally?', order: 5 },
        { type: 'ADVANCED', pillar: 'Capability', short: 'CAP', text: 'Do you have AI capabilities in-house?', order: 1 },
        { type: 'ADVANCED', pillar: 'Governance', short: 'GOV', text: 'Is AI governance established?', order: 2 },
        { type: 'FRONTIER', pillar: 'Performance', short: 'PERF', text: 'Do you measure AI performance?', order: 1 }
      ];

      for (const q of sampleQuestions) {
        await database.query(`
          INSERT INTO assessment_questions (assessment_type, pillar_name, pillar_short_name, question_text, question_order, is_active)
          VALUES (?, ?, ?, ?, ?, 1)
        `, [q.type, q.pillar, q.short, q.text, q.order]);
      }
      console.log(`   ✅ Created ${sampleQuestions.length} sample questions`);
    } else {
      console.log(`   ✅ Found ${questionCount} existing questions`);
    }
    console.log('');

    // Create sample assessments
    console.log('Step 3: Creating sample assessments...');
    const assessmentTypes = ['CORE', 'ADVANCED', 'FRONTIER'];
    
    for (let i = 0; i < 3; i++) {
      const user = createdUsers[i];
      const type = assessmentTypes[i % assessmentTypes.length];
      const score = 60 + Math.random() * 30; // Random score between 60-90

      const dimensionScores = [
        { pillar_name: 'Strategy', score: score + (Math.random() * 10 - 5) },
        { pillar_name: 'Architecture', score: score + (Math.random() * 10 - 5) },
        { pillar_name: 'Foundation', score: score + (Math.random() * 10 - 5) },
        { pillar_name: 'Ethics', score: score + (Math.random() * 10 - 5) }
      ];

      const insights = {
        score_category: score > 80 ? 'AI Leader' : score > 65 ? 'AI Adopter' : 'AI Beginner',
        gap_analysis: ['Improve data infrastructure', 'Enhance AI governance'],
        service_recommendations: ['AI Strategy Consulting', 'Data Architecture Assessment']
      };

      await database.query(`
        INSERT INTO assessments (lead_user_id, assessment_type, industry, overall_score, dimension_scores, responses, insights, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE())
      `, [
        user.id,
        type,
        users[i].industry,
        score,
        JSON.stringify(dimensionScores),
        JSON.stringify({ '1': 4, '2': 5, '3': 3 }),
        JSON.stringify(insights)
      ]);

      console.log(`   ✅ Created ${type} assessment for ${user.full_name} (Score: ${score.toFixed(1)}%)`);
    }
    console.log(`✅ Created 3 sample assessments\n`);

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ TEST DATA CREATED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Summary:');
    console.log(`  • ${createdUsers.length} Users`);
    console.log(`  • ${questionCount > 0 ? questionCount : 8} Questions`);
    console.log(`  • 3 Assessments`);
    console.log('');
    console.log('Now you can login to Admin Dashboard:');
    console.log('  URL: http://localhost:5173/admin/dashboard');
    console.log('  Username: admin');
    console.log('  Password: Admin123!');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    process.exit(0);
  }
}

createTestData();
