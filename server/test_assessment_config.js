import database from './config/database.js';

async function testAssessmentTypeConfig() {
  try {
    console.log('🧪 Testing Assessment Type Configuration Feature\n');

    // Check if table exists
    console.log('1. Checking if assessment_types_config table exists...');
    const tableCheck = await database.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'assessment_types_config'
    `);
    const tableExists = (tableCheck?.recordset || tableCheck)[0]?.count > 0;
    
    if (tableExists) {
      console.log('   ✅ Table exists\n');

      // Get all configs
      console.log('2. Fetching assessment type configurations...');
      const configs = await database.query(`
        SELECT 
          assessment_type,
          title,
          description,
          duration,
          icon,
          features,
          audience,
          audience_color,
          display_order,
          is_active
        FROM assessment_types_config
        WHERE is_active = 1
        ORDER BY display_order;
      `);

      const configList = configs?.recordset || configs;
      console.log(`   ✅ Found ${configList.length} active assessment types:\n`);

      configList.forEach((config, idx) => {
        console.log(`   ${idx + 1}. ${config.assessment_type} - ${config.title}`);
        console.log(`      Duration: ${config.duration}`);
        console.log(`      Icon: ${config.icon}`);
        console.log(`      Audience: ${config.audience} (${config.audience_color})`);
        
        try {
          const features = JSON.parse(config.features);
          console.log(`      Features: ${features.join(', ')}`);
        } catch (e) {
          console.log(`      Features: ${config.features}`);
        }
        console.log('');
      });

      // Test public endpoint format
      console.log('3. Testing public endpoint format...');
      const publicFormat = configList.map(c => ({
        type: c.assessment_type.toLowerCase(),
        title: c.title,
        description: c.description,
        duration: c.duration,
        icon: c.icon,
        features: c.features ? JSON.parse(c.features) : [],
        audience: c.audience,
        audienceColor: c.audience_color
      }));

      console.log('   ✅ Public endpoint will return:');
      console.log(JSON.stringify({ success: true, configs: publicFormat }, null, 2));

    } else {
      console.log('   ❌ Table does not exist');
      console.log('   ℹ️  Run migration first: node migrate_assessment_types.js\n');
    }

    console.log('\n✅ Test complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testAssessmentTypeConfig();
