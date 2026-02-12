import database from './config/database.js';

async function checkTable() {
  try {
    console.log('🔍 Checking if user_activity_log table exists...');
    
    const checkQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'user_activity_log'
    `;
    
    const result = await database.query(checkQuery);
    
    if (result.recordset && result.recordset.length > 0) {
      console.log('✅ Table exists!');
      
      // Check structure
      const structureQuery = `
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'user_activity_log'
        ORDER BY ORDINAL_POSITION
      `;
      
      const structure = await database.query(structureQuery);
      console.log('\n📋 Table Structure:');
      structure.recordset.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''}`);
      });
      
      // Check if there are any rows
      const countQuery = 'SELECT COUNT(*) as count FROM user_activity_log';
      const count = await database.query(countQuery);
      console.log(`\n📊 Row count: ${count.recordset[0].count}`);
      
    } else {
      console.log('❌ Table does NOT exist!');
      console.log('\n🔧 Creating table now...');
      
      const createQuery = `
        CREATE TABLE user_activity_log (
          id INT IDENTITY(1,1) PRIMARY KEY,
          lead_id INT NOT NULL,
          action_type VARCHAR(50) NOT NULL,
          entity_type VARCHAR(50),
          entity_id INT,
          description NVARCHAR(500),
          ip_address VARCHAR(45),
          user_agent NVARCHAR(500),
          created_at DATETIME2 DEFAULT GETUTCDATE(),
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
        );
        
        CREATE INDEX idx_user_activity_lead_id ON user_activity_log(lead_id);
        CREATE INDEX idx_user_activity_created_at ON user_activity_log(created_at DESC);
        CREATE INDEX idx_user_activity_action_type ON user_activity_log(action_type);
      `;
      
      await database.query(createQuery);
      console.log('✅ Table created successfully!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkTable();
