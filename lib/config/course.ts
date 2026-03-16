import { Terminal, Database, Code2, Layout, Zap, Globe, Cpu } from "lucide-react";
import React from "react";

export interface StageNode {
  id: string;
  order: number;
  title: string;
  icon?: React.ReactNode;
  coreKnowledge: string[];
}

export const STAGES: StageNode[] = [
  {
    id: "stage_1",
    order: 1,
    title: "基础语法与核心基石",
    icon: React.createElement(Terminal, { className: "w-5 h-5" }),
    // 聚焦最纯粹的基础，不掺杂任何复杂结构
    coreKnowledge: ["变量与常量", "数据类型与转换", "运算符", "流程控制(if/for)", "函数基础声明"],
  },
  {
    id: "stage_2",
    order: 2,
    title: "数据结构与内置对象",
    icon: React.createElement(Database, { className: "w-5 h-5" }),
    // 囊括现代日常开发中最常用的数据操作
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
    // 跨越新手的第一个分水岭，全都是面试必考、日常易错点
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
    // 吸收了方案2的精髓：单独攻克原型链，为理解后续DOM甚至框架源码打基础
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
    // 结合了 DOM 操作与实际交互，加入防抖节流（承接上文闭包）与本地存储
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
    // 将 Event Loop 作为核心基盘，串联所有异步知识
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
    // 收尾阶段：对接现代前端工程体系，引入Vue3核心(Proxy)和React强相关的模块化思想
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
