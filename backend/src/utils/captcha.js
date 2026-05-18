// 图形验证码工具
const svgCaptcha = require('svg-captcha');

// 验证码存储（生产环境应使用 Redis）
const captchaStore = new Map();

// 验证码有效期 5 分钟
const CAPTCHA_EXPIRE_TIME = 5 * 60 * 1000;

// 生成图形验证码
function generateCaptcha() {
  const captcha = svgCaptcha.create({
    size: 4, // 验证码长度
    ignoreChars: '0o1il', // 排除容易混淆的字符
    noise: 2, // 干扰线条数
    color: true, // 彩色
    background: '#f0f0f0' // 背景色
  });

  // 生成唯一 ID
  const captchaId = `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 存储验证码（转小写，不区分大小写）
  const expireAt = Date.now() + CAPTCHA_EXPIRE_TIME;
  captchaStore.set(captchaId, {
    text: captcha.text.toLowerCase(),
    expireAt
  });

  // 清理过期验证码
  setTimeout(() => {
    const stored = captchaStore.get(captchaId);
    if (stored && stored.expireAt < Date.now()) {
      captchaStore.delete(captchaId);
    }
  }, CAPTCHA_EXPIRE_TIME);

  return {
    id: captchaId,
    svg: captcha.data
  };
}

// 验证图形验证码
function verifyCaptcha(captchaId, userInput) {
  if (!captchaId || !userInput) {
    return { valid: false, message: '验证码不能为空' };
  }

  const stored = captchaStore.get(captchaId);
  if (!stored) {
    return { valid: false, message: '验证码不存在或已过期' };
  }

  if (stored.expireAt < Date.now()) {
    captchaStore.delete(captchaId);
    return { valid: false, message: '验证码已过期' };
  }

  // 不区分大小写比较
  if (stored.text !== userInput.toLowerCase().trim()) {
    return { valid: false, message: '验证码错误' };
  }

  // 验证成功后删除验证码（一次性使用）
  captchaStore.delete(captchaId);
  return { valid: true };
}

// 删除验证码
function deleteCaptcha(captchaId) {
  captchaStore.delete(captchaId);
}

module.exports = {
  generateCaptcha,
  verifyCaptcha,
  deleteCaptcha
};

