import db from './config/database.js';

async function testDirectInsert() {
  try {
    console.log('🧪 Testing direct database inserts...\n');

    // Test 1: Create Assessment Type (add a new question)
    console.log('1️⃣ Creating test assessment type question...');
    const createTypeSql = `
      INSERT INTO assessment_questions (
        id, assessment_type, pillar_name, pillar_short_name, 
        question_text, question_order, is_active
      )
      VALUES (
        NEWID(), 
        'TEST', 
        'Strategy & Leadership', 
        'Strategy',
        'This is a test question for the TEST assessment type.',
        999,
        1
      );
      SELECT SCOPE_IDENTITY() as id;
    `;
    
    try {
      const typeResult = await db.query(createTypeSql);
      console.log('✅ Test assessment type created:', typeResult);
    } catch (error) {
      console.error('❌ Failed:', error.message);
    }

    // Test 2: Create Industry
    console.log('\n2️⃣ Creating test industry...');
    const createIndustrySql = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'industries')
      BEGIN
        CREATE TABLE industries (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100) NOT NULL UNIQUE,
          is_active BIT DEFAULT 1,
          created_at DATETIME2 DEFAULT GETDATE(),
          created_by NVARCHAR(50)
        );
      END;
      
      INSERT INTO industries (name, created_by)
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.is_active
      VALUES ('Test Industry Direct', 'system');
    `;
    
    try {
      const industryResult = await db.query(createIndustrySql);
      console.log('✅ Industry created:', industryResult);
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        console.log('⚠️  Industry already exists, trying update...');
      } else {
        console.error('❌ Failed:', error.message);
      }
    }

    // Test 3: Create Pillar
    console.log('\n3️⃣ Creating test pillar...');
    const createPillarSql = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'pillars')
      BEGIN
        CREATE TABLE pillars (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100) NOT NULL UNIQUE,
          short_name NVARCHAR(50) NOT NULL,
          is_active BIT DEFAULT 1,
          created_at DATETIME2 DEFAULT GETDATE(),
          created_by NVARCHAR(50)
        );
      END;
      
      INSERT INTO pillars (name, short_name, created_by)
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.short_name, INSERTED.is_active
      VALUES ('Test Pillar Direct', 'TestDirect', 'system');
    `;
    
    try {
      const pillarResult = await db.query(createPillarSql);
      console.log('✅ Pillar created:', pillarResult);
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        console.log('⚠️  Pillar already exists');
      } else {
        console.error('❌ Failed:', error.message);
      }
    }

    // Verify
    console.log('\n🔍 Verifying data...\n');
    
    const types = await db.query(`
      SELECT DISTINCT assessment_type 
      FROM assessment_questions
      WHERE is_active = 1
      ORDER BY assessment_type
    `);
    console.log('Assessment Types:', types.map(t => t.assessment_type));
    
    const industries = await db.query(`
      SELECT name FROM industries WHERE is_active = 1 ORDER BY name
    `);
    console.log('Industries:', industries.map(i => i.name));
    
    const pillars = await db.query(`
      SELECT name, short_name FROM pillars WHERE is_active = 1 ORDER BY name
    `);
    console.log('Pillars:', pillars.map(p => `${p.name} (${p.short_name})`));

    console.log('\n✅ Direct insert test complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testDirectInsert();
