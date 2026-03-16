import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

/**
 * Prisma Client 单例模式实现
 * 确保在 Next.js 开发环境下不会因为热重载 (HMR) 导致创建过多的数据库连接
 */

const prismaClientSingleton = () => {
  const dbUrl = process.env.DATABASE_URL;
  console.log("[Prisma] DATABASE_URL:", dbUrl);

  if (!dbUrl) {
    throw new Error("DATABASE_URL 环境变量未设置！请检查 .env 文件");
  }

  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  return new PrismaClient({ adapter });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const getPrisma = () => {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prismaClientSingleton();
  }
  return globalForPrisma.prisma;
};

// 同时也导出默认实例，方便直接使用
export const prisma = getPrisma();
export default prisma;
