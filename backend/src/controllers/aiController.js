const { runWorkflow } = require('../utils/cozeClient');

/**
 * AI 图片识别（通过 Coze 工作流）
 * 支持两种识别类型：
 *   - object: 拍照识物 → 返回物品名、类别、描述、安全提示、拼音
 *   - word:   拍照学单词 → 返回英语单词、音标、释义、例句
 */
async function recognize(ctx) {
  const { image, type } = ctx.request.body || {};

  if (!image) {
    ctx.status = 400;
    ctx.body = { message: '请提供图片' };
    return;
  }

  // 校验 type 参数
  const validTypes = ['object', 'word'];
  const recognizeType = validTypes.includes(type) ? type : 'object';

  console.log(`[AI] 新请求 type=${recognizeType}, image长度=${image.length}`);

  try {
    const result = await runWorkflow(recognizeType, image);
    ctx.body = { success: true, data: result };
  } catch (err) {
    console.error('[AI] 识别失败:', err.message);
    ctx.status = 500;
    ctx.body = { message: 'AI 识别失败', error: err.message };
  }
}

module.exports = { recognize };
