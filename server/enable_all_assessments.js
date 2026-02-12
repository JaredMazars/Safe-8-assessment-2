import database from './config/database.js';

async function enableAllAssessments() {
  try {
    console.log('🔄 Setting up built-in assessment types...');

    // Insert or update built-in assessment types
    const sql = `
      MERGE INTO assessment_types_config AS target
      USING (VALUES 
        ('CORE', 'Core Assessment', 'Essential AI readiness evaluation for leadership teams', '25 questions • ~5 minutes', 'fas fa-rocket', 
         '["AI strategy alignment", "Governance essentials", "Basic readiness factors"]', 'Executives & Leaders', 'green', 1, 1),
        ('ADVANCED', 'Advanced Assessment', 'Deep dive into technical capabilities and infrastructure', '45 questions • ~9 minutes', 'fas fa-cogs',
         '["Technical infrastructure", "Data pipeline maturity", "Advanced capabilities"]', 'CIOs & Technical Leaders', 'blue', 1, 2),
        ('FRONTIER', 'Frontier Assessment', 'Cutting-edge AI capabilities and innovation readiness', '60 questions • ~12 minutes', 'fas fa-brain',
         '["Next-gen capabilities", "Multi-agent orchestration", "Cutting-edge readiness"]', 'AI Centers of Excellence', 'purple', 1, 3)
      ) AS source (assessment_type, title, description, duration, icon, features, audience, audience_color, is_active, display_order)
      ON target.assessment_type = source.assessment_type
      WHEN MATCHED THEN
        UPDATE SET 
          title = source.title,
          description = source.description,
          duration = source.duration,
          icon = source.icon,
          features = source.features,
          audience = source.audience,
          audience_color = source.audience_color,
          is_active = source.is_active,
          display_order = source.display_order
      WHEN NOT MATCHED THEN
        INSERT (assessment_type, title, description, duration, icon, features, audience, audience_color, is_active, display_order)
        VALUES (source.assessment_type, source.title, source.description, source.duration, source.icon, 
                source.features, source.audience, source.audience_color, source.is_active, source.display_order);
    `;

    const result = await database.query(sql);
    console.log(`✅ Set up built-in assessment types`);

    // Show current status
    const checkSql = `
      SELECT assessment_type, title, is_active, display_order
      FROM assessment_types_config
      ORDER BY display_order, assessment_type
    `;
    const check = await database.query(checkSql);
    console.log('\n📊 Current assessment types status:');
    console.table(check.recordset || check);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

enableAllAssessments();
