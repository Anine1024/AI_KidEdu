const db = require('../config/db');

/**
 * 通过手机号查找用户
 */
async function findUserByPhone(phone) {
  const [rows] = await db.execute('SELECT * FROM users WHERE phone = ? LIMIT 1', [phone]);
  return rows[0] || null;
}

/**
 * 通过邮箱查找用户
 */
async function findUserByEmail(email) {
  const [rows] = await db.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

/**
 * 创建新用户
 */
async function createUser({ phone, passwordHash, nickname }) {
  const [result] = await db.execute(
    'INSERT INTO users (nickname, phone, password_hash, created_at) VALUES (?, ?, ?, NOW())',
    [nickname, phone, passwordHash]
  );
  return {
    id: result.insertId,
    phone,
    nickname
  };
}

/**
 * 更新密码
 */
async function updatePassword(phone, passwordHash) {
  const [result] = await db.execute(
    'UPDATE users SET password_hash = ? WHERE phone = ?',
    [passwordHash, phone]
  );
  return result.affectedRows > 0;
}

/**
 * 记录最后登录时间和 IP
 */
async function updateLastLogin(id, ip) {
  await db.execute(
    'UPDATE users SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?',
    [ip || null, id]
  );
}

module.exports = {
  findUserByPhone,
  findUserByEmail,
  createUser,
  updatePassword,
  updateLastLogin
};
