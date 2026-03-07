"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Terminal, Database, Code2, Layout, Zap, Globe, Cpu } from "lucide-react";

interface StageNode {
  id: string;
  order: number;
  title: string;
  icon: React.ReactNode;
  coreKnowledge: string[];
  learningObjective: string;
}

const STAGES: StageNode[] = [
  {
    id: "stage_1", order: 1, title: "基础语法", icon: <Terminal className="w-5 h-5" />,
    coreKnowledge: ["变量声明", "数据类型", "运算符", "流程控制", "函数定义"],
    learningObjective: "能编写简单脚本，解决基本逻辑问题"
  },
  {
    id: "stage_2", order: 2, title: "对象、数组与内置对象", icon: <Database className="w-5 h-5" />,
    coreKnowledge: ["对象字面量", "属性操作", "数组方法", "JSON", "Math/Date", "基本包装类型"],
    learningObjective: "掌握数据集合处理，熟练使用内置对象"
  },
  {
    id: "stage_3", order: 3, title: "函数进阶与作用域", icon: <Code2 className="w-5 h-5" />,
    coreKnowledge: ["作用域链", "闭包", "IIFE", "箭头函数", "this指向", "call/apply/bind"],
    learningObjective: "理解核心概念，能分析this与闭包相关代码"
  },
  {
    id: "stage_4", order: 4, title: "DOM 与 BOM 操作", icon: <Layout className="w-5 h-5" />,
    coreKnowledge: ["DOM树", "元素查询/修改", "样式/属性", "事件监听/委托", "定时器", "location/history"],
    learningObjective: "实现动态交互，制作简单网页特效"
  },
  {
    id: "stage_5", order: 5, title: "异步编程", icon: <Zap className="w-5 h-5" />,
    coreKnowledge: ["同步/异步", "回调", "Promise", "async/await", "错误处理", "Fetch API"],
    learningObjective: "处理异步数据请求，编写健壮的非阻塞代码"
  },
  {
    id: "stage_6", order: 6, title: "模块化与工程化基础", icon: <Globe className="w-5 h-5" />,
    coreKnowledge: ["ES6模块", "npm/yarn", "Webpack基础", "Babel", "ESLint"],
    learningObjective: "了解现代前端开发流程，配置简单项目"
  },
  {
    id: "stage_7", order: 7, title: "高级特性与性能优化", icon: <Cpu className="w-5 h-5" />,
    coreKnowledge: ["原型链/继承", "class原理", "迭代器/生成器", "Proxy/Reflect", "事件循环", "性能优化"],
    learningObjective: "深入理解JS引擎，编写高性能代码"
  }
];

export function CourseSelection({ onStart }: { onStart: (stageId: string) => void }) {
  return (
    <div className="flex flex-col h-[90vh] max-h-[850px] bg-background/50 animate-in slide-in-from-right duration-500 overflow-hidden">
      <div className="text-center mb-6 mt-6">
        <h2 className="text-2xl font-black tracking-tight mb-2">学习路线图</h2>
        <p className="text-sm text-muted-foreground px-4">请选择你想开始学习的阶段。</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-2 pb-10">
        <div className="relative border-l-2 border-primary/20 ml-[23px] pb-6 mt-4">
          {STAGES.map((stage) => {
            return (
              <div key={stage.id} className="relative pl-10 mb-8 transition-all hover:scale-[1.01] group">
                {/* 节点图标 */}
                <div className="absolute -left-[25px] top-6 w-12 h-12 bg-background text-foreground rounded-full flex items-center justify-center border-[3px] border-primary/30 shadow-sm group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <span className="font-bold text-lg">{stage.order}</span>
                </div>

                {/* 卡片内容 */}
                <Card className="overflow-hidden transition-all duration-300 cursor-pointer border-border/40 hover:border-primary/40 hover:shadow-md"
                  onClick={() => onStart(stage.id)}
                >
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg shrink-0 bg-primary/10 text-primary">
                          {stage.icon}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold">阶段 {stage.order}: {stage.title}</h3>
                      </div>
                      
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3 font-medium">
                        🎯 目标: {stage.learningObjective}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {stage.coreKnowledge.map((k, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium border bg-background/50 border-border/50 text-muted-foreground">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="shrink-0 flex justify-end">
                      <Button onClick={(e) => { e.stopPropagation(); onStart(stage.id); }} className="font-bold rounded-lg px-6 h-10 w-full sm:w-auto text-sm shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
                        开始学习
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
