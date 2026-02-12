import database from './config/database.js';

async function createTestAssessment() {
  try {
    console.log('\n📝 Creating TEST Assessment Questions...\n');
    
    // 20 questions distributed across 8 pillars (2-3 per pillar)
    const testQuestions = [
      // Strategy & Leadership (3 questions)
      { pillar: 'Strategy & Leadership', short: 'STRAT', text: 'Our organization has a clear testing strategy aligned with business objectives', order: 1 },
      { pillar: 'Strategy & Leadership', short: 'STRAT', text: 'Leadership actively supports and invests in quality assurance initiatives', order: 2 },
      { pillar: 'Strategy & Leadership', short: 'STRAT', text: 'We have defined KPIs to measure testing effectiveness and quality metrics', order: 3 },
      
      // Technology & Infrastructure (3 questions)
      { pillar: 'Technology & Infrastructure', short: 'TECH', text: 'Our testing infrastructure can scale to support multiple concurrent test executions', order: 4 },
      { pillar: 'Technology & Infrastructure', short: 'TECH', text: 'We have implemented CI/CD pipelines with automated testing gates', order: 5 },
      { pillar: 'Technology & Infrastructure', short: 'TECH', text: 'Our test environments mirror production configurations accurately', order: 6 },
      
      // Data Readiness (3 questions)
      { pillar: 'Data Readiness', short: 'DATA', text: 'We maintain comprehensive test data management and data masking practices', order: 7 },
      { pillar: 'Data Readiness', short: 'DATA', text: 'Our test data is version-controlled and easily reproducible', order: 8 },
      { pillar: 'Data Readiness', short: 'DATA', text: 'We have automated test data generation capabilities', order: 9 },
      
      // Skills & Talent (2 questions)
      { pillar: 'Skills & Talent', short: 'SKILL', text: 'Our QA team has expertise in modern testing frameworks and methodologies', order: 10 },
      { pillar: 'Skills & Talent', short: 'SKILL', text: 'Team members receive regular training on emerging testing technologies', order: 11 },
      
      // Security & Compliance (3 questions)
      { pillar: 'Security & Compliance', short: 'SEC', text: 'Security testing is integrated into our development lifecycle', order: 12 },
      { pillar: 'Security & Compliance', short: 'SEC', text: 'We conduct regular penetration testing and vulnerability assessments', order: 13 },
      { pillar: 'Security & Compliance', short: 'SEC', text: 'Compliance requirements are validated through automated testing', order: 14 },
      
      // Governance & Ethics (2 questions)
      { pillar: 'Governance & Ethics', short: 'GOV', text: 'We have established testing standards and quality gates across projects', order: 15 },
      { pillar: 'Governance & Ethics', short: 'GOV', text: 'Test coverage and quality metrics are reviewed in governance meetings', order: 16 },
      
      // Culture & Change (2 questions)
      { pillar: 'Culture & Change', short: 'CULT', text: 'Quality is considered a shared responsibility across all teams', order: 17 },
      { pillar: 'Culture & Change', short: 'CULT', text: 'We foster a culture of continuous improvement in testing practices', order: 18 },
      
      // Performance & ROI (2 questions)
      { pillar: 'Performance & ROI', short: 'PERF', text: 'We measure and track the ROI of our testing investments', order: 19 },
      { pillar: 'Performance & ROI', short: 'PERF', text: 'Testing activities directly contribute to faster time-to-market', order: 20 }
    ];
    
    console.log(`Creating ${testQuestions.length} questions for TEST assessment...\n`);
    
    for (const q of testQuestions) {
      const sql = `
        INSERT INTO assessment_questions (
          assessment_type, pillar_name, pillar_short_name, question_text, question_order, is_active
        )
        VALUES (?, ?, ?, ?, ?, 1);
      `;
      
      await database.query(sql, [
        'TEST',
        q.pillar,
        q.short,
        q.text,
        q.order
      ]);
      
      console.log(`✅ [${q.order}] ${q.pillar}: ${q.text.substring(0, 60)}...`);
    }
    
    console.log('\n✅ All TEST assessment questions created successfully!\n');
    
    // Verify
    const verify = await database.query(`
      SELECT COUNT(*) as count 
      FROM assessment_questions 
      WHERE assessment_type = 'TEST' AND is_active = 1
    `);
    
    const count = verify.recordset ? verify.recordset[0].count : verify[0].count;
    console.log(`✅ Verified: ${count} active TEST questions in database\n`);
    
  } catch (error) {
    console.error('\n❌ Error creating TEST assessment:', error.message);
    console.error('Full error:', error);
  } finally {
    process.exit();
  }
}

createTestAssessment();
