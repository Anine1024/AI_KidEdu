const jwt = require('jsonwebtoken');
const { findUserByPhone } = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

/**
 * JWT 认证中间件
 * 从 Authorization header 解析 token，将用户信息挂载到 ctx.state.user
 * 不强制要求登录——如果没 token，ctx.state.user 为 null
 */
async function authMiddleware(ctx, next) {
  const authHeader = ctx.request.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  ctx.state.user = null;

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await findUserByPhone(payload.phone);
      if (user) {
        ctx.state.user = { id: user.id, phone: user.phone, nickname: user.nickname };
      }
    } catch (err) {
      // token 无效或过期，不阻塞请求，user 保持 null
    }
  }

  await next();
}

module.exports = authMiddleware;
