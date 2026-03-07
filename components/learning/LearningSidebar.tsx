"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, CheckCircle2, Circle, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";

export function LearningSidebar() {
  const isOpen = useUIStore(state => state.isSidebarOpen);
  const setSidebarOpen = useUIStore(state => state.setSidebarOpen);
  const stageTitle = useUIStore(state => state.currentStage);

  return (
    <aside 
      className={cn(
        "flex-shrink-0 flex flex-col border-border bg-muted/10 hidden md:flex transition-[width,opacity] duration-300 ease-in-out overflow-hidden relative",
        isOpen ? "w-64 opacity-100 border-r" : "w-0 opacity-0 border-r-0"
      )}
    >
      <div className="w-64 h-full flex flex-col absolute inset-0">
        <div className="h-14 px-4 flex items-center justify-between border-b border-border font-bold text-primary flex-shrink-0">
          <div className="flex items-center gap-2 truncate pr-8">
            <BookOpen className="w-5 h-5 shrink-0" />
            <span className="truncate">{stageTitle}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(false)}
            className="flex items-center justify-center w-9 h-9 rounded-md bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 absolute right-2.5"
            title="收起侧边栏"
          >
            <PanelLeftClose className="w-5 h-5" />
          </Button>
        </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">阶段 1: 基础语法</h4>
            <ul className="space-y-1">
              <li className="flex items-center gap-2 text-sm text-foreground p-2 rounded-md bg-primary/10 font-medium cursor-pointer transition-colors shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                变量与数据类型
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded-md hover:bg-muted cursor-pointer transition-colors">
                <Circle className="w-4 h-4" />
                运算符与流程控制
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded-md hover:bg-muted cursor-pointer transition-colors">
                <Circle className="w-4 h-4" />
                函数定义
              </li>
            </ul>
          </div>
          
          <div className="space-y-2 group">
            <h4 className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors px-1 pt-2">阶段 2: 对象与数组</h4>
            <ul className="space-y-1">
              <li className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded-md hover:bg-muted cursor-pointer transition-colors">
                <Circle className="w-4 h-4" />
                对象操作
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded-md hover:bg-muted cursor-pointer transition-colors">
                <Circle className="w-4 h-4" />
                数组方法
              </li>
            </ul>
          </div>
        </div>
      </ScrollArea>
      </div>
    </aside>
  );
}
