import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: process.env.NODE_ENV !== 'production'
  }
};

async function capitalizeAssessmentTypes() {
  let pool;
  
  try {
    console.log('📊 Connecting to database...');
    pool = await sql.connect(dbConfig);
    console.log('✅ Connected to database');

    // Update assessments table
    console.log('\n📝 Updating assessments table...');
    const assessmentsResult = await pool.request().query(`
      UPDATE assessments 
      SET assessment_type = UPPER(LEFT(assessment_type, 1)) + LOWER(SUBSTRING(assessment_type, 2, LEN(assessment_type)))
      WHERE assessment_type IS NOT NULL
    `);
    console.log(`✅ Updated ${assessmentsResult.rowsAffected[0]} rows in assessments table`);

    // Update assessment_questions table
    console.log('\n📝 Updating assessment_questions table...');
    const questionsResult = await pool.request().query(`
      UPDATE assessment_questions 
      SET assessment_type = UPPER(LEFT(assessment_type, 1)) + LOWER(SUBSTRING(assessment_type, 2, LEN(assessment_type)))
      WHERE assessment_type IS NOT NULL
    `);
    console.log(`✅ Updated ${questionsResult.rowsAffected[0]} rows in assessment_questions table`);

    // Verify changes
    console.log('\n🔍 Verifying changes...\n');
    
    const assessmentTypes = await pool.request().query(`
      SELECT DISTINCT assessment_type FROM assessments ORDER BY assessment_type
    `);
    console.log('📊 Assessment types in assessments table:');
    assessmentTypes.recordset.forEach(row => {
      console.log(`   - ${row.assessment_type}`);
    });

    const questionTypes = await pool.request().query(`
      SELECT DISTINCT assessment_type FROM assessment_questions ORDER BY assessment_type
    `);
    console.log('\n📊 Assessment types in questions table:');
    questionTypes.recordset.forEach(row => {
      console.log(`   - ${row.assessment_type}`);
    });

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n📊 Database connection closed');
    }
  }
}

// Run migration
capitalizeAssessmentTypes()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
