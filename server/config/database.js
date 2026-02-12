import sql from 'mssql';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

// ✅ Validate required environment variables
const requiredEnvVars = ['DB_SERVER', 'DB_NAME'];
// Only require user/password if not using integrated security
if (process.env.DB_INTEGRATED_SECURITY !== 'true') {
  requiredEnvVars.push('DB_USER', 'DB_PASSWORD');
}
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.error('Missing required environment variables', { missingVars });
  logger.error('Please create a .env file with the required database credentials');
  process.exit(1);
}

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'yes', // Azure SQL requires encryption
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'yes',
    enableArithAbort: true,
    connectTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '60') * 1000,
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '60000'),
  },
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    min: parseInt(process.env.DB_POOL_MIN || '0'),
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000
  },
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '60') * 1000,
  requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '60000')
};

// Add authentication based on configuration
if (process.env.DB_INTEGRATED_SECURITY === 'true') {
  config.options.trustedConnection = true;
} else {
  config.user = process.env.DB_USER;
  config.password = process.env.DB_PASSWORD;
}

// ✅ Create singleton connection pool
let pool = null;

async function getPool() {
  if (!pool) {
    try {
      pool = await sql.connect(config);
      logger.info('Database connection pool created successfully');
      
      pool.on('error', err => {
        logger.error('Database pool error', { error: err.message });
        pool = null;
      });
    } catch (err) {
      logger.error('Database connection failed', { error: err.message });
      throw err;
    }
  }
  return pool;
}

const database = {
  async query(sqlQuery, params = []) {
    logger.debug('Database query called', { paramCount: params.length });
    try {
      const pool = await getPool();
      const request = pool.request();
      
      // Add parameters if provided
      if (params && params.length > 0) {
        logger.debug('Adding query parameters');
        params.forEach((param, index) => {
          const paramName = `param${index + 1}`;
          // Determine parameter type based on value
          if (typeof param === 'string') {
            request.input(paramName, sql.NVarChar, param);
          } else if (typeof param === 'number') {
            if (Number.isInteger(param)) {
              request.input(paramName, sql.Int, param);
            } else {
              request.input(paramName, sql.Decimal(10, 2), param);
            }
          } else {
            request.input(paramName, sql.NVarChar, String(param));
          }
          
          // Replace ? placeholder with @paramName in the query
          sqlQuery = sqlQuery.replace('?', `@param${index + 1}`);
        });
      }
      
      logger.debug('Executing database query');
      const result = await request.query(sqlQuery);
      logger.debug('Query completed successfully');
      
      // Return just the recordset for backward compatibility when no params
      // Return full result object when using parameterized queries
      if (params && params.length > 0) {
        return result;
      } else {
        return result.recordset;
      }
    } catch (error) {
      logger.error('Database query error', { error: error.message, stack: error.stack });
      throw error;
    }
    // ✅ Don't close pool - reuse connections
  },

  async testConnection() {
    try {
      await getPool();
      logger.info('Database connection test successful');
    } catch (error) {
      logger.error('Database connection failed', { error: error.message });
    }
  },

  async closePool() {
    if (pool) {
      await pool.close();
      pool = null;
      logger.info('Database connection pool closed');
    }
  }
};

// ✅ Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database pool');
  await database.closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database pool');
  await database.closePool();
  process.exit(0);
});

// Export pool getter and sql for compatibility
export { getPool, sql };
export default database;
