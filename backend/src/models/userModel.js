const db = require('../config/db');

async function findUserByPhone(phone) {
  const [rows] = await db.execute('SELECT * FROM users WHERE phone = ? LIMIT 1', [phone]);
  return rows[0] || null;
}

async function createUser({ phone, passwordHash }) {
  const [result] = await db.execute(
    'INSERT INTO users (phone, password_hash, created_at) VALUES (?, ?, NOW())',
    [phone, passwordHash]
  );
  return {
    id: result.insertId,
    phone
  };
}

async function updatePassword(phone, passwordHash) {
  const [result] = await db.execute(
    'UPDATE users SET password_hash = ? WHERE phone = ?',
    [passwordHash, phone]
  );
  return result.affectedRows > 0;
}

module.exports = {
  findUserByPhone,
  createUser,
  updatePassword
};



