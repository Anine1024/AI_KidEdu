# AI KidEdu — 亲子教育 AI 全栈应用

## 项目简介

AI KidEdu 是一款面向 0-12 岁儿童与家长的 AI 亲子教育应用，结合计算机视觉和自然语言处理技术，提供**拍照识物**、**拍照学单词**、**AI 智能对话**等核心功能，帮助孩子在日常生活中探索学习。

## 项目演示

| 模块 | 功能 | 技术实现 |
| ---- | ---- | -------- |
| 用户系统 | 手机号注册/登录、密码重置、QQ OAuth | JWT + bcrypt + 图形验证码 |
| AI 拍照识物 | 拍摄物品，AI 识别并返回名称、类别、说明、安全提示 | 浏览器摄像头 + Canvas + Coze Vision API |
| AI 拍照学单词 | 拍摄物品，AI 返回英语单词、音标、释义、例句 | 同上，针对英语教学场景优化的 Prompt |
| AI 智能对话 | 文字/语音交互，AI 陪伴聊天 | 当前 Mock 阶段，预留 STT/Chat API 接口 |
| 语音播报 | 识别结果和单词的语音朗读 | Web Speech API (TTS) |

## 技术栈

| 层级 | 技术 | 说明 |
| ---- | ---- | ---- |
| **前端框架** | React 18 + React Router v7 | SPA 单页应用 |
| **构建工具** | Vite 5 | HMR 热更新，代理转发 |
| **样式方案** | Less + 设计 Token 体系 | 24 色/6 圆角/4 阴影/9 间距变量 |
| **后端框架** | Koa 2.x | 洋葱模型中间件架构 |
| **数据库** | MySQL 8 + mysql2 | 连接池模式（最多 10 连接） |
| **身份认证** | JWT (jsonwebtoken) + bcryptjs (10 轮) | 7 天有效期，手机号+密码登录 |
| **验证码** | svg-captcha | SVG 图形验证码，内存存储，5 分钟过期 |
| **AI 集成** | Coze 平台 API | Vision LLM 实现图片→文本识别 |
| **语音能力** | Web Speech API + MediaRecorder | 浏览器内置 TTS 播报 + 麦克风录音 |

## 技术架构

```text
┌─────────────────────────────────────────────────────┐
│  前端 (Vite Dev Server :5173)                       │
│  ┌───────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Auth 模块 │ │ AI 模块  │ │ ImageCapture 组件 │  │
│  │ 登录/注册 │ │ 对话/识物│ │ 拍照/上传/Camera  │  │
│  └─────┬─────┘ └────┬─────┘ └────────┬─────────┘  │
│        │             │               │             │
│  ┌─────┴─────────────┴───────────────┴──────────┐  │
│  │          Vite Proxy (3 条转发规则)            │  │
│  │  /api → localhost:3001   (后端)               │  │
│  │  /coze-api → coze.site  (识物 Bot)           │  │
│  │  /coze-words-api → coze.site (单词 Bot)      │  │
│  └──────────────────────┬────────────────────────┘  │
└─────────────────────────┼───────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────┐
│  后端 (Koa :3001)                                   │
│  ┌─────────────────────────────────────────────┐    │
│  │  Koa 中间件栈                                │    │
│  │  bodyParser → Router(/api) → AuthRouter      │    │
│  └──────────────┬──────────────────────────────┘    │
│  ┌──────────────┴──────────────────────────────┐    │
│  │  Controller → Model → MySQL 连接池           │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

## 核心代码设计

### 后端 — Koa 洋葱模型

```js
// 中间件顺序保证请求正确解析和路由分发
app
  .use(bodyParser())            // 1. 解析 JSON body
  .use(router.routes())         // 2. /api 主路由
  .use(router.allowedMethods()) // 3. 405 自动响应
  .use(authRoutes.routes())     // 4. /api/auth 认证路由
  .use(authRoutes.allowedMethods());
```

### 数据库 — 连接池 + 参数化查询

```js
// src/config/db.js — 单例连接池，统一管理
const pool = mysql.createPool({
  host, port, user, password, database,
  waitForConnections: true,
  connectionLimit: 10,     // 最大并发连接
  queueLimit: 0            // 无限排队
});

// src/models/userModel.js — 所有查询使用 ? 占位符防注入
const [rows] = await db.execute(
  'SELECT * FROM users WHERE phone = ? LIMIT 1',
  [phone]
);
```

### 前端 — 认证守卫设计

```jsx
// App.jsx — ProtectedRoute 组件
// 不额外请求后端验证 Token，靠客户端过期时间 + localStorage
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('auth_token');
  const expiresAt = Number(localStorage.getItem('auth_expires_at'));
  if (token && expiresAt > Date.now()) return children;
  navigate('/login');
};
```

### 设计系统 — Less Token 变量

```less
// styles/variables.less
@primary: #5BBA8A;        // 薄荷绿主色
@secondary: #F5C842;      // 暖黄辅色
@text-primary: #2C3E50;   // 深蓝灰正文
@font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
```

## 快速启动

```bash
# 1. 配置后端环境变量
cd backend
# 编辑 .env 中的 DB_PASSWORD 等配置

# 2. 初始化数据库
npm run init-db

# 3. 启动后端
npm run dev            # → http://localhost:3001

# 4. 启动前端
cd ../frontend
npm run dev            # → http://localhost:5173
```

测试账号：`13800000000` / `123456`

---

## 面试准备指南

## 项目亮点

1. **全栈独立完成**：React + Koa + MySQL，从前端界面到后端 API 到数据库设计一手包办
2. **AI 能力集成**：对接了 Coze 平台的 Vision LLM，实现图片→结构化文本的 AI 识别
3. **设计系统**：定义了完整的设计 Token 体系（24 色 + 6 圆角 + 4 阴影 + 9 间距），保持 UI 一致性
4. **安全实践**：bcrypt 密码哈希、JWT 认证、参数化 SQL 查询、图形验证码防刷
5. **组件化设计**：`ImageCaptureAndProcess` 通用组件通过 React 组合模式复用于两个 AI 场景

---

## 常见面试问题与回答

### Q1: 为什么选用 Koa 而不是 Express？

**答**：Koa 的洋葱模型中间件比 Express 的线性模型更灵活，`async/await` 原生支持让异步流程更清晰。Koa 不内置任何中间件（连路由都要自己装），更轻量，按需引入即可。劣势是生态不如 Express 丰富，但对于本项目规模完全足够。

### Q2: JWT 认证的完整流程是怎样的？Token 过期怎么处理？

**答**：用户登录时，后端用 `jsonwebtoken` 签发 Token（payload 含 `{id, phone}`，有效期 7 天）。前端存 `localStorage`，并设置 24 小时的客户端过期时间。每次进入受保护路由时，`ProtectedRoute` 组件检查 Token 是否存在且未过期。Token 过期后清除 localStorage 并重定向登录页。当前实现是纯客户端校验，后续可以加入后端 JWT 中间件做二次验证，以及 Redis 黑名单实现主动注销。

### Q3: 如何防止暴力破解登录？

**答**：当前使用了图形验证码（svg-captcha），每次请求需要先获取验证码，验证码一次性使用、5 分钟过期。这个方案轻量无需 Redis，但也有局限——验证码存内存无法跨进程。生产环境应加：IP 级别速率限制（如 koa-ratelimit）、登录失败次数锁定、Redis 替代内存 Map 存验证码。

### Q4: 这个项目你是怎么对接 AI 能力的？

**答**：我使用了 Coze 平台来封装 AI 能力。Coze 是字节跳动的 AI Bot 搭建平台，可以配置 Vision LLM（如 GPT-4o 或 Claude）处理图片输入，通过 Prompt 工程定义输出格式。前端拍照后将图片转 base64，通过 Vite 代理转发到 Coze API，避免了跨域问题。这种架构的好处是 AI 逻辑与前端代码解耦——修改 Prompt 或切换模型不需要改前端代码。

### Q5: AI 的 API Token 直接放在前端安全吗？

**答**：这是当前的一个已知风险点。通过 Vite 的 `import.meta.env` 注入的变量会被编译进 JS bundle，在浏览器端可见。生产环境应该将 API Key 放在后端，前端请求走后端转发，后端再携带 Key 调用 AI 服务。这是我会在后续优化的改进点。

### Q6: 数据库连接的并发处理是怎么做的？

**答**：使用了 `mysql2/promise` 的连接池模式，配置了 `connectionLimit: 10`（最大 10 个并发连接）、`waitForConnections: true`（连接池满时等待而非报错）、`queueLimit: 0`（无限排队）。这样即使短时间高并发，请求会进入等待队列而不会直接失败。

### Q7: 为什么前端没有使用 Redux/Zustand 等状态管理？

**答**：项目当前的状态相对简单——认证状态存 localStorage（跨页面持久化），页面内状态各自管理。没有跨组件频繁共享的复杂状态，引入状态管理库反而增加复杂度。如果后续 AI 对话功能需要多组件共享消息流或用户偏好设置，可以考虑引入 Zustand（轻量、无 boilerplate）。

### Q8: 这个项目的组件复用是怎么设计的？

**答**：核心复用组件是 `ImageCaptureAndProcess`。它通过 React 的组合模式（Composition），接收 `onRecognition`（识别函数）、`resultComponent`（结果展示组件）、`theme`（主题配色）等 props。拍照识物和拍照学单词两个场景通过传入不同的回调函数和主题色，实现了"拍照→AI识别→结果展示"流程的复用，避免了重复代码。

### Q9: 怎么处理前端跨域问题的？

**答**：开发环境利用了 Vite 的 proxy 功能，`/api` 转发到 `localhost:3001`（后端），`/coze-api` 转发到 Coze 服务器。这样浏览器始终认为请求发给同源的 `localhost:5173`，不触发跨域限制。生产环境则需要 Nginx 反向代理或后端配置 CORS。

### Q10: bcrypt 的 work factor 为什么选 10？

**答**：10 是一个平衡安全性和性能的常用值——在普通服务器上单次哈希约 50-100ms，用户登录时不会感到明显延迟，同时对离线暴力破解有足够的抵御能力。如果对安全性要求更高可以调到 12，但每次登录验证会慢 4 倍左右。

### Q11: 数据库只有一张 users 表，如果要扩展你会怎么设计？

**答**：当前业务需求只需要用户表。扩展方向：

- **学习记录表**(`learning_records`)：记录孩子识物/学单词历史，关联 user_id
- **对话历史表**(`chat_sessions` / `chat_messages`)：持久化 AI 对话
- **孩子档案表**(`children`)：一个家长账户可管理多个孩子，每个孩子有年龄、学习偏好
- 涉及索引优化：`user_id` 加索引，`created_at` 加索引用于按时间查询

### Q12: 说说你在这个项目中遇到的技术难点和解决方案

**参考回答**：

- **Less 样式编译与 BEM 命名冲突**：Less 的 `&-suffix` 会把父选择器整体拼接，但 JSX 使用的是独立 BEM 类名。通过将所有 BEM 块级选择器改为平级定义，避免了选择器拼接错误。
- **AI 接口响应格式不确定**：Coze API 返回的 JSON 结构依赖 Bot 配置的 Prompt，如果 Prompt 调整了输出格式，前端解析会出错。解决方案是在前端加了安全的 fallback（`data.name || '未知物品'`），并在调用层做 try/catch 兜底。
- **验证码状态管理**：使用了内存 Map + 定时器清理过期条目，避免了引入 Redis 的复杂度，适合单机部署。

### Q13: 如果让你重写这个项目，你会做什么改进？

**答**：

1. **后端 API Key 代理** — Coze Token 放在后端，前端不暴露
2. **TypeScript** — 全栈加类型，减少运行时错误
3. **全局状态管理** — 引入 Zustand 管理用户态和 AI 对话流
4. **后端 JWT 中间件** — 真正保护需要登录的 API 路由
5. **日志系统** — 使用 pino/winston 替代 console.log
6. **单元测试** — Jest/Vitest 覆盖核心逻辑
7. **Docker 部署** — 一键启动 MySQL + 后端 + 前端
8. **图片压缩** — 上传前压缩，减少 API 调用延迟
