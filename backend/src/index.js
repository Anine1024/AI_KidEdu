const Koa = require('koa');
const Router = require('koa-router');
const { default: koaBody } = require('koa-body');
const koaStatic = require('koa-static');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const videoRoutes = require('./routes/videoRoutes');
const authMiddleware = require('./middleware/auth');

const app = new Koa();
const router = new Router({ prefix: '/api' });

// ========== 生产环境：托管前端静态文件 ==========
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(koaStatic(distPath, { maxage: 86400000 }));

  // SPA fallback：非 API 请求都返回 index.html
  app.use(async (ctx, next) => {
    if (!ctx.path.startsWith('/api')) {
      ctx.type = 'html';
      const fs = require('fs');
      ctx.body = fs.createReadStream(path.join(distPath, 'index.html'));
      return;
    }
    await next();
  });
}

// ========== 全局错误处理（必须在最外层） ==========
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error('[GlobalError]', err.message, err.stack?.split('\n')[1]);
    ctx.status = err.status || 500;
    ctx.body = { message: err.message || '服务器内部错误' };
    // 如果有临时文件残留，尝试清理
    if (ctx.request.files) {
      const files = ctx.request.files;
      Object.values(files).flat().forEach(f => {
        try { require('fs').unlinkSync(f.filepath); } catch (e) { /* */ }
      });
    }
  }
});

// ========== API 路由 ==========
router.get('/health', async (ctx) => {
  ctx.body = { status: 'ok', message: 'Koa backend is running' };
});

// koa-body 错误事件：formidable 解析失败时不崩进程
const uploadDir = path.join(__dirname, '..', 'uploads', 'videos');

app
  .use(authMiddleware)
  .use(koaBody({
    multipart: true,
    formidable: {
      uploadDir,
      keepExtensions: true,
      maxFileSize: 500 * 1024 * 1024
    },
    onError(err, ctx) {
      console.error('[KoaBody] 请求体解析失败:', err.message);
      ctx.status = 400;
      ctx.body = { message: `请求解析失败: ${err.message}` };
      // 不 throw，避免进程崩溃
    }
  }))
  .use(router.routes())
  .use(router.allowedMethods())
  .use(authRoutes.routes())
  .use(authRoutes.allowedMethods())
  .use(aiRoutes.routes())
  .use(aiRoutes.allowedMethods())
  .use(videoRoutes.routes())
  .use(videoRoutes.allowedMethods());

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Environment:', isProduction ? 'production' : 'development');
});
