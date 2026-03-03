import { PrismaClient } from "@prisma/client";

/**
 * Prisma 客户端单例
 *
 * Next.js 开发模式下热重载会导致创建多个 Prisma 连接实例，
 * 通过将实例挂载到 globalThis 上来避免此问题。
 * 生产环境中每次都直接创建新实例。
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// 开发环境下将实例挂载到全局对象，防止热重载创建多个连接
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
