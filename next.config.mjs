/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用 React 严格模式，帮助发现潜在问题
  reactStrictMode: true,
  // 确保 Prisma 客户端作为外部包加载，避免引擎加载 500 错误
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
