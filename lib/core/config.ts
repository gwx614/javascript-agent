import { Terminal, Database, Code2, Layout, Zap, Globe, Cpu } from "lucide-react";
import React from "react";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * 项目核心配置中心
 */

// --- 类型定义 ---

export interface StageNode {
  id: string;
  order: number;
  title: string;
  icon?: React.ReactNode;
  coreKnowledge: string[];
}

export interface Question {
  id: number;
  question: string;
  type: "select" | "checkbox" | "textarea";
  options?: string[];
  placeholder?: string;
}

// --- 1. 课程相关配置 ---

export const STAGES: StageNode[] = [
  {
    id: "stage_1",
    order: 1,
    title: "基础语法与核心基石",
    icon: React.createElement(Terminal, { className: "w-5 h-5" }),
    coreKnowledge: ["变量与常量", "数据类型与转换", "运算符", "流程控制(if/for)", "函数基础声明"],
  },
  {
    id: "stage_2",
    order: 2,
    title: "数据结构与内置对象",
    icon: React.createElement(Database, { className: "w-5 h-5" }),
    coreKnowledge: [
      "对象与字面量",
      "数组方法与遍历",
      "Map与Set",
      "字符串与正则",
      "Math与Date",
      "JSON处理",
    ],
  },
  {
    id: "stage_3",
    order: 3,
    title: "函数进阶与执行上下文",
    icon: React.createElement(Code2, { className: "w-5 h-5" }),
    coreKnowledge: [
      "作用域与作用域链",
      "闭包原理与应用",
      "this指向深度解析",
      "call/apply/bind",
      "箭头函数",
      "高阶函数",
    ],
  },
  {
    id: "stage_4",
    order: 4,
    title: "原型机制与面向对象",
    icon: React.createElement(Cpu, { className: "w-5 h-5" }),
    coreKnowledge: [
      "原型与prototype",
      "隐式与显式原型链",
      "构造函数",
      "继承的多种实现",
      "class语法与私有属性",
    ],
  },
  {
    id: "stage_5",
    order: 5,
    title: "宿主环境与浏览器 API",
    icon: React.createElement(Layout, { className: "w-5 h-5" }),
    coreKnowledge: [
      "DOM树与节点操作",
      "事件模型(捕获/冒泡/委托)",
      "定时器与防抖节流",
      "BOM与路由API",
      "Web Storage(本地存储)",
    ],
  },
  {
    id: "stage_6",
    order: 6,
    title: "异步编程与并发模型",
    icon: React.createElement(Zap, { className: "w-5 h-5" }),
    coreKnowledge: [
      "同步与异步概念",
      "事件循环(Event Loop)",
      "回调机制",
      "Promise核心与API",
      "async/await",
      "网络请求(Fetch)",
    ],
  },
  {
    id: "stage_7",
    order: 7,
    title: "现代特性与前端工程化",
    icon: React.createElement(Globe, { className: "w-5 h-5" }),
    coreKnowledge: [
      "ES6模块化规范",
      "迭代器与生成器",
      "Proxy与Reflect",
      "错误捕获与调试",
      "内存管理与垃圾回收",
      "构建工具(npm/Vite)概要",
    ],
  },
];

// --- 2. 问卷相关配置 ---

export const formQuestions: Question[] = [
  {
    id: 1,
    question: "请选择最符合你当前情况的技术水平：",
    type: "select",
    options: [
      "小白从零开始：无编程经验或刚开始接触",
      "有一定基础：了解基本语法，能编写简单程序",
      "基础较好：有实际开发经验，希望深入进阶",
    ],
    placeholder: "",
  },
  {
    id: 2,
    question: "您目前的职业或身份是？",
    type: "select",
    options: [
      "在校学生（计算机相关专业）",
      "在校学生（非计算机专业）",
      "前端开发工程师",
      "后端/全栈开发工程师",
      "非技术岗位在职人员",
      "自由职业/创业者",
    ],
    placeholder: "",
  },
  {
    id: 3,
    question: "您使用 JavaScript 的编程经验有多久？",
    type: "select",
    options: ["从未接触过", "少于3个月", "3个月到1年", "1年到3年", "3年以上"],
    placeholder: "",
  },
  {
    id: 4,
    question: "您学习 JavaScript 的主要目的是什么？",
    type: "select",
    options: [
      "寻找前端/全栈开发工作",
      "提升现有工作中的开发能力",
      "完成一个具体的个人项目或创业产品",
      "学习编程基础知识，为后续学习做准备",
    ],
    placeholder: "",
  },
  {
    id: 5,
    question: "您对以下哪些 JavaScript 应用领域最感兴趣？（多选）",
    type: "checkbox",
    options: [
      "Web 前端开发",
      "后端/API 开发",
      "移动端应用开发",
      "桌面应用开发",
      "游戏开发",
      "数据可视化",
      "自动化脚本与工具开发",
    ],
    placeholder: "",
  },
  {
    id: 6,
    question: "在学习过程中，您希望课程中的示例和项目更偏向于哪种实际场景？（多选）",
    type: "checkbox",
    options: [
      "电商类应用",
      "社交类应用",
      "企业级管理系统",
      "内容平台",
      "工具类应用",
      "游戏或创意交互",
      "其他",
    ],
    placeholder: "",
  },
  {
    id: 7,
    question: "您期望通过本次学习达到怎样的能力水平？",
    type: "select",
    options: [
      "能够理解并编写简单的脚本 and 页面交互",
      "能够独立开发完整的中小型 Web 应用",
      "能够深入理解语言机制，具备解决复杂问题和性能优化的能力",
      "能够参与大型项目架构设计，指导团队开发",
    ],
    placeholder: "",
  },
  {
    id: 8,
    question: "您希望 AI 导师以怎样的风格与您互动？",
    type: "select",
    options: [
      "严格高效型：直击重点，侧重考察与性能优化，像大厂技术面试官",
      "耐心引导型：循循善诱，多用类比和图示，像贴心的学长/学姐",
      "极致极客型：没有废话，只列核心重点和最佳实践",
      "幽默轻松型：用段子和吐槽化解枯燥，像技术播客主播",
    ],
    placeholder: "",
  },
  {
    id: 9,
    question: "您预计每周可以投入多少时间学习？",
    type: "select",
    options: ["少于2小时", "2-4小时", "4-8小时", "8小时以上"],
    placeholder: "",
  },
  {
    id: 10,
    question: "补充说明：关于您的背景（如数学/英语基础）或特殊需求，还有什么希望补充的信息？",
    type: "textarea",
    options: [],
    placeholder: "例如：英语阅读能力较弱，偏好中文文档；对数据可视化大屏开发有特定需求...",
  },
];

export const generateDefaultFormData = (): Record<string | number, any> => {
  const defaults: Record<string | number, any> = {};
  formQuestions.forEach((q) => {
    if (q.type === "select") {
      defaults[q.id] = q.options ? q.options[0] : "";
    } else if (q.type === "checkbox") {
      defaults[q.id] = [];
    } else if (q.type === "textarea") {
      defaults[q.id] = "";
    }
  });
  return defaults;
};

export const defaultFormData = generateDefaultFormData();

// --- 3. AI 相关配置 ---

const customFetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const targetUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

  if (init && init.body && typeof init.body === "string") {
    try {
      const body = JSON.parse(init.body);
      if ("stream_options" in body) delete body.stream_options;
      if ("input" in body && Array.isArray(body.input)) {
        body.messages = body.input;
        delete body.input;
      }
      delete body.max_output_tokens;
      if (body.messages && Array.isArray(body.messages)) {
        body.messages = body.messages.map((msg: any) => {
          if (msg.content && Array.isArray(msg.content)) {
            const textParts = msg.content
              .filter((part: any) => part.type === "text" || part.type === "input_text")
              .map((part: any) => part.text)
              .join("");
            return { ...msg, content: textParts || " " };
          }
          return msg;
        });
      }
      init.body = JSON.stringify(body);
    } catch (e) {
      /* ignore */
    }
  }
  return fetch(targetUrl, init);
};

export const openai = createOpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1/",
  fetch: customFetch,
});

export const DEFAULT_MODEL = "qwen-turbo";
export const AI_API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
export function getAIApiKey() {
  return process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY || "";
}

export const JS_LEARNING_SYSTEM_PROMPT = `你是一位专业的 JavaScript 学习导师，名叫"JS 小智"。

## 你的职责
- 帮助用户学习和理解 JavaScript 的各种概念，从基础语法到高级特性
- 提供清晰、易懂的代码示例，每个示例都有详细的中文注释
- 当用户遇到错误时，引导他们分析原因，而不是直接给出答案
- 根据用户的理解程度动态调整讲解的复杂度
- 推荐学习路径和优质学习资源

## 回答风格
- 使用友好、鼓励性的语言
- **先用通俗的语言解释概念，再给出代码示例**
- 代码示例要精简，每个示例不超过 10 行，占据文章比例不应该过多
- 对复杂概念进行类比，帮助理解
- 代码块使用 Markdown 格式（\`\`\`javascript ... \`\`\`）
- 避免过多表格和 emoji，保持回答简洁

## 专业领域
- JavaScript 基础：变量、函数、对象、数组、循环
- ES6+ 特性：箭头函数、解构、Promise、async/await、模块化
- 异步编程：回调、Promise、async/await、事件循环
- 原型链与面向对象编程
- DOM 操作与事件处理
- 性能优化与最佳实践
- 常见设计模式

当用户问你非 JavaScript 相关的问题时，礼貌地引导他们回到 JavaScript 学习主题。`;
