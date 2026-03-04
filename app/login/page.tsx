"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bot, ArrowRight, User as UserIcon, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 如果已经登录，直接跳回首页
  useEffect(() => {
    if (localStorage.getItem("user")) {
      router.replace("/");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setError("请输入用户名和密码");
      return;
    }

    if(!isLogin){
      if(trimmedUsername.length < 3){
        setError("用户名必须至少为3位");
        return;
      }
      if (trimmedPassword.length < 6) {
        setError("密码必须至少为6位");
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        // 请求登录 API
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword }),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          setError(data.error || "登录失败");
          setIsLoading(false);
          return;
        }

        // 成功登录，覆盖本地存储状态
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        // 请求注册 API
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword }),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          setError(data.error || "注册失败");
          setIsLoading(false);
          return;
        }

        // 成功注册，当作登录成功处理，覆盖本地存储状态
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // 跳转到首页
      router.replace("/");
    } catch (err) {
      console.error(err);
      setError("网络错误，请稍后重试");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* 炫彩背景修饰 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/20 blur-[100px] rounded-full pointer-events-none" />

      {/* 登录卡片 */}
      <div className="w-full max-w-md relative z-10 px-6">
        <div className="backdrop-blur-xl bg-card/60 border border-border/50 shadow-2xl rounded-3xl p-8 overflow-hidden transform transition-all">
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isLogin ? "欢迎回来" : "创建账号"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              JS 小智 - 你的专属 JavaScript 学习智能助手
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground/80 pl-1">用户名</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-border/50 rounded-xl leading-5 bg-background/50 placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
                  placeholder="请输入用户名"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground/80 pl-1">密码</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-border/50 rounded-xl leading-5 bg-background/50 placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
                  placeholder="请输入密码"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3 animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? "登录" : "注册并使用"}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? "还没有账号？" : "已有账号？"}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              disabled={isLoading}
              className="font-medium text-blue-500 hover:text-blue-400 ml-1 transition-colors outline-none focus:underline"
            >
              {isLogin ? "立即注册" : "返回登录"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
