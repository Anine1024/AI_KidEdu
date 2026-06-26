const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createVideo, listVideos, findVideoById, deleteVideo } = require('../models/videoModel');

const VIDEOS_DIR = path.join(__dirname, '..', '..', 'uploads', 'videos');
const CHUNKS_DIR = path.join(__dirname, '..', '..', 'uploads', 'chunks');
const MAX_FILE_SIZE = 500 * 1024 * 1024;   // 500MB
const CHUNK_SIZE   = 5 * 1024 * 1024;       // 5MB 分片
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];

// 确保目录存在
[VIDEOS_DIR, CHUNKS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 启动时清理：删除 1 小时以上的临时文件（formidable 残留）和过期分片
(function cleanupOnStartup() {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  // 清理 videos 目录下的临时文件（非合法视频文件名的）
  const validPattern = /^\d{13}_[0-9a-f]{12}\.\w+$/;
  try {
    fs.readdirSync(VIDEOS_DIR).forEach(name => {
      const filePath = path.join(VIDEOS_DIR, name);
      try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) return;
        // 非合法命名 + 超过 1 小时的 → 删除
        if (!validPattern.test(name) && (now - stat.mtimeMs > ONE_HOUR)) {
          fs.unlinkSync(filePath);
          console.log(`[Cleanup] 删除临时文件: ${name}`);
        }
      } catch (e) { /* skip */ }
    });
  } catch (e) { /* skip */ }

  // 清理过期的分片目录
  try {
    fs.readdirSync(CHUNKS_DIR).forEach(dir => {
      const dirPath = path.join(CHUNKS_DIR, dir);
      try {
        const stat = fs.statSync(dirPath);
        if (stat.isDirectory() && (now - stat.mtimeMs > ONE_HOUR)) {
          fs.rmSync(dirPath, { recursive: true, force: true });
          console.log(`[Cleanup] 删除过期分片: ${dir}`);
        }
      } catch (e) { /* skip */ }
    });
  } catch (e) { /* skip */ }

  console.log('[Cleanup] 临时文件清理完成');
})();

// ---- 工具函数 ----

function sessionPath(uploadId) {
  return path.join(CHUNKS_DIR, uploadId);
}
function sessionFile(uploadId) {
  return path.join(sessionPath(uploadId), 'session.json');
}
function chunkFile(uploadId, index) {
  return path.join(sessionPath(uploadId), `chunk_${String(index).padStart(4, '0')}`);
}

function readSession(uploadId) {
  const file = sessionFile(uploadId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeSession(uploadId, data) {
  const dir = sessionPath(uploadId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(sessionFile(uploadId), JSON.stringify(data, null, 2));
}

// ---- 原有单文件上传（小文件快速通道，保留） ----

async function upload(ctx) {
  const file = ctx.request.files?.file;
  if (!file) { ctx.status = 400; ctx.body = { message: '请选择视频文件' }; return; }

  const f = Array.isArray(file) ? file[0] : file;

  if (!ctx.state?.user?.id) {
    try { fs.unlinkSync(f.filepath); } catch (e) { /* */ }
    ctx.status = 401; ctx.body = { message: '请先登录再上传视频' }; return;
  }
  if (f.size > MAX_FILE_SIZE) {
    try { fs.unlinkSync(f.filepath); } catch (e) { /* */ }
    ctx.status = 400; ctx.body = { message: `文件过大（最大 500MB），当前 ${Math.round(f.size / 1024 / 1024)}MB` }; return;
  }
  if (!ALLOWED_TYPES.includes(f.mimetype)) {
    try { fs.unlinkSync(f.filepath); } catch (e) { /* */ }
    ctx.status = 400; ctx.body = { message: `不支持的格式: ${f.mimetype}` }; return;
  }

  const ext = path.extname(f.originalFilename) || '.mp4';
  const filename = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
  fs.renameSync(f.filepath, path.join(VIDEOS_DIR, filename));

  const title = path.basename(f.originalFilename, ext).substring(0, 100) || '未命名视频';
  const video = await createVideo({
    userId: ctx.state.user.id, title, originalName: f.originalFilename,
    filename, fileSize: f.size, mimeType: f.mimetype
  });
  console.log(`[Video] 小文件上传: id=${video.id}, size=${Math.round(f.size / 1024)}KB`);
  ctx.body = { message: '上传成功', video: { id: video.id, title, originalName: f.originalFilename, fileSize: f.size, mimeType: f.mimetype } };
}

// ---- 分片上传 ----

/**
 * POST /api/videos/upload/init
 * Body JSON: { fileName, fileSize, mimeType, totalChunks }
 */
async function initUpload(ctx) {
  if (!ctx.state?.user?.id) { ctx.status = 401; ctx.body = { message: '请先登录' }; return; }

  const { fileName, fileSize, mimeType, totalChunks } = ctx.request.body || {};
  if (!fileName || !fileSize || !mimeType || !totalChunks) {
    ctx.status = 400; ctx.body = { message: '缺少 fileName/fileSize/mimeType/totalChunks' }; return;
  }
  if (fileSize > MAX_FILE_SIZE) {
    ctx.status = 400; ctx.body = { message: `文件过大（最大 500MB），当前 ${Math.round(fileSize / 1024 / 1024)}MB` }; return;
  }

  const uploadId = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  writeSession(uploadId, {
    uploadId, userId: ctx.state.user.id,
    originalName: fileName, fileSize, mimeType,
    totalChunks, chunkSize: CHUNK_SIZE,
    uploadedChunks: [],
    status: 'uploading',
    createdAt: new Date().toISOString()
  });

  console.log(`[Chunk] 初始化: uploadId=${uploadId}, chunks=${totalChunks}, size=${Math.round(fileSize / 1024)}KB`);
  ctx.body = { uploadId, chunkSize: CHUNK_SIZE };
}

/**
 * POST /api/videos/upload/chunk
 * FormData: uploadId, chunkIndex (number), chunk (file)
 */
async function uploadChunk(ctx) {
  try {
    if (!ctx.state?.user?.id) { ctx.status = 401; ctx.body = { message: '请先登录' }; return; }

    // koa-body v8 对 multipart 的字段解析：文本字段在 body，文件在 files
    const body = ctx.request.body || {};
    const uploadId = body.uploadId || body.uploadid;  // 兼容大小写
    const chunkIndex = body.chunkIndex ?? body.chunkindex;
    const file = ctx.request.files?.chunk ?? ctx.request.files?.file;

    if (!uploadId || chunkIndex === undefined || chunkIndex === null || !file) {
      console.error('[Chunk] 字段缺失:', { uploadId, chunkIndex, bodyKeys: Object.keys(body), fileKeys: Object.keys(ctx.request.files || {}) });
      ctx.status = 400;
      ctx.body = { message: `缺少参数: uploadId=${!!uploadId}, chunkIndex=${chunkIndex}, file=${!!file}` };
      return;
    }

    const session = readSession(uploadId);
    if (!session) { ctx.status = 404; ctx.body = { message: '上传会话不存在或已过期' }; return; }
    if (session.userId !== ctx.state.user.id) { ctx.status = 403; ctx.body = { message: '无权操作此上传会话' }; return; }

    const idx = parseInt(chunkIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= session.totalChunks) {
      const f = Array.isArray(file) ? file[0] : file;
      try { if (f?.filepath) fs.unlinkSync(f.filepath); } catch (e) { /* */ }
      ctx.status = 400;
      ctx.body = { message: `chunkIndex 无效: ${chunkIndex} (范围 0~${session.totalChunks - 1})` };
      return;
    }

    const f = Array.isArray(file) ? file[0] : file;
    if (!f?.filepath || !fs.existsSync(f.filepath)) {
      ctx.status = 400; ctx.body = { message: '上传文件已丢失，请重试' }; return;
    }

    const dest = chunkFile(uploadId, idx);
    fs.renameSync(f.filepath, dest);

    if (!session.uploadedChunks.includes(idx)) {
      session.uploadedChunks.push(idx);
      session.uploadedChunks.sort((a, b) => a - b);
      writeSession(uploadId, session);
    }

    console.log(`[Chunk] 收到: chunk=${idx}/${session.totalChunks - 1}, 进度=${session.uploadedChunks.length}/${session.totalChunks}`);
    ctx.body = { chunkIndex: idx, received: true };
  } catch (err) {
    console.error('[Chunk] 异常:', err.message);
    ctx.status = 500;
    ctx.body = { message: `分片上传失败: ${err.message}` };
  }
}

/**
 * GET /api/videos/upload/status/:uploadId
 * 查询上传进度（用于断点续传）
 */
async function getUploadStatus(ctx) {
  const { uploadId } = ctx.params;
  const session = readSession(uploadId);
  if (!session) { ctx.status = 404; ctx.body = { message: '上传会话不存在或已过期' }; return; }

  ctx.body = {
    uploadId: session.uploadId,
    fileName: session.originalName,
    fileSize: session.fileSize,
    mimeType: session.mimeType,
    totalChunks: session.totalChunks,
    chunkSize: session.chunkSize,
    uploadedChunks: session.uploadedChunks,
    status: session.status
  };
}

/**
 * POST /api/videos/upload/complete
 * Body JSON: { uploadId }
 * 合并所有分片 → 完整文件 → 写入 DB
 */
async function completeUpload(ctx) {
  if (!ctx.state?.user?.id) { ctx.status = 401; ctx.body = { message: '请先登录' }; return; }

  const { uploadId } = ctx.request.body || {};
  if (!uploadId) { ctx.status = 400; ctx.body = { message: '缺少 uploadId' }; return; }

  const session = readSession(uploadId);
  if (!session) { ctx.status = 404; ctx.body = { message: '上传会话不存在或已过期' }; return; }

  const { uploadedChunks, totalChunks } = session;
  if (uploadedChunks.length !== totalChunks) {
    const missing = [];
    for (let i = 0; i < totalChunks; i++) if (!uploadedChunks.includes(i)) missing.push(i);
    ctx.status = 400;
    ctx.body = { message: `分片不完整，缺少: ${missing.join(', ')}`, missingChunks: missing };
    return;
  }

  // 合并分片 — 逐片 append，不依赖流背压
  const ext = path.extname(session.originalName) || '.mp4';
  const filename = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
  const destPath = path.join(VIDEOS_DIR, filename);

  try {
    for (let i = 0; i < totalChunks; i++) {
      const cp = chunkFile(uploadId, i);
      if (!fs.existsSync(cp)) {
        throw new Error(`分片 chunk_${i} 缺失，请重新上传`);
      }
      fs.appendFileSync(destPath, fs.readFileSync(cp));
    }
  } catch (mergeErr) {
    // 清理可能半成品的合并文件
    try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch (e) { /* */ }
    console.error(`[Chunk] 合并失败: ${mergeErr.message}`);
    ctx.status = 500;
    ctx.body = { message: `合并失败: ${mergeErr.message}` };
    return;
  }

  // 清理分片目录
  try { fs.rmSync(sessionPath(uploadId), { recursive: true, force: true }); } catch (e) { /* */ }

  // 写 DB
  const title = path.basename(session.originalName, ext).substring(0, 100) || '未命名视频';
  const video = await createVideo({
    userId: session.userId, title, originalName: session.originalName,
    filename, fileSize: session.fileSize, mimeType: session.mimeType
  });

  console.log(`[Chunk] 合并完成: id=${video.id}, title="${title}", size=${Math.round(session.fileSize / 1024)}KB`);
  ctx.body = {
    message: '上传完成',
    video: { id: video.id, title, originalName: session.originalName, fileSize: session.fileSize, mimeType: session.mimeType }
  };
}

/**
 * DELETE /api/videos/upload/:uploadId
 * 中止/清理上传会话
 */
async function abortUpload(ctx) {
  if (!ctx.state?.user?.id) { ctx.status = 401; ctx.body = { message: '请先登录' }; return; }

  const { uploadId } = ctx.params;
  const session = readSession(uploadId);
  if (!session) { ctx.status = 404; ctx.body = { message: '上传会话不存在' }; return; }
  if (session.userId !== ctx.state.user.id) { ctx.status = 403; ctx.body = { message: '无权操作' }; return; }

  fs.rmSync(sessionPath(uploadId), { recursive: true, force: true });
  console.log(`[Chunk] 中止: uploadId=${uploadId}`);
  ctx.body = { message: '上传已取消' };
}

// ---- 原有功能（不变） ----

async function list(ctx) {
  const page = Math.max(1, parseInt(ctx.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(ctx.query.pageSize) || 20));
  ctx.body = await listVideos({ page, pageSize });
}

async function detail(ctx) {
  const id = parseInt(ctx.params.id);
  if (!id) { ctx.status = 400; ctx.body = { message: '无效的视频ID' }; return; }
  const video = await findVideoById(id);
  if (!video) { ctx.status = 404; ctx.body = { message: '视频不存在' }; return; }
  ctx.body = {
    video: { id: video.id, title: video.title, originalName: video.original_name,
      fileSize: video.file_size, mimeType: video.mime_type, duration: video.duration,
      uploaderName: video.uploader_name, createdAt: video.created_at }
  };
}

async function play(ctx) {
  const id = parseInt(ctx.params.id);
  if (!id) { ctx.status = 400; ctx.body = { message: '无效的视频ID' }; return; }
  const video = await findVideoById(id);
  if (!video) { ctx.status = 404; ctx.body = { message: '视频不存在' }; return; }

  const filePath = path.join(VIDEOS_DIR, video.filename);
  if (!fs.existsSync(filePath)) { ctx.status = 404; ctx.body = { message: '视频文件不存在' }; return; }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = ctx.request.headers.range;
  ctx.set('Content-Type', video.mime_type);
  ctx.set('Accept-Ranges', 'bytes');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    ctx.status = 206;
    ctx.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    ctx.set('Content-Length', String(end - start + 1));
    ctx.body = fs.createReadStream(filePath, { start, end });
  } else {
    ctx.set('Content-Length', String(fileSize));
    ctx.body = fs.createReadStream(filePath);
  }
}

async function remove(ctx) {
  if (!ctx.state?.user?.id) { ctx.status = 401; ctx.body = { message: '请先登录' }; return; }
  const id = parseInt(ctx.params.id);
  if (!id) { ctx.status = 400; ctx.body = { message: '无效的视频ID' }; return; }
  const video = await findVideoById(id);
  if (!video) { ctx.status = 404; ctx.body = { message: '视频不存在' }; return; }
  if (video.user_id !== ctx.state.user.id) { ctx.status = 403; ctx.body = { message: '只能删除自己上传的视频' }; return; }

  const filePath = path.join(VIDEOS_DIR, video.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await deleteVideo(id);
  console.log(`[Video] 删除: id=${id}`);
  ctx.body = { message: '删除成功' };
}

module.exports = { upload, initUpload, uploadChunk, getUploadStatus, completeUpload, abortUpload, list, detail, play, remove };
