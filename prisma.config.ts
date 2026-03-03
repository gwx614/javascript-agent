import { defineConfig } from "prisma/config";

/**
 * Prisma 7 配置文件
 *
 * Prisma 7.x 开始，数据库连接 URL 从 schema.prisma 迁移到此文件。
 * - url: 应用运行时连接（推荐使用 Supabase Transaction Pooler，端口 6543）
 * - directUrl: Prisma 迁移专用 Direct Connection（端口 5432）
 *
 * 配置文档：https://pris.ly/d/config-datasource
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
    // 注意：Prisma 7.x 的 defineConfig 类型目前不包含 directUrl 字段。
    // 如需 directUrl（用于迁移），请直接在 schema.prisma 中设置，或等待官方类型更新。
    // 详见：https://pris.ly/d/config-datasource
  },
});
