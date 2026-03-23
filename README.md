# JavaScript 智能学习 Agent 🤖

这是一个基于 Next.js 14 + Vercel AI SDK + LangChain.js 构建的交互式 JavaScript 学习助手。它的主要目标是作为一名“金牌导师”，根据用户的实际水平和目标，通过启发式对话帮助用户掌握JavaScript技术。

---

## 🛠 技术栈

- **前端框架**: Next.js 14 (App Router)
- **开发语言**: TypeScript (严格模式)
- **UI 界面**: Tailwind CSS + shadcn/ui
- **AI 能力**: Vercel AI SDK + LangChain.js (Agent 架构)
- **数据存储**: Supabase (PostgreSQL + pgvector) + Prisma ORM

---

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

在项目根目录新建 `.env.local` 文件，并根据你的实际情况填写以下配置（由于本项目可能无 `.env.example`，请直接参考以下内容）：

```env
# 1. 数据库配置
# 本项目使用轻量级的本地 SQLite，无需安装 MySQL/PostgreSQL
DATABASE_URL="file:./dev.db"
PRISMA_CLIENT_ENGINE_TYPE="library"

# 2. AI 模型密钥 (至少提供以下任意一种)
DASHSCOPE_API_KEY="你的_通义千问_API_KEY"
# OPENAI_API_KEY="你的_OPENAI_API_KEY"
# ANTIGRAVITY_API_KEY="你的_ANTIGRAVITY_API_KEY"

# 3. 搜索工具 API 密钥 (用于 AI 联网搜索功能)
# 如果使用内置的 web-search 工具，需前往 tavily.com 免费申请
TAVILY_API_KEY="你的_TAVILY_API_KEY"
```

### 3. 系统初始化 (包含数据库与 RAG)

**关于 RAG (检索增强生成) 的特别说明：**
为了降低学习和开发门槛，本项目的 RAG 机制**没有**引入复杂的 PostgreSQL + pgvector 或外部商业向量数据库，而是完全基于**本地 SQLite (`better-sqlite3`) + 纯 JavaScript** 实现的（通过计算向量余弦相似度）。所有的向量数据会保存在项目 `data/vector-store.db` 文件中，你**不需要**做任何额外的环境配置或拉取 Docker 镜像。

你只需要初始化基础的关系型数据库（生成 Prisma Client 并建表）：

```bash
pnpm db:generate
pnpm db:push
```

_(上述命令会在项目根目录生成 `dev.db` 基础数据库)_

### 4. 启动开发服务器

```bash
pnpm dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可预览。

---

## 🧭 架构与工作流（通俗易懂版）

当用户在界面上发送一条消息时，系统是这样处理的：

1. **界面接发 (Frontend)**：`app/page.tsx` 和 `components/chat/` 内的组件将用户的输入发送给后端。
2. **请求处理 (Chat API)**：`app/api/chat/route.ts` 接收到消息，并从数据库查出该用户的学习偏好、进度等画像数据。
3. **构建 AI 大脑 (Agent)**：系统将“用户画像信息”与“预设的导师提示词”拼接，交给 LangChain Agent 处理。
4. **工具调用 (Tool Calling)**：如果 AI 觉得需要查资料或查数据库，它会自动去 `lib/tools/` 下找对应的工具（如网页搜索、数据库查询），拿到结果后再思考。
5. **流式返回 (Streaming)**：最后，AI 将组织好的“大白话”导师回复，采用打字机效果（Stream）一点点返回给前端界面显示。

---

## 🔧 我该如何修改代码？（二次开发指南）

如果你接手了这个项目想要进行修改，请对号入座：

### 1. 🎭 我想修改 AI 的“人设”或提示词 (Prompt)

- **去哪里改**：主要在 `app/api/chat/route.ts` 文件（约 60-110 行附近）以及 `lib/services/ai/prompts` 目录下。
- **怎么改**：你可以修改 `chatPersona`（导师风格）、`safetyDirectives`（禁止说哪类话）等字符串变量。如果想调整系统级的基础设定，也可以查看导入的 `JS_LEARNING_SYSTEM_PROMPT`。

### 2. 🧰 我想给 AI 添加新能力（新增 Tool 工具）

- **去哪里改**：`lib/tools/` 目录。
- **怎么改**：参考现有的 `web-search.tool.ts`（网页搜索工具），新建一个你的工具库文件，定义好输入参数和执行逻辑，并把它注册到系统给 Agent 使用。在此目录下，AI 能够通过工具查库、联网等。

### 3. 💾 我想修改数据库结构（增删表或字段）

- **去哪里改**：`prisma/schema.prisma`。
- **怎么改**：
  1. 打开该文件，使用 Prisma 语法添加或修改你的 `model`（比如给 User 加个 `avatar` 字段）。
  2. 改完后，在终端运行：`pnpm db:push` 将变动推送到你的真实数据库，再运行 `pnpm db:generate` 更新 TypeScript 类型提示。

### 4. 🎨 我想修改页面长相或 UI 样式

- **去哪里改**：`app/` (页面路由) 和 `components/` (组件库)。
- **怎么改**：
  - 聊天主界面布局在 `app/page.tsx`。
  - 具体聊天框、输入框等细节在 `components/chat/` 里面。
  - 通用的基础 UI（如按钮、弹窗）在 `components/ui/`，本项目使用了 Tailwind CSS，你可以直接修改 `className` 来调整颜色和间距。

### 5. ⚙️ 我想看项目的核心工具库或帮助函数

- **去哪里改**：`lib/utils.ts` (前端与通用的工具) 或 `lib/core/` (核心逻辑如 DB 初始化等)。

---

## 📁 目录结构速览

```txt
├── app/
│   ├── api/chat/route.ts    # 【主要逻辑】接收聊天请求，组装提示词，调用大模型
│   └── page.tsx             # 网站首页/聊天室主界面
├── components/
│   ├── chat/                # 聊天气泡、输入框等业务组件
│   └── ui/                  # 按钮、下拉框等通用 UI 组件 (shadcn)
├── lib/
│   ├── prisma.ts            # 【弃用/转到core】老版数据库客户端定义
│   ├── core/                # 核心底层类，如新的 getPrisma() 获取数据库等
│   ├── services/            # 系统服务，如 AI 接口封装 (ai.service.ts)、Prompt 定义
│   ├── tools/               # 【重要】AI 可以使用的所有工具（如查网页、查数据库）
│   └── utils.ts             # 日常工具小函数
├── types/
│   └── index.ts             # 全局 TypeScript 接口和类型定义
└── prisma/
    └── schema.prisma        # 【核心配置】数据库建表语句汇总
```
