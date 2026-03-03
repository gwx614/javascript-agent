import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JS 小智 - JavaScript 智能学习助手",
  description:
    "基于 AI 的 JavaScript 学习 Agent，帮助你从零掌握 JavaScript 核心概念，提升编程技能。",
  keywords: ["JavaScript", "学习", "AI", "编程", "前端"],
  authors: [{ name: "JS 小智" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      {/* 使用系统字体栈，避免访问 Google Fonts CDN */}
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
