const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { findUserByPhone, createUser, updatePassword } = require('../models/userModel');
const { generateCaptcha, verifyCaptcha } = require('../utils/captcha');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const QQ_APP_ID = process.env.QQ_APP_ID;
const QQ_APP_KEY = process.env.QQ_APP_KEY;
const QQ_REDIRECT_URI =
  process.env.QQ_REDIRECT_URI || 'http://localhost:3001/api/auth/qq/callback';

async function register(ctx) {
  const { phone, password, nickname, captchaId, captchaCode } = ctx.request.body || {};

  if (!phone || !password) {
    ctx.status = 400;
    ctx.body = { message: '手机号和密码不能为空' };
    return;
  }

  // 验证图形验证码
  if (!captchaId || !captchaCode) {
    ctx.status = 400;
    ctx.body = { message: '请完成图形验证码验证' };
    return;
  }

  const captchaResult = verifyCaptcha(captchaId, captchaCode);
  if (!captchaResult.valid) {
    ctx.status = 400;
    ctx.body = { message: captchaResult.message };
    return;
  }

  const existed = await findUserByPhone(phone);
  if (existed) {
    ctx.status = 400;
    ctx.body = { message: '该手机号已注册' };
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser({ phone, passwordHash });

  ctx.body = {
    message: '注册成功',
    user: {
      id: user.id,
      phone: user.phone
    }
  };
}

async function login(ctx) {
  const { phone, password } = ctx.request.body || {};

  if (!phone || !password) {
    ctx.status = 400;
    ctx.body = { message: '手机号和密码不能为空' };
    return;
  }

  const user = await findUserByPhone(phone);
  if (!user) {
    ctx.status = 400;
    ctx.body = { message: '用户不存在' };
    return;
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    ctx.status = 400;
    ctx.body = { message: '密码错误' };
    return;
  }

  const token = jwt.sign(
    { id: user.id, phone: user.phone },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  ctx.body = {
    message: '登录成功',
    token,
    user: {
      id: user.id,
      phone: user.phone
    }
  };
}

// 占位：微信/QQ 登录，需要你在微信开放平台、QQ 互联申请应用并配置回调
async function wechatLogin(ctx) {
  ctx.body = {
    message: '微信登录占位接口，请在后端对接微信 OAuth 流程后实现',
    tip: '通常是重定向到微信授权页，回调中换取 openid/unionid 并与本地用户绑定'
  };
}

async function qqLogin(ctx) {
  if (!QQ_APP_ID || !QQ_APP_KEY) {
    ctx.status = 500;
    ctx.body = {
      message: '后端未配置 QQ_APP_ID / QQ_APP_KEY 环境变量',
      tip: '请在 backend/.env 中配置 QQ_APP_ID、QQ_APP_KEY、QQ_REDIRECT_URI'
    };
    return;
  }

  const state = `qq_${Date.now()}`; // 简单示例，生产环境建议带上 CSRF 校验

  const authorizeUrl = 'https://graph.qq.com/oauth2.0/authorize'
    + `?response_type=code`
    + `&client_id=${encodeURIComponent(QQ_APP_ID)}`
    + `&redirect_uri=${encodeURIComponent(QQ_REDIRECT_URI)}`
    + `&state=${encodeURIComponent(state)}`
    + `&scope=${encodeURIComponent('get_user_info')}`;

  ctx.redirect(authorizeUrl);
}

// QQ 回调：通过 code 换取 access_token 和 openid，这里先不落库，只签发一个示例 token
async function qqCallback(ctx) {
  const { code, state } = ctx.query;

  if (!code) {
    ctx.status = 400;
    ctx.body = { message: '缺少 code 参数' };
    return;
  }

  if (!QQ_APP_ID || !QQ_APP_KEY) {
    ctx.status = 500;
    ctx.body = {
      message: '后端未配置 QQ_APP_ID / QQ_APP_KEY 环境变量'
    };
    return;
  }

  try {
    // 1. code 换 access_token
    const tokenRes = await axios.get('https://graph.qq.com/oauth2.0/token', {
      params: {
        grant_type: 'authorization_code',
        client_id: QQ_APP_ID,
        client_secret: QQ_APP_KEY,
        code,
        redirect_uri: QQ_REDIRECT_URI
      },
      responseType: 'text'
    });

    let tokenStr = tokenRes.data;

    // QQ 错误时会返回 callback( {"error":100015,...} );
    if (tokenStr.startsWith('callback')) {
      const jsonText = tokenStr.substring(
        tokenStr.indexOf('(') + 1,
        tokenStr.lastIndexOf(')')
      );
      const errObj = JSON.parse(jsonText);
      throw new Error(`QQ token error: ${errObj.error_description || 'unknown error'}`);
    }

    const tokenParams = new URLSearchParams(tokenStr);
    const accessToken = tokenParams.get('access_token');

    if (!accessToken) {
      throw new Error('未获取到 access_token');
    }

    // 2. 通过 access_token 获取 openid
    const meRes = await axios.get('https://graph.qq.com/oauth2.0/me', {
      params: { access_token: accessToken },
      responseType: 'text'
    });

    const meStr = meRes.data;
    const jsonText = meStr.substring(
      meStr.indexOf('(') + 1,
      meStr.lastIndexOf(')')
    );
    const meObj = JSON.parse(jsonText);
    const openid = meObj.openid;

    if (!openid) {
      throw new Error('未获取到 QQ openid');
    }

    // 这里暂时不与本地 users 表做绑定，只演示签发一个 JWT
    const token = jwt.sign(
      { provider: 'qq', openid },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    ctx.body = {
      message: 'QQ 登录成功（示例，尚未与本地用户表绑定）',
      token,
      qq: {
        openid,
        client_id: meObj.client_id
      }
    };
  } catch (err) {
    ctx.status = 500;
    ctx.body = {
      message: 'QQ 登录回调处理失败',
      error: err.message
    };
  }
}

// 生成图形验证码
async function getCaptcha(ctx) {
  try {
    const captcha = generateCaptcha();
    ctx.body = {
      captchaId: captcha.id,
      captchaSvg: captcha.svg
    };
  } catch (err) {
    console.error('生成验证码失败:', err);
    ctx.status = 500;
    ctx.body = {
      message: '生成验证码失败',
      error: err.message
    };
  }
}

// 重置密码
async function resetPassword(ctx) {
  const { phone, captchaId, captchaCode, newPassword } = ctx.request.body || {};

  if (!phone || !newPassword) {
    ctx.status = 400;
    ctx.body = { message: '手机号和新密码不能为空' };
    return;
  }

  // 验证图形验证码
  if (!captchaId || !captchaCode) {
    ctx.status = 400;
    ctx.body = { message: '请完成图形验证码验证' };
    return;
  }

  const captchaResult = verifyCaptcha(captchaId, captchaCode);
  if (!captchaResult.valid) {
    ctx.status = 400;
    ctx.body = { message: captchaResult.message };
    return;
  }

  // 检查用户是否存在
  const user = await findUserByPhone(phone);
  if (!user) {
    ctx.status = 400;
    ctx.body = { message: '用户不存在' };
    return;
  }

  // 更新密码
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await updatePassword(phone, passwordHash);

  if (!updated) {
    ctx.status = 500;
    ctx.body = { message: '密码更新失败' };
    return;
  }

  ctx.body = {
    message: '密码重置成功'
  };
}

module.exports = {
  register,
  login,
  wechatLogin,
  qqLogin,
  qqCallback,
  getCaptcha,
  resetPassword
};


