import { Question } from "@/types";

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
      "能够理解并编写简单的脚本和页面交互",
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

// Helper to generate the default empty state for the form
export const generateDefaultFormData = (): Record<string | number, any> => {
  const defaults: Record<string | number, any> = {};
  formQuestions.forEach((q) => {
    if (q.type === "select") {
      defaults[q.id] = q.options ? q.options[0] : ""; // Default to first option or empty string
    } else if (q.type === "checkbox") {
      defaults[q.id] = []; // Default empty array for multiple selection
    } else if (q.type === "textarea") {
      defaults[q.id] = ""; // Default empty string for text input
    }
  });
  return defaults;
};

export const defaultFormData = generateDefaultFormData();
