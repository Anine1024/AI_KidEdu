const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function main() {
  const {
    DB_HOST = '127.0.0.1',
    DB_PORT = 3306,
    DB_USER = 'root',
    DB_PASSWORD = '',
    DB_NAME = 'parent_kid_edu'
  } = process.env;

  console.log('开始初始化数据库...');

  // 1. 先连到不指定库的 MySQL，用来创建数据库
  const rootConn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD
  });

  await rootConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  console.log(`数据库 \`${DB_NAME}\` 已确保存在`);
  await rootConn.end();

  // 2. 连接到刚创建/已存在的库
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
  });

  // 3. 创建 users 表
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      phone VARCHAR(20) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('数据表 \`users\` 已确保存在');

  // 4. 插入一条默认账号（如果不存在）
  const defaultPhone = '13800000000';
  const defaultPassword = '123456';

  const [rows] = await conn.execute(
    'SELECT id FROM users WHERE phone = ? LIMIT 1',
    [defaultPhone]
  );

  if (rows.length === 0) {
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    await conn.execute(
      'INSERT INTO users (phone, password_hash, created_at) VALUES (?, ?, NOW())',
      [defaultPhone, passwordHash]
    );
    console.log(`已插入默认账号: 手机号=${defaultPhone}, 密码=${defaultPassword}`);
  } else {
    console.log(`默认账号已存在: 手机号=${defaultPhone}`);
  }

  await conn.end();
  console.log('数据库初始化完成 ✅');
}

main().catch((err) => {
  console.error('初始化数据库失败:', err);
  process.exit(1);
});




