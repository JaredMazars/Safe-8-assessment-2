import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function addPillarWeightsSystem() {
  let pool;
  
  try {
    console.log('🔄 Connecting to database...');
    pool = await sql.connect(dbConfig);

    // Check if pillar_weights table exists
    const checkTable = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'pillar_weights'
    `);

    if (checkTable.recordset[0].count === 0) {
      console.log('📊 Creating pillar_weights table...');
      await pool.request().query(`
        CREATE TABLE pillar_weights (
          id INT IDENTITY(1,1) PRIMARY KEY,
          assessment_type NVARCHAR(50) NOT NULL,
          pillar_name NVARCHAR(100) NOT NULL,
          pillar_short_name NVARCHAR(10),
          weight_percentage DECIMAL(5,2) NOT NULL,
          is_default BIT DEFAULT 1,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE(),
          created_by NVARCHAR(50),
          CONSTRAINT UQ_pillar_weights_type_name UNIQUE (assessment_type, pillar_name),
          CONSTRAINT CHK_weight_percentage CHECK (weight_percentage >= 0 AND weight_percentage <= 100)
        )
      `);
      console.log('✅ pillar_weights table created');
    } else {
      console.log('ℹ️  pillar_weights table already exists');
    }

    // Check if default_weight column exists in pillars table
    const checkPillarsTable = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'pillars'
    `);

    if (checkPillarsTable.recordset[0].count > 0) {
      const checkColumn = await pool.request().query(`
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'pillars' AND COLUMN_NAME = 'default_weight'
      `);

      if (checkColumn.recordset[0].count === 0) {
        console.log('➕ Adding default_weight column to pillars table...');
        await pool.request().query(`
          ALTER TABLE pillars
          ADD default_weight DECIMAL(5,2) DEFAULT 12.50
        `);
        console.log('✅ default_weight column added to pillars');
      } else {
        console.log('ℹ️  default_weight column already exists in pillars');
      }
    } else {
      console.log('⚠️  pillars table does not exist - skipping column addition');
    }

    // Seed default weights
    console.log('🌱 Seeding default pillar weights...');

    // CORE assessment weights (Strategy-focused for foundational readiness)
    const coreWeights = [
      { pillar: 'Strategy & Leadership', short: 'STRAT', weight: 20.00 },
      { pillar: 'Governance & Ethics', short: 'GOV', weight: 18.00 },
      { pillar: 'Data Readiness', short: 'DATA', weight: 15.00 },
      { pillar: 'Technology & Infrastructure', short: 'TECH', weight: 12.00 },
      { pillar: 'Security & Compliance', short: 'SEC', weight: 12.00 },
      { pillar: 'Skills & Talent', short: 'TALENT', weight: 10.00 },
      { pillar: 'Culture & Change', short: 'CULTURE', weight: 8.00 },
      { pillar: 'Performance & ROI', short: 'PERF', weight: 5.00 }
    ];

    // ADVANCED assessment weights (Architecture-focused for technical maturity)
    const advancedWeights = [
      { pillar: 'Technology & Infrastructure', short: 'TECH', weight: 20.00 },
      { pillar: 'Data Readiness', short: 'DATA', weight: 18.00 },
      { pillar: 'Architecture & Design', short: 'ARCH', weight: 15.00 },
      { pillar: 'Strategy & Leadership', short: 'STRAT', weight: 15.00 },
      { pillar: 'Security & Compliance', short: 'SEC', weight: 12.00 },
      { pillar: 'Governance & Ethics', short: 'GOV', weight: 10.00 },
      { pillar: 'Skills & Talent', short: 'TALENT', weight: 5.00 },
      { pillar: 'Performance & ROI', short: 'PERF', weight: 5.00 }
    ];

    // FRONTIER assessment weights (Innovation-focused for cutting-edge capabilities)
    const frontierWeights = [
      { pillar: 'Innovation & R&D', short: 'INNOV', weight: 25.00 },
      { pillar: 'Research Capabilities', short: 'RES', weight: 20.00 },
      { pillar: 'Technology & Infrastructure', short: 'TECH', weight: 15.00 },
      { pillar: 'Data Science & ML', short: 'DATA', weight: 12.00 },
      { pillar: 'Strategy & Vision', short: 'STRAT', weight: 10.00 },
      { pillar: 'Architecture & Scale', short: 'ARCH', weight: 8.00 },
      { pillar: 'Ethics & Responsibility', short: 'ETHICS', weight: 6.00 },
      { pillar: 'Governance', short: 'GOV', weight: 4.00 }
    ];

    // TEST assessment weights (Equal distribution for testing)
    const testWeights = [
      { pillar: 'Strategy', short: 'STRAT', weight: 12.50 },
      { pillar: 'Architecture', short: 'ARCH', weight: 12.50 },
      { pillar: 'Foundation', short: 'FOUND', weight: 12.50 },
      { pillar: 'Ethics', short: 'ETHICS', weight: 12.50 },
      { pillar: 'Culture', short: 'CULTURE', weight: 12.50 },
      { pillar: 'Capability', short: 'CAP', weight: 12.50 },
      { pillar: 'Governance', short: 'GOV', weight: 12.50 },
      { pillar: 'Performance', short: 'PERF', weight: 12.50 }
    ];

    // Insert CORE weights
    for (const w of coreWeights) {
      await pool.request()
        .input('assessmentType', sql.NVarChar(50), 'CORE')
        .input('pillarName', sql.NVarChar(100), w.pillar)
        .input('pillarShort', sql.NVarChar(10), w.short)
        .input('weight', sql.Decimal(5, 2), w.weight)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM pillar_weights WHERE assessment_type = @assessmentType AND pillar_name = @pillarName)
          BEGIN
            INSERT INTO pillar_weights (assessment_type, pillar_name, pillar_short_name, weight_percentage, is_default, created_by)
            VALUES (@assessmentType, @pillarName, @pillarShort, @weight, 1, 'system')
          END
        `);
    }
    console.log('✅ CORE assessment weights seeded');

    // Insert ADVANCED weights
    for (const w of advancedWeights) {
      await pool.request()
        .input('assessmentType', sql.NVarChar(50), 'ADVANCED')
        .input('pillarName', sql.NVarChar(100), w.pillar)
        .input('pillarShort', sql.NVarChar(10), w.short)
        .input('weight', sql.Decimal(5, 2), w.weight)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM pillar_weights WHERE assessment_type = @assessmentType AND pillar_name = @pillarName)
          BEGIN
            INSERT INTO pillar_weights (assessment_type, pillar_name, pillar_short_name, weight_percentage, is_default, created_by)
            VALUES (@assessmentType, @pillarName, @pillarShort, @weight, 1, 'system')
          END
        `);
    }
    console.log('✅ ADVANCED assessment weights seeded');

    // Insert FRONTIER weights
    for (const w of frontierWeights) {
      await pool.request()
        .input('assessmentType', sql.NVarChar(50), 'FRONTIER')
        .input('pillarName', sql.NVarChar(100), w.pillar)
        .input('pillarShort', sql.NVarChar(10), w.short)
        .input('weight', sql.Decimal(5, 2), w.weight)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM pillar_weights WHERE assessment_type = @assessmentType AND pillar_name = @pillarName)
          BEGIN
            INSERT INTO pillar_weights (assessment_type, pillar_name, pillar_short_name, weight_percentage, is_default, created_by)
            VALUES (@assessmentType, @pillarName, @pillarShort, @weight, 1, 'system')
          END
        `);
    }
    console.log('✅ FRONTIER assessment weights seeded');

    // Insert TEST weights
    for (const w of testWeights) {
      await pool.request()
        .input('assessmentType', sql.NVarChar(50), 'TEST')
        .input('pillarName', sql.NVarChar(100), w.pillar)
        .input('pillarShort', sql.NVarChar(10), w.short)
        .input('weight', sql.Decimal(5, 2), w.weight)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM pillar_weights WHERE assessment_type = @assessmentType AND pillar_name = @pillarName)
          BEGIN
            INSERT INTO pillar_weights (assessment_type, pillar_name, pillar_short_name, weight_percentage, is_default, created_by)
            VALUES (@assessmentType, @pillarName, @pillarShort, @weight, 1, 'system')
          END
        `);
    }
    console.log('✅ TEST assessment weights seeded');

    // Verify total weights
    const verifyQuery = await pool.request().query(`
      SELECT 
        assessment_type,
        SUM(weight_percentage) as total_weight,
        COUNT(*) as pillar_count
      FROM pillar_weights
      GROUP BY assessment_type
      ORDER BY assessment_type
    `);

    console.log('\n📋 Weight Verification:');
    verifyQuery.recordset.forEach(row => {
      const status = Math.abs(row.total_weight - 100) < 0.01 ? '✅' : '⚠️';
      console.log(`   ${status} ${row.assessment_type}: ${row.total_weight}% across ${row.pillar_count} pillars`);
    });

    console.log('\n✅ Pillar weights system migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Add API routes to server/routes/admin.js');
    console.log('   2. Update Assessment.js model with weighted calculation methods');
    console.log('   3. Add Admin UI section to AdminDashboard.jsx');
    console.log('   4. Test weighted scoring with sample assessments\n');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Run migration
addPillarWeightsSystem()
  .then(() => {
    console.log('🎉 Migration finished');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
