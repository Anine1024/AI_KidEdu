const mysql = require('mysql2/promise');
require('dotenv').config();

function getConfig() {
  // Railway 等平台注入的连接串优先
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (url) {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: Number(u.port) || 3306,
      user: u.username,
      password: u.password,
      database: u.pathname.replace('/', ''),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
  }

  // 本地开发用独立变量
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'parent_kid_edu',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

const pool = mysql.createPool(getConfig());

module.exports = pool;
