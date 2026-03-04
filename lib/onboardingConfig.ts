export type QuestionType = "select" | "checkbox" | "textarea";

export interface Question {
  id: number;
  question: string;
  type: QuestionType;
  options: string[];
  placeholder?: string;
}

export const formQuestions: Question[] = [
  {
    id: 1,
    question: "请评估您当前的编程基础与 JavaScript 掌握程度：",
    type: "select",
    options: [
      "零基础初学者：无编程经验，计算机基础较弱",
      "入门级：了解 HTML/CSS，能编写简单的脚本逻辑",
      "有其他语言背景：熟练掌握 Python/Java/C++ 等，但未深入前端",
      "前端从业者/进阶：已有 JS 开发经验，旨在突破技术瓶颈（如 ES6+、底层原理）",
      "全栈转型：具备前端基础，计划深入 Node.js 后端开发"
    ],
    placeholder: ""
  },
  {
    id: 2,
    question: "除 JavaScript 外，您是否掌握其他编程语言？（这将有助于通过类比加速学习概念）",
    type: "textarea",
    options: [],
    placeholder: "例如：熟练使用 Python 进行数据分析，或拥有 Java 面向对象编程经验..."
  },
  {
    id: 3,
    question: "您学习 JavaScript 的首要核心目标是什么？",
    type: "select",
    options: [
      "求职面试：需在短期内达到通过技术面试的标准",
      "解决具体问题：当前项目有急需攻克的技术需求",
      "产品开发：计划独立开发完整的产品、游戏或工具",
      "构建知识体系：不追求短期速成，旨在系统掌握计算机科学与编程基础"
    ],
    placeholder: ""
  },
  {
    id: 4,
    question: "在 JavaScript 生态体系中，您计划重点攻克的应用领域是？（多选）",
    type: "checkbox",
    options: [
      "现代 Web 前端 (React / Vue / Angular)",
      "后端服务与 API 开发 (Node.js / Express / NestJS)",
      "全栈应用开发 (Next.js / Nuxt)",
      "跨平台应用 (Electron 桌面端 / React Native 移动端)",
      "工程化与提效工具 (Webpack / 自动化脚本)",
      "图形学与交互创意 (Three.js / Canvas / 游戏开发)"
    ],
    placeholder: ""
  },
  {
    id: 5,
    question: "您预期在学习过程中可能遇到的最大障碍或痛点是？",
    type: "select",
    options: [
      "逻辑转化：难以将业务需求转化为代码逻辑",
      "异步编程：对 Promise、Event Loop 等机制理解困难",
      "环境与配置：对 Webpack、Babel、npm 等工程化配置感到困惑",
      "生态繁杂：框架与库更新频繁，难以选择或跟进",
      "DOM 与交互：不擅长处理页面元素操作与样式适配",
      "乐于挑战：愿意接受高难度的底层原理与算法训练"
    ],
    placeholder: ""
  },
  {
    id: 6,
    question: "您倾向于哪种教学与学习模式？这将决定课程内容的呈现方式。",
    type: "select",
    options: [
      "项目实战驱动：优先提供代码示例与项目任务，在实践中讲解理论",
      "底层原理优先：先系统讲解运行机制与概念，再进行代码实现",
      "案例拆解教学：通过复盘经典商业案例（如电商平台功能）进行学习",
      "高频场景速成：仅聚焦工作中最高频使用的 20% 核心技能"
    ],
    placeholder: ""
  },
  {
    id: 7,
    question: "您期望的学习强度与时间投入节奏是？",
    type: "select",
    options: [
      "循序渐进：每日 30 分钟左右，注重兴趣维持与基础夯实",
      "进阶提升：每日 1-2 小时，包含适量的算法训练与难点攻克",
      "高强度沉浸：全职或高密度投入，严格遵循高标准代码规范与最佳实践"
    ],
    placeholder: ""
  },
  {
    id: 8,
    question: "您是否有必须掌握的特定技术栈或框架要求？",
    type: "textarea",
    options: [],
    placeholder: "例如：公司技术栈主要为 React + TypeScript，或指定学习 Vue 3 Composition API..."
  },
  {
    id: 9,
    question: "您期望达到的最终技术深度或交付能力标准是？",
    type: "select",
    options: [
      "独立应用开发：能独立完成完整的 CRUD（增删改查）业务系统",
      "底层原理掌握：能阅读框架源码，理解 V8 引擎与编译原理",
      "工程架构设计：具备大型前端项目的架构设计与性能优化能力",
      "辅助工具开发：仅需编写脚本以辅助日常工作流程"
    ],
    placeholder: ""
  },
  {
    id: 10,
    question: "补充说明：关于您的背景（如数学/英语基础）或特殊需求，还有什么希望补充的信息？",
    type: "textarea",
    options: [],
    placeholder: "例如：英语阅读能力较弱，偏好中文文档；对数据可视化大屏开发有特定需求..."
  }
];

// Helper to generate the default empty state for the form
export const generateDefaultFormData = (): Record<number, any> => {
  const defaults: Record<number, any> = {};
  formQuestions.forEach((q) => {
    if (q.type === "select") {
      defaults[q.id] = q.options[0]; // Default to first option
    } else if (q.type === "checkbox") {
      defaults[q.id] = [];           // Default empty array for multiple selection
    } else if (q.type === "textarea") {
      defaults[q.id] = "";           // Default empty string for text input
    }
  });
  return defaults;
};

// Deprecated: We replace the old defaultFormData with the dynamic generator
export const defaultFormData = generateDefaultFormData();
