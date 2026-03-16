"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bot, ArrowRight, User as UserIcon, Lock, Loader2 } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const login = useUserStore((state) => state.login);
  const hasHydrated = useUserStore((state) => state._hasHydrated);

  // 如果已经登录，直接跳回首页
  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace("/");
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setError("请输入用户名和密码");
      return;
    }

    if (!isLogin) {
      if (trimmedUsername.length < 3) {
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

        // 成功登录，存入状态管理器
        login(data.user);
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

        // 成功注册，当作登录成功处理，存入状态管理器
        login(data.user);
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
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background">
      {/* 炫彩背景修饰 */}
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-blue-500/20 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-cyan-500/20 blur-[100px]" />

      {/* 登录卡片 */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="transform overflow-hidden rounded-3xl border border-border/50 bg-card/60 p-8 shadow-2xl backdrop-blur-xl transition-all">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isLogin ? "欢迎回来" : "创建账号"}
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              JS 小智 - 你的专属 JavaScript 学习智能助手
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="pl-1 text-xs font-medium text-foreground/80">用户名</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-xl border border-border/50 bg-background/50 py-3 pl-10 pr-3 text-sm leading-5 placeholder-muted-foreground transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="请输入用户名"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="pl-1 text-xs font-medium text-foreground/80">密码</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-border/50 bg-background/50 py-3 pl-10 pr-3 text-sm leading-5 placeholder-muted-foreground transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="请输入密码"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500 animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-xl border border-transparent bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? "登录" : "注册并使用"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-muted-foreground">{isLogin ? "还没有账号？" : "已有账号？"}</span>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              disabled={isLoading}
              className="ml-1 font-medium text-blue-500 outline-none transition-colors hover:text-blue-400 focus:underline"
            >
              {isLogin ? "立即注册" : "返回登录"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
