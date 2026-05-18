const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');

const app = new Koa();
const router = new Router({
  prefix: '/api'
});

router.get('/health', async (ctx) => {
  ctx.body = {
    status: 'ok',
    message: 'Koa backend is running'
  };
});

app
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods())
  .use(authRoutes.routes())
  .use(authRoutes.allowedMethods());

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Koa server is running at http://localhost:${PORT}`);
});



