import database from './config/database.js';

async function recreateTables() {
  try {
    console.log('🔧 Recreating tables with correct schema...\n');
    
    // Step 1: Drop old tables (if they exist)
    console.log('1️⃣  Dropping old tables...');
    try {
      await database.query('DROP TABLE IF EXISTS service_recommendations');
      console.log('   ✓ Dropped old service_recommendations\n');
    } catch (error) {
      console.log('   ⚠ service_recommendations does not exist or cannot be dropped\n');
    }
    
    try {
      await database.query('DROP TABLE IF EXISTS industry_benchmarks');
      console.log('   ✓ Dropped old industry_benchmarks\n');
    } catch (error) {
      console.log('   ⚠ industry_benchmarks does not exist or cannot be dropped\n');
    }
    
    // Step 2: Create service_recommendations with correct schema
    console.log('2️⃣  Creating service_recommendations table...');
    await database.query(`
      CREATE TABLE service_recommendations (
        id INT PRIMARY KEY IDENTITY(1,1),
        assessment_type VARCHAR(50) NOT NULL,
        industry VARCHAR(100),
        title NVARCHAR(200) NOT NULL,
        description NVARCHAR(1000) NOT NULL,
        icon VARCHAR(100) DEFAULT 'fas fa-lightbulb',
        badge_text NVARCHAR(200),
        badge_icon VARCHAR(100) DEFAULT 'fas fa-star',
        priority VARCHAR(20) DEFAULT 'medium',
        min_score INT,
        max_score INT,
        is_active BIT DEFAULT 1,
        display_order INT DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT chk_service_score_range CHECK (min_score IS NULL OR max_score IS NULL OR (min_score >= 0 AND max_score <= 100 AND min_score <= max_score))
      )
    `);
    console.log('   ✓ service_recommendations created\n');
    
    // Step 3: Create industry_benchmarks with correct schema
    console.log('3️⃣  Creating industry_benchmarks table...');
    await database.query(`
      CREATE TABLE industry_benchmarks (
        id INT PRIMARY KEY IDENTITY(1,1),
        industry VARCHAR(100) NOT NULL,
        assessment_type VARCHAR(50) NOT NULL,
        average_score DECIMAL(5,2) NOT NULL,
        best_practice_score DECIMAL(5,2) NOT NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT uq_industry_assessment UNIQUE (industry, assessment_type),
        CONSTRAINT chk_benchmark_scores CHECK (average_score >= 0 AND average_score <= 100 AND best_practice_score >= 0 AND best_practice_score <= 100)
      )
    `);
    console.log('   ✓ industry_benchmarks created\n');
    
    // Step 4: Create indexes
    console.log('4️⃣  Creating indexes...');
    const indexes = [
      'CREATE INDEX idx_recommendations_type_industry ON service_recommendations(assessment_type, industry)',
      'CREATE INDEX idx_recommendations_score ON service_recommendations(min_score, max_score)',
      'CREATE INDEX idx_benchmarks_industry ON industry_benchmarks(industry, assessment_type)'
    ];
    
    for (const indexSql of indexes) {
      try {
        await database.query(indexSql);
        console.log(`   ✓ ${indexSql.match(/idx_\w+/)[0]}`);
      } catch (error) {
        console.log(`   ⚠ ${indexSql.match(/idx_\w+/)[0]} - ${error.message}`);
      }
    }
    
    console.log('\n🎉 Tables recreated successfully!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

recreateTables();
