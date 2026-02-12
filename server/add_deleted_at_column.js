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

async function addDeletedAtColumn() {
  try {
    console.log('🔄 Connecting to database...');
    const pool = await sql.connect(dbConfig);

    // Check if column exists in admin_users
    const checkAdminUsers = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'admin_users' AND COLUMN_NAME = 'deleted_at'
    `);

    if (checkAdminUsers.recordset[0].count === 0) {
      console.log('➕ Adding deleted_at column to admin_users table...');
      await pool.request().query(`
        ALTER TABLE admin_users
        ADD deleted_at DATETIME NULL
      `);
      console.log('✅ Added deleted_at to admin_users');
    } else {
      console.log('ℹ️  deleted_at column already exists in admin_users');
    }

    // Check if column exists in admins
    const checkAdmins = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'admins' AND COLUMN_NAME = 'deleted_at'
    `);

    if (checkAdmins.recordset[0].count === 0) {
      console.log('➕ Adding deleted_at column to admins table...');
      await pool.request().query(`
        ALTER TABLE admins
        ADD deleted_at DATETIME NULL
      `);
      console.log('✅ Added deleted_at to admins');
    } else {
      console.log('ℹ️  deleted_at column already exists in admins');
    }

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

addDeletedAtColumn();
