import database from './config/database.js';

async function migrateAssessmentTypesConfig() {
  try {
    console.log('🚀 Starting assessment types configuration migration...\n');

    // Run the migration script
    const migrationSql = `
      -- Create assessment_types_config table if it doesn't exist
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'assessment_types_config')
      BEGIN
        CREATE TABLE assessment_types_config (
          id INT PRIMARY KEY IDENTITY(1,1),
          assessment_type NVARCHAR(50) NOT NULL UNIQUE,
          title NVARCHAR(100) NOT NULL,
          description NVARCHAR(MAX),
          duration NVARCHAR(50),
          icon NVARCHAR(50),
          features NVARCHAR(MAX),
          audience NVARCHAR(100),
          audience_color NVARCHAR(20),
          is_active BIT DEFAULT 1,
          display_order INT DEFAULT 0,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE(),
          created_by INT
        );

        PRINT '✅ Created assessment_types_config table';
      END
      ELSE
      BEGIN
        PRINT 'ℹ️  assessment_types_config table already exists';
      END

      -- Insert default assessment types
      IF NOT EXISTS (SELECT * FROM assessment_types_config WHERE assessment_type = 'CORE')
      BEGIN
        INSERT INTO assessment_types_config 
          (assessment_type, title, description, duration, icon, features, audience, audience_color, display_order)
        VALUES 
          ('CORE', 'Core Assessment', 'Essential AI readiness evaluation for leadership teams', 
           '25 questions • ~5 minutes', 'fas fa-rocket',
           '["AI strategy alignment", "Governance essentials", "Basic readiness factors"]',
           'Executives & Leaders', 'green', 1);
           
        PRINT '✅ Inserted CORE assessment type';
      END

      IF NOT EXISTS (SELECT * FROM assessment_types_config WHERE assessment_type = 'ADVANCED')
      BEGIN
        INSERT INTO assessment_types_config 
          (assessment_type, title, description, duration, icon, features, audience, audience_color, display_order)
        VALUES 
          ('ADVANCED', 'Advanced Assessment', 'Deep dive into technical capabilities and infrastructure', 
           '45 questions • ~9 minutes', 'fas fa-cogs',
           '["Technical infrastructure", "Data pipeline maturity", "Advanced capabilities"]',
           'CIOs & Technical Leaders', 'blue', 2);
           
        PRINT '✅ Inserted ADVANCED assessment type';
      END

      IF NOT EXISTS (SELECT * FROM assessment_types_config WHERE assessment_type = 'FRONTIER')
      BEGIN
        INSERT INTO assessment_types_config 
          (assessment_type, title, description, duration, icon, features, audience, audience_color, display_order)
        VALUES 
          ('FRONTIER', 'Frontier Assessment', 'Cutting-edge AI capabilities and innovation readiness', 
           '60 questions • ~12 minutes', 'fas fa-brain',
           '["Next-gen capabilities", "Multi-agent orchestration", "Cutting-edge readiness"]',
           'AI Centers of Excellence', 'purple', 3);
           
        PRINT '✅ Inserted FRONTIER assessment type';
      END

      IF NOT EXISTS (SELECT * FROM assessment_types_config WHERE assessment_type = 'TEST')
      BEGIN
        INSERT INTO assessment_types_config 
          (assessment_type, title, description, duration, icon, features, audience, audience_color, display_order)
        VALUES 
          ('TEST', 'Test Assessment', 'Quality assurance and testing maturity evaluation', 
           '20 questions • ~4 minutes', 'fas fa-flask',
           '["QA automation maturity", "Testing infrastructure", "Quality metrics tracking"]',
           'QA & Testing Teams', 'orange', 4);
           
        PRINT '✅ Inserted TEST assessment type';
      END
    `;

    await database.query(migrationSql);

    console.log('\n✅ Assessment types configuration migration complete!\n');

    // Verify the data
    const result = await database.query(`
      SELECT assessment_type, title, audience, display_order 
      FROM assessment_types_config 
      ORDER BY display_order
    `);

    console.log('📊 Current assessment types in database:');
    const types = result?.recordset || result;
    types.forEach(type => {
      console.log(`  - ${type.assessment_type}: ${type.title} (${type.audience})`);
    });

    console.log('\n✅ Migration successful!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

migrateAssessmentTypesConfig();
