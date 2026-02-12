import database from './config/database.js';

const defaultIndustries = [
  'Financial Services',
  'Technology',
  'Healthcare',
  'Manufacturing',
  'Retail & E-commerce',
  'Energy & Utilities',
  'Government',
  'Education',
  'Professional Services',
  'Other'
];

async function seedIndustries() {
  try {
    console.log('🌱 Seeding default industries...');

    for (const industry of defaultIndustries) {
      try {
        const checkSql = `SELECT id FROM industries WHERE name = ?`;
        const existing = await database.query(checkSql, [industry]);
        
        if (Array.isArray(existing) && existing.length > 0) {
          console.log(`✅ Already exists: ${industry}`);
        } else {
          const insertSql = `
            INSERT INTO industries (name, is_active, created_by)
            VALUES (?, 1, 'system')
          `;
          await database.query(insertSql, [industry]);
          console.log(`✅ Added: ${industry}`);
        }
      } catch (error) {
        console.error(`❌ Error adding ${industry}:`, error.message);
      }
    }

    console.log('\n✅ Default industries seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding industries:', error);
    process.exit(1);
  }
}

seedIndustries();
