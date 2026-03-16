/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用 React 严格模式，帮助发现潜在问题
  reactStrictMode: true,
  // 确保 Prisma 客户端和 better-sqlite3 作为外部包加载，避免引擎或原生绑定加载错误
  serverExternalPackages: ["@prisma/client", "prisma", "better-sqlite3"],
};

export default nextConfig;
