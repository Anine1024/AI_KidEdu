const db = require('../config/db');

/**
 * 创建视频记录
 */
async function createVideo({ userId, title, originalName, filename, fileSize, mimeType }) {
  const [result] = await db.execute(
    `INSERT INTO videos (user_id, title, original_name, filename, file_size, mime_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [userId, title, originalName, filename, fileSize, mimeType]
  );
  return { id: result.insertId };
}

/**
 * 获取视频列表（分页，按时间倒序）
 */
async function listVideos({ page = 1, pageSize = 20 } = {}) {
  const offset = (page - 1) * pageSize;
  const [rows] = await db.execute(
    `SELECT v.id, v.title, v.file_size, v.mime_type, v.duration, v.created_at,
            u.nickname AS uploader_name
     FROM videos v
     LEFT JOIN users u ON v.user_id = u.id
     ORDER BY v.created_at DESC
     LIMIT ? OFFSET ?`,
    [String(pageSize), String(offset)]
  );
  const [[{ total }]] = await db.execute('SELECT COUNT(*) AS total FROM videos');
  return { rows, total, page, pageSize };
}

/**
 * 根据 ID 获取单个视频
 */
async function findVideoById(id) {
  const [rows] = await db.execute(
    `SELECT v.*, u.nickname AS uploader_name
     FROM videos v
     LEFT JOIN users u ON v.user_id = u.id
     WHERE v.id = ?`,
    [id]
  );
  return rows[0] || null;
}

/**
 * 删除视频记录
 */
async function deleteVideo(id) {
  const [result] = await db.execute('DELETE FROM videos WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { createVideo, listVideos, findVideoById, deleteVideo };
