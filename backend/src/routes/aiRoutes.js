const Router = require('koa-router');
const { recognize } = require('../controllers/aiController');

const router = new Router({ prefix: '/api/ai' });

router.post('/recognize', recognize);

module.exports = router;
