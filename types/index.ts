// ============================================================
// 全局 TypeScript 类型定义
// ============================================================

/**
 * 消息角色枚举
 * - user: 用户消息
 * - assistant: AI 助手消息
 * - system: 系统消息（不显示在界面上）
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * 聊天消息类型（与 Vercel AI SDK 兼容）
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt?: Date;
}

/**
 * 学习等级枚举
 */
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * JavaScript 知识点分类
 */
export type JSKnowledgeCategory =
  | 'variables'       // 变量与作用域
  | 'functions'       // 函数
  | 'async'           // 异步编程
  | 'prototypes'      // 原型与继承
  | 'dom'             // DOM 操作
  | 'es6+'            // ES6+ 新特性
  | 'algorithms'      // 算法与数据结构
  | 'patterns'        // 设计模式
  | 'testing'         // 测试
  | 'performance';    // 性能优化

/**
 * API 响应基础类型
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 聊天 API 请求体
 */
export interface ChatRequest {
  messages: ChatMessage[];
  sessionId?: string;
}
