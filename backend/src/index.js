const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const koaStatic = require('koa-static');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');

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

// ========== API 路由 ==========
router.get('/health', async (ctx) => {
  ctx.body = { status: 'ok', message: 'Koa backend is running' };
});

app
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods())
  .use(authRoutes.routes())
  .use(authRoutes.allowedMethods())
  .use(aiRoutes.routes())
  .use(aiRoutes.allowedMethods());

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Environment:', isProduction ? 'production' : 'development');
});
