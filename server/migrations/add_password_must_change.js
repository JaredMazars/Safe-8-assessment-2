/**
 * Migration: Add password_must_change column to leads table
 * 
 * This column tracks whether a user must change their password on next login.
 * Used for admin-created users who receive temporary passwords.
 */

import database from '../config/database.js';

async function addPasswordMustChangeColumn() {
  console.log('🔄 Starting migration: Add password_must_change column...');
  
  try {
    // Check if column already exists
    const checkColumnSql = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'leads' AND COLUMN_NAME = 'password_must_change';
    `;
    
    const columnCheck = await database.query(checkColumnSql);
    
    if (columnCheck.recordset && columnCheck.recordset.length > 0) {
      console.log('✅ Column password_must_change already exists, skipping migration');
      return { success: true, message: 'Column already exists' };
    }
    
    // Add the column
    const alterTableSql = `
      ALTER TABLE leads 
      ADD password_must_change BIT DEFAULT 0;
    `;
    
    await database.query(alterTableSql);
    console.log('✅ Successfully added password_must_change column');
    
    // Set existing users to not require password change
    const updateExistingSql = `
      UPDATE leads 
      SET password_must_change = 0 
      WHERE password_must_change IS NULL;
    `;
    
    await database.query(updateExistingSql);
    console.log('✅ Updated existing users to password_must_change = 0');
    
    return { success: true, message: 'Migration completed successfully' };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
addPasswordMustChangeColumn()
  .then(result => {
    console.log('Migration result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration error:', error);
    process.exit(1);
  });
