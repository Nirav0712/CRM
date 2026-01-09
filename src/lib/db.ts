import mysql from 'mysql2/promise';

// Diagnostic for Vercel
if (typeof window === 'undefined') {
  if (!process.env.MYSQL_HOST) console.error("DB_DIAGNOSTIC: MYSQL_HOST is missing");
  if (!process.env.MYSQL_USER) console.error("DB_DIAGNOSTIC: MYSQL_USER is missing");
  if (!process.env.MYSQL_DATABASE) console.error("DB_DIAGNOSTIC: MYSQL_DATABASE is missing");
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000, // 10 seconds timeout
});

export default pool;
