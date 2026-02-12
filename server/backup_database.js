/**
 * SAFE-8 Database Backup Script
 * Exports all tables and data from Azure SQL to local SQL files
 */

import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Azure Database Configuration
const azureConfig = {
  server: 'safe-8-server.database.windows.net',
  database: 'safe-8-db',
  user: 'safe8admin',
  password: 'Safe8Admin2024!',
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true
  }
};

const backupFolder = path.join(__dirname, 'database_backup');

// Create backup folder
if (!fs.existsSync(backupFolder)) {
  fs.mkdirSync(backupFolder, { recursive: true });
}

console.log('============================================');
console.log('SAFE-8 Database Backup Tool');
console.log('============================================\n');

async function backupDatabase() {
  try {
    console.log('📦 Connecting to Azure database...');
    const pool = await sql.connect(azureConfig);
    console.log('✅ Connected successfully!\n');

    // Get all tables
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      ORDER BY TABLE_NAME
    `);

    const tables = tablesResult.recordset.map(r => r.TABLE_NAME);
    console.log(`📊 Found ${tables.length} tables to backup\n`);

    // Schema file
    let schemaSQL = `-- ============================================\n`;
    schemaSQL += `-- SAFE-8 Database Schema\n`;
    schemaSQL += `-- Generated: ${new Date().toISOString()}\n`;
    schemaSQL += `-- ============================================\n\n`;
    schemaSQL += `USE master;\nGO\n\n`;
    schemaSQL += `-- Drop database if exists\n`;
    schemaSQL += `IF EXISTS (SELECT name FROM sys.databases WHERE name = N'SAFE8_Local')\n`;
    schemaSQL += `BEGIN\n`;
    schemaSQL += `    ALTER DATABASE [SAFE8_Local] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;\n`;
    schemaSQL += `    DROP DATABASE [SAFE8_Local];\n`;
    schemaSQL += `END\nGO\n\n`;
    schemaSQL += `CREATE DATABASE [SAFE8_Local];\nGO\n\n`;
    schemaSQL += `USE [SAFE8_Local];\nGO\n\n`;

    // Data file
    let dataSQL = `-- ============================================\n`;
    dataSQL += `-- SAFE-8 Database Data\n`;
    dataSQL += `-- Generated: ${new Date().toISOString()}\n`;
    dataSQL += `-- ============================================\n\n`;
    dataSQL += `USE [SAFE8_Local];\nGO\n\n`;
    dataSQL += `SET IDENTITY_INSERT [admin_users] ON;\nGO\n\n`;

    for (const table of tables) {
      console.log(`📋 Processing: ${table}`);

      // Get table schema
      const columnsResult = await pool.request().query(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          CHARACTER_MAXIMUM_LENGTH,
          NUMERIC_PRECISION,
          NUMERIC_SCALE,
          IS_NULLABLE,
          COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${table}'
        ORDER BY ORDINAL_POSITION
      `);

      const columns = columnsResult.recordset;

      // Build CREATE TABLE statement
      schemaSQL += `-- Table: ${table}\n`;
      schemaSQL += `CREATE TABLE [${table}] (\n`;

      columns.forEach((col, idx) => {
        let colDef = `    [${col.COLUMN_NAME}] ${col.DATA_TYPE}`;

        if (['varchar', 'nvarchar', 'char', 'nchar'].includes(col.DATA_TYPE)) {
          colDef += col.CHARACTER_MAXIMUM_LENGTH === -1 ? '(MAX)' : `(${col.CHARACTER_MAXIMUM_LENGTH})`;
        } else if (['decimal', 'numeric'].includes(col.DATA_TYPE)) {
          colDef += `(${col.NUMERIC_PRECISION}, ${col.NUMERIC_SCALE})`;
        }

        colDef += col.IS_NULLABLE === 'NO' ? ' NOT NULL' : ' NULL';

        if (col.COLUMN_DEFAULT) {
          colDef += ` DEFAULT ${col.COLUMN_DEFAULT}`;
        }

        schemaSQL += colDef + (idx < columns.length - 1 ? ',\n' : '\n');
      });

      schemaSQL += `);\nGO\n\n`;

      // Get primary key
      const pkResult = await pool.request().query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_NAME = '${table}'
        AND CONSTRAINT_NAME LIKE 'PK_%'
        ORDER BY ORDINAL_POSITION
      `);

      if (pkResult.recordset.length > 0) {
        const pkColumns = pkResult.recordset.map(r => `[${r.COLUMN_NAME}]`).join(', ');
        schemaSQL += `ALTER TABLE [${table}] ADD PRIMARY KEY (${pkColumns});\nGO\n\n`;
      }

      // Get data
      const dataResult = await pool.request().query(`SELECT * FROM [${table}]`);
      const rows = dataResult.recordset;

      if (rows.length > 0) {
        dataSQL += `-- Data for table: ${table}\n`;
        dataSQL += `-- ${rows.length} rows\n`;

        if (table === 'admin_users') {
          dataSQL += `SET IDENTITY_INSERT [${table}] ON;\nGO\n`;
        }

        const columnNames = columns.map(c => `[${c.COLUMN_NAME}]`).join(', ');

        rows.forEach(row => {
          const values = columns.map(col => {
            const val = row[col.COLUMN_NAME];
            
            if (val === null || val === undefined) {
              return 'NULL';
            }

            if (col.DATA_TYPE === 'bit') {
              return val ? '1' : '0';
            }

            if (['int', 'bigint', 'smallint', 'tinyint', 'decimal', 'numeric', 'float', 'real'].includes(col.DATA_TYPE)) {
              return val.toString();
            }

            if (['datetime', 'datetime2', 'date', 'time'].includes(col.DATA_TYPE)) {
              return `'${new Date(val).toISOString().replace('T', ' ').replace('Z', '')}'`;
            }

            // String types
            const escaped = val.toString().replace(/'/g, "''");
            return `N'${escaped}'`;
          });

          dataSQL += `INSERT INTO [${table}] (${columnNames}) VALUES (${values.join(', ')});\n`;
        });

        if (table === 'admin_users') {
          dataSQL += `GO\nSET IDENTITY_INSERT [${table}] OFF;\nGO\n`;
        } else {
          dataSQL += `GO\n`;
        }
        
        dataSQL += `\n`;
        console.log(`   ✓ ${rows.length} rows exported`);
      } else {
        console.log(`   ℹ No data to export`);
      }
    }

    // Add indexes and constraints
    schemaSQL += `-- Indexes\n`;
    const indexesResult = await pool.request().query(`
      SELECT 
        t.name AS table_name,
        i.name AS index_name,
        i.is_unique,
        STRING_AGG(c.name, ', ') AS columns
      FROM sys.indexes i
      INNER JOIN sys.tables t ON i.object_id = t.object_id
      INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      WHERE t.is_ms_shipped = 0
      AND i.is_primary_key = 0
      AND i.type > 0
      GROUP BY t.name, i.name, i.is_unique
    `);

    if (indexesResult.recordset.length > 0) {
      indexesResult.recordset.forEach(idx => {
        const unique = idx.is_unique ? 'UNIQUE ' : '';
        schemaSQL += `CREATE ${unique}INDEX [${idx.index_name}] ON [${idx.table_name}] (${idx.columns});\nGO\n`;
      });
    }

    // Save files
    const schemaFile = path.join(backupFolder, '01_schema.sql');
    const dataFile = path.join(backupFolder, '02_data.sql');
    const readmeFile = path.join(backupFolder, 'README.txt');

    fs.writeFileSync(schemaFile, schemaSQL, 'utf8');
    fs.writeFileSync(dataFile, dataSQL, 'utf8');

    // Create README
    const readme = `
SAFE-8 Database Backup
======================
Generated: ${new Date().toISOString()}

Files:
------
01_schema.sql - Database schema (tables, indexes, constraints)
02_data.sql   - All data from Azure database

To restore to local SQL Server:
--------------------------------
1. Make sure SQL Server is installed and running
2. Open SQL Server Management Studio (SSMS)
3. Connect to your local SQL Server instance
4. Open and execute 01_schema.sql
5. Open and execute 02_data.sql

Using sqlcmd:
-------------
sqlcmd -S localhost -E -i 01_schema.sql
sqlcmd -S localhost -E -i 02_data.sql

Connection Details:
-------------------
Server: localhost
Database: SAFE8_Local
Authentication: Windows Authentication (Integrated Security)

Update your .env file:
----------------------
DB_SERVER=localhost
DB_NAME=SAFE8_Local
DB_USER=
DB_PASSWORD=
DB_INTEGRATED_SECURITY=true

Admin Login Credentials:
------------------------
Username: admin
Email: admin@forvismazars.com
Password: Admin123!

Role: super_admin

Test User Credentials:
----------------------
Check the admin_users table in 02_data.sql for all users.
All passwords are bcrypt hashed.
`;

    fs.writeFileSync(readmeFile, readme, 'utf8');

    console.log('\n✅ Backup completed successfully!');
    console.log('📁 Files created:');
    console.log(`   - ${schemaFile}`);
    console.log(`   - ${dataFile}`);
    console.log(`   - ${readmeFile}`);
    console.log('\n📖 See README.txt for restore instructions');

    await pool.close();

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

// Run backup
backupDatabase();
