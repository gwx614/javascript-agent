"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, BookText, PenTool, PanelLeftOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUIStore } from "@/store/useUIStore";

export function LearningContent() {
  const isSidebarOpen = useUIStore(state => state.isSidebarOpen);
  const setSidebarOpen = useUIStore(state => state.setSidebarOpen);

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-background relative">
      <div className="h-14 px-4 flex items-center justify-center flex-shrink-0 border-b border-border bg-card/40 backdrop-blur-sm z-10 sticky top-0">
        {/* 在左侧绝对定位放置展开按钮 (仅在侧边栏收起时显示) */}
        {!isSidebarOpen && (
          <div className="absolute left-4 animate-in fade-in zoom-in duration-300">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-md bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
              title="展开侧边栏"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </Button>
          </div>
        )}
        
        <div className="px-12 text-center truncate">
          <h1 className="text-base md:text-lg font-bold tracking-tight truncate">变量与数据类型</h1>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-10 pb-20">
          
          {/* Section 1: 课前摸底 */}
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out" style={{ animationFillMode: "both" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">课前摸底</h2>
            </div>
            <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <p className="text-sm font-medium leading-relaxed mb-6 text-foreground/80">
                  这是你开始本章学习前的测验。通过这个简单的摸底，AI 助教能够了解你对基础概念的掌握情况，并据此为你推荐更适合的学习内容。
                </p>
                <div className="bg-card p-5 rounded-xl border border-border/50 mb-6 transition-all hover:border-primary/40 hover:shadow-md cursor-pointer group">
                  <p className="font-bold text-sm mb-4 leading-relaxed group-hover:text-primary transition-colors">问题：在 JavaScript 中，以下哪种方式不能用来声明变量？</p>
                  <ul className="space-y-3 text-sm text-foreground/80">
                    <li className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted hover:border-border transition-colors"><div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" /> A. var</li>
                    <li className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted hover:border-border transition-colors"><div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" /> B. let</li>
                    <li className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted hover:border-border transition-colors"><div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" /> C. def</li>
                    <li className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted hover:border-border transition-colors"><div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" /> D. const</li>
                  </ul>
                </div>
                <Button className="w-full sm:w-auto font-bold shadow-md hover:scale-105 transition-transform">提交摸底答案</Button>
              </CardContent>
            </Card>
          </section>

          {/* Section 2: 学习教程 */}
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 ease-out" style={{ animationFillMode: "both" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                <BookText className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">学习教程</h2>
            </div>
            <Card className="shadow-sm border-blue-500/20 overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-blue-500/40 to-cyan-500/40" />
              <CardContent className="p-6 sm:p-8 prose prose-slate dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50 max-w-none text-sm">
                <h3>什么是变量？</h3>
                <p>在 JavaScript 中，变量是用来存储数据的容器。你可以把变量想象成一个贴着标签的盒子，里面可以装不同类型的物品（数据）。</p>
                <pre><code>{`// ES6 推荐使用 let 和 const 声明变量
let message = "Hello, World!";
const PI = 3.14159;

// 早期的 JavaScript 使用 var
var oldVariable = true;`}</code></pre>
                
                <h3>基本数据类型</h3>
                <ul>
                  <li><strong>String</strong>: 字符串文本，例如 <code>"Hello"</code></li>
                  <li><strong>Number</strong>: 数字，例如 <code>42</code> 或 <code>3.14</code></li>
                  <li><strong>Boolean</strong>: 布尔值，即 <code>true</code> 或 <code>false</code></li>
                  <li><strong>Undefined</strong>: 未定义的值，变量声明了但没有初始化时为其值</li>
                  <li><strong>Null</strong>: 表示空值或"不存在"的对象</li>
                </ul>
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg mt-6 text-foreground/80">
                  <strong className="text-primary block mb-1">💡 AI 小提示：</strong>
                  <p className="m-0">现代 JavaScript 开发中，默认推荐使用 <code>const</code>。只有当你确定变量的值在此后会被修改时，才使用 <code>let</code>。尽量避免使用 <code>var</code>。</p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 3: 测验表单 */}
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 ease-out" style={{ animationFillMode: "both" }}>
            <div className="flex items-center gap-2 mb-4">
               <div className="p-1.5 rounded-md bg-orange-500/10 text-orange-500">
                <PenTool className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">随堂测验</h2>
            </div>
            <Card className="border-orange-500/20 shadow-sm bg-gradient-to-tr from-transparent to-orange-500/5">
              <CardContent className="p-6">
                 <p className="text-sm font-medium text-foreground/80 mb-6">完成以上学习后，请完成以下练习代码填空。遇到困难可以随时在右侧询问 AI 助手！</p>
                 <div className="space-y-5">
                    <div className="p-5 border border-border/60 rounded-xl bg-card shadow-sm group hover:border-primary/30 transition-colors">
                      <p className="font-bold text-sm mb-4 text-foreground/90">1. 声明一个名为 <code className="text-orange-500 bg-orange-500/10 px-1 py-0.5 rounded">userName</code> 的常量，并赋值为你的名字字符串。</p>
                      <textarea className="w-full h-20 p-4 rounded-lg bg-muted/60 border-none text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" placeholder="// 在此处书写代码..." />
                    </div>
                    
                    <Button className="w-full sm:w-auto font-bold shadow-md hover:scale-105 transition-transform bg-orange-500 hover:bg-orange-600 text-white">提交测验代码</Button>
                 </div>
              </CardContent>
            </Card>
          </section>

        </div>
      </ScrollArea>
    </main>
  );
}
