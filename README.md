# JavaScript 智能学习 Agent

一个基于 Next.js 14 + Vercel AI SDK + LangChain.js 构建的 JavaScript 学习助手。

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript (严格模式)
- **样式**: Tailwind CSS + shadcn/ui
- **AI**: Vercel AI SDK + LangChain.js
- **数据库**: Supabase (PostgreSQL + pgvector) + Prisma

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local` 并填写所有必要的密钥：

```bash
cp .env.example .env.local
```

### 3. 初始化数据库

```bash
pnpm db:generate
pnpm db:push
```

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 目录结构

```
├── app/
│   ├── api/chat/route.ts    # 流式对话 API
│   └── page.tsx             # 主聊天页面
├── components/
│   ├── chat/                # 聊天相关组件
│   └── ui/                  # shadcn/ui 组件
├── lib/
│   ├── prisma.ts            # 数据库客户端
│   ├── ai.ts                # AI 客户端封装
│   └── utils.ts             # 工具函数
├── types/
│   └── index.ts             # 全局类型定义
└── prisma/
    └── schema.prisma        # 数据库模型
```
