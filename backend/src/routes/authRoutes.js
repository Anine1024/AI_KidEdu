const Router = require('koa-router');
const {
  register,
  login,
  me,
  wechatLogin,
  qqLogin,
  qqCallback,
  getCaptcha,
  resetPassword
} = require('../controllers/authController');

const router = new Router({
  prefix: '/api/auth'
});

router.post('/register', register);
router.post('/login', login);
router.get('/me', me);
router.get('/wechat', wechatLogin);
router.get('/qq', qqLogin);
router.get('/qq/callback', qqCallback);
router.get('/captcha', getCaptcha);
router.post('/forgot-password/reset', resetPassword);

module.exports = router;


