const axios = require('axios');

const QWEN_KEY = process.env.QWEN_API_KEY;
const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen-vl-plus';

const PROMPTS = {
  object:
    '识别图片中的物品，严格只返回纯JSON（不要markdown包裹）：' +
    '{"name":"物品名","category":"类别","description":"儿童友好描述","safetyTips":"安全提示","pronunciation":"汉语拼音"}',
  word:
    '识别图片中最主要的物品，返回对应英语单词，严格只返回纯JSON（不要markdown包裹）：' +
    '{"word":"英语单词","pronunciation":"音标","definition":"中文释义","example1":"例句1","example2":"例句2"}',
};

async function recognize(ctx) {
  const { image, type } = ctx.request.body || {};
  if (!image) { ctx.status = 400; ctx.body = { message: '请提供图片' }; return; }

  console.log(`===== 新请求 type=${type}, base64长度=${image.length} =====`);

  try {
    const res = await axios.post(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        model: QWEN_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: image } },
              { type: 'text', text: PROMPTS[type] || PROMPTS.object },
            ],
          },
        ],
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${QWEN_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    const raw = res.data.choices?.[0]?.message?.content || '';
    console.log('Qwen 原始回复:', raw.substring(0, 200));

    // 清理可能包裹的 markdown
    const json = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const result = JSON.parse(json);
    console.log('解析结果:', JSON.stringify(result));

    ctx.body = { success: true, data: result };
  } catch (err) {
    console.error('[ERR]', err.message);
    ctx.status = 500;
    ctx.body = { message: 'AI 识别失败', error: err.message };
  }
}

module.exports = { recognize };
