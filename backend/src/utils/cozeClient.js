const axios = require('axios');

// 每个工作流有独立的部署地址和令牌
const CONFIG = {
  object: {
    url: process.env.COZE_URL_OBJECT || '',
    token: process.env.COZE_TOKEN_OBJECT || ''
  },
  word: {
    url: process.env.COZE_URL_WORD || '',
    token: process.env.COZE_TOKEN_WORD || ''
  }
};

/**
 * 调用 Coze 部署的工作流
 * 图片以 base64 Data URL 形式直接传入 url 字段
 */
async function runWorkflow(type, image) {
  const cfg = CONFIG[type];
  if (!cfg) {
    throw new Error(`未知的识别类型: ${type}`);
  }
  if (!cfg.url) {
    throw new Error(`Coze 工作流部署地址未配置 (type=${type})，请在 backend/.env 中设置 COZE_URL_${type.toUpperCase()}`);
  }
  if (!cfg.token) {
    throw new Error(`Coze 令牌未配置 (type=${type})，请在 backend/.env 中设置 COZE_TOKEN_${type.toUpperCase()}`);
  }

  console.log(`[Coze:${type}] 发送请求, image=${Math.round(image.length / 1024)}KB`);

  let res;
  try {
    res = await axios.post(
      cfg.url,
      {
        image: {
          url: image,
          file_type: 'image'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${cfg.token}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );
  } catch (networkErr) {
    // axios 级别的错误（网络不通、超时等）
    console.error(`[Coze:${type}] 网络错误:`, networkErr.message);
    if (networkErr.response) {
      console.error(`[Coze:${type}] 响应体:`, JSON.stringify(networkErr.response.data).substring(0, 500));
    }
    throw new Error(`Coze 请求失败: ${networkErr.message}`);
  }

  console.log(`[Coze:${type}] HTTP ${res.status}, body=${JSON.stringify(res.data).substring(0, 500)}`);

  // Coze 部署站点有时 HTTP 200 但 body 里包含错误
  if (res.data && res.data.code !== undefined && res.data.code !== 0) {
    throw new Error(`Coze 工作流错误 [${res.data.code}]: ${res.data.msg || res.data.message || '未知'}`);
  }

  // HTTP 非 2xx
  if (res.status < 200 || res.status >= 300) {
    const msg = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    throw new Error(`Coze 返回 HTTP ${res.status}: ${msg.substring(0, 200)}`);
  }

  // 尝试提取结果
  let output;
  const rawData = res.data?.data ?? res.data?.output ?? res.data;

  if (typeof rawData === 'object' && rawData !== null) {
    output = rawData;
  } else if (typeof rawData === 'string') {
    const cleaned = rawData.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    try {
      output = JSON.parse(cleaned);
    } catch {
      output = { raw: cleaned };
    }
  } else {
    output = { raw: String(rawData) };
  }

  console.log(`[Coze:${type}] 成功, 结果:`, JSON.stringify(output));
  return output;
}

module.exports = { runWorkflow };
