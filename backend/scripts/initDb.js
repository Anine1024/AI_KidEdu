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

  // 3. 创建 users 表（如不存在则建新表，已存在则迁移缺失列）
  const [tables] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
    [DB_NAME]
  );
  const tableExists = tables.length > 0;

  if (!tableExists) {
    // 全新创建
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '用户ID',
        nickname VARCHAR(50) NOT NULL COMMENT '用户昵称',
        phone VARCHAR(20) NOT NULL COMMENT '手机号',
        email VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
        password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
        avatar VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
        status TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '账户状态: 1=正常, 0=禁用',
        last_login_at DATETIME DEFAULT NULL COMMENT '最后登录时间',
        last_login_ip VARCHAR(45) DEFAULT NULL COMMENT '最后登录IP',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        UNIQUE KEY uk_phone (phone),
        INDEX idx_email (email),
        INDEX idx_nickname (nickname),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
    `);
    console.log('数据表 \`users\` 已创建（新版本结构）');
  } else {
    // 表已存在：推进式迁移缺失列（兼容旧版本只有 4 列的情况）
    console.log('数据表 \`users\` 已存在，检查并迁移缺失列...');

    const migrations = [
      { name: 'nickname',          sql: "ALTER TABLE users ADD COLUMN nickname VARCHAR(50) NOT NULL DEFAULT '' COMMENT '用户昵称' AFTER id" },
      { name: 'email',             sql: 'ALTER TABLE users ADD COLUMN email VARCHAR(100) DEFAULT NULL COMMENT \'邮箱\' AFTER phone' },
      { name: 'avatar',            sql: "ALTER TABLE users ADD COLUMN avatar VARCHAR(255) DEFAULT NULL COMMENT '头像URL' AFTER password_hash" },
      { name: 'status',            sql: 'ALTER TABLE users ADD COLUMN status TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT \'账户状态: 1=正常, 0=禁用\' AFTER avatar' },
      { name: 'last_login_at',     sql: "ALTER TABLE users ADD COLUMN last_login_at DATETIME DEFAULT NULL COMMENT '最后登录时间' AFTER status" },
      { name: 'last_login_ip',     sql: "ALTER TABLE users ADD COLUMN last_login_ip VARCHAR(45) DEFAULT NULL COMMENT '最后登录IP' AFTER last_login_at" },
      { name: 'updated_at',        sql: "ALTER TABLE users ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间' AFTER created_at" },
    ];

    for (const migration of migrations) {
      try {
        await conn.query(migration.sql);
        console.log(`  ✅ 已添加列: ${migration.name}`);
      } catch (err) {
        // 1060 = Duplicate column name — 列已存在，跳过
        if (err.errno === 1060) {
          console.log(`  ⏭  列已存在，跳过: ${migration.name}`);
        } else {
          throw err;
        }
      }
    }

    // 补充可能缺失的索引
    const indexMigrations = [
      { name: 'idx_email',      sql: 'ALTER TABLE users ADD INDEX idx_email (email)' },
      { name: 'idx_nickname',   sql: 'ALTER TABLE users ADD INDEX idx_nickname (nickname)' },
      { name: 'idx_status',     sql: 'ALTER TABLE users ADD INDEX idx_status (status)' },
      { name: 'idx_created_at', sql: 'ALTER TABLE users ADD INDEX idx_created_at (created_at)' },
    ];

    for (const idx of indexMigrations) {
      try {
        await conn.query(idx.sql);
        console.log(`  ✅ 已添加索引: ${idx.name}`);
      } catch (err) {
        // 1061 = Duplicate key name
        if (err.errno === 1061) {
          console.log(`  ⏭  索引已存在，跳过: ${idx.name}`);
        } else {
          throw err;
        }
      }
    }

    console.log('迁移完成');
  }

  // 3b. 创建 videos 表（视频中心）
  await conn.query(`
    CREATE TABLE IF NOT EXISTS videos (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '视频ID',
      user_id INT UNSIGNED NOT NULL COMMENT '上传用户',
      title VARCHAR(100) NOT NULL COMMENT '视频标题',
      original_name VARCHAR(255) NOT NULL COMMENT '原始文件名',
      filename VARCHAR(255) NOT NULL COMMENT '存储文件名',
      file_size BIGINT UNSIGNED NOT NULL COMMENT '文件大小(字节)',
      mime_type VARCHAR(50) NOT NULL COMMENT 'MIME类型',
      duration FLOAT DEFAULT NULL COMMENT '视频时长(秒)',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      INDEX idx_user_id (user_id),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频表';
  `);
  console.log('数据表 \`videos\` 已确保存在');

  // 4. 插入一条默认测试账号（如果不存在）
  const defaultPhone = '13800000000';
  const defaultPassword = '123456';
  const defaultNickname = '测试家长';

  const [rows] = await conn.execute(
    'SELECT id FROM users WHERE phone = ? LIMIT 1',
    [defaultPhone]
  );

  if (rows.length === 0) {
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    await conn.execute(
      'INSERT INTO users (nickname, phone, password_hash, created_at) VALUES (?, ?, ?, NOW())',
      [defaultNickname, defaultPhone, passwordHash]
    );
    console.log(`已插入默认账号: 手机号=${defaultPhone}, 密码=${defaultPassword}, 昵称=${defaultNickname}`);
  } else {
    // 如果旧数据没有昵称，补一个默认昵称
    const [user] = rows;
    await conn.execute(
      "UPDATE users SET nickname = ? WHERE id = ? AND (nickname IS NULL OR nickname = '')",
      [defaultNickname, user.id]
    );
    console.log(`默认账号已存在: 手机号=${defaultPhone}`);
  }

  await conn.end();
  console.log('数据库初始化完成 ✅');
}

main().catch((err) => {
  console.error('初始化数据库失败:', err);
  process.exit(1);
});
