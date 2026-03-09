import { Terminal, Database, Code2, Layout, Zap, Globe, Cpu } from "lucide-react";
import React from "react";

export interface StageNode {
  id: string;
  order: number;
  title: string;
  icon?: React.ReactNode;
  coreKnowledge: string[];
  learningObjective: string;
}

export const STAGES: StageNode[] = [
  {
    id: "stage_1", order: 1, title: "基础语法", icon: React.createElement(Terminal, { className: "w-5 h-5" }),
    coreKnowledge: ["变量声明", "数据类型", "运算符", "流程控制", "函数定义"],
    learningObjective: "能编写简单脚本，解决基本逻辑问题"
  },
  {
    id: "stage_2", order: 2, title: "对象、数组与内置对象", icon: React.createElement(Database, { className: "w-5 h-5" }),
    coreKnowledge: ["对象字面量", "属性操作", "数组方法", "JSON", "Math/Date", "基本包装类型"],
    learningObjective: "掌握数据集合处理，熟练使用内置对象"
  },
  {
    id: "stage_3", order: 3, title: "函数进阶与作用域", icon: React.createElement(Code2, { className: "w-5 h-5" }),
    coreKnowledge: ["作用域链", "闭包", "IIFE", "箭头函数", "this指向", "call/apply/bind"],
    learningObjective: "理解核心概念，能分析this与闭包相关代码"
  },
  {
    id: "stage_4", order: 4, title: "DOM 与 BOM 操作", icon: React.createElement(Layout, { className: "w-5 h-5" }),
    coreKnowledge: ["DOM树", "元素查询/修改", "样式/属性", "事件监听/委托", "定时器", "location/history"],
    learningObjective: "实现动态交互，制作简单网页特效"
  },
  {
    id: "stage_5", order: 5, title: "异步编程", icon: React.createElement(Zap, { className: "w-5 h-5" }),
    coreKnowledge: ["同步/异步", "回调", "Promise", "async/await", "错误处理", "Fetch API"],
    learningObjective: "处理异步数据请求，编写健壮的非阻塞代码"
  },
  {
    id: "stage_6", order: 6, title: "模块化与工程化基础", icon: React.createElement(Globe, { className: "w-5 h-5" }),
    coreKnowledge: ["ES6模块", "npm/yarn", "Webpack基础", "Babel", "ESLint"],
    learningObjective: "了解现代前端开发流程，配置简单项目"
  },
  {
    id: "stage_7", order: 7, title: "高级特性与性能优化", icon: React.createElement(Cpu, { className: "w-5 h-5" }),
    coreKnowledge: ["原型链/继承", "class原理", "迭代器/生成器", "Proxy/Reflect", "事件循环", "性能优化"],
    learningObjective: "深入理解JS引擎，编写高性能代码"
  }
];
