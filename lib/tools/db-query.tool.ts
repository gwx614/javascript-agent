import { DynamicTool } from "@langchain/core/tools";
import { getPrisma } from "@/lib/core/db";
import { unwrapToolInput } from "@/lib/services/ai/ai.service";

/**
 * 创建数据库查询工具
 * 允许 AI 根据自然语言查询本项目 SQLite 数据库
 *
 * @param userIdentifier - 当前用户的唯一 ID (CUID)
 */
/**
 * 创建数据库工具集 (SQL Toolkit 风格)
 * 包含侦查、探测和执行三个原子工具，让 AI 能够“看见”真实的数据库。
 *
 * @param userIdentifier - 当前用户的唯一 ID (CUID)
 */
export async function createDatabaseToolkit(userIdentifier: string) {
  const prisma = getPrisma();

  // 1. 列表探测工具 - 查看有哪些表
  const listTablesTool = new DynamicTool({
    name: "list_database_tables",
    description: "列出数据库中所有可用的表名。在不确定表名时首先调用此工具。",
    func: async () => {
      try {
        const sql = `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'prisma_%' AND name NOT LIKE '_prisma%';`;
        console.log(`[SQL Toolkit] Listing tables: ${sql}`);
        const tables = await prisma.$queryRawUnsafe<any[]>(sql);
        return tables.map((t) => t.name).join(", ") || "没有可用的表。";
      } catch (e) {
        return `获取表列表失败: ${e instanceof Error ? e.message : "未知错误"}`;
      }
    },
  });

  // 2. Schema 探测工具 - 查看表结构和样本数据
  const getSchemaTool = new DynamicTool({
    name: "get_database_schema",
    description:
      "获取指定表的 DDL (创建语句) 和前 3 条真实样本数据。在编写 SQL 前调用此工具以核实准确的列名和数据格式。输入应为表名。",
    func: async (tableName: string) => {
      try {
        const cleanName = tableName.trim().replace(/['"`]/g, "");
        const ddlSql = `SELECT sql FROM sqlite_master WHERE type='table' AND name='${cleanName}';`;
        console.log(`[SQL Toolkit] Getting schema for ${cleanName}: ${ddlSql}`);

        // 获取 DDL
        const ddl = await prisma.$queryRawUnsafe<any[]>(ddlSql);

        // 获取样本数据 (帮助 AI 理解字段含义)
        // 关键逻辑：自动截断样本中的大型字段，并脱敏敏感 ID (防止 AI 抄错用户 ID)
        const sampleSql = `SELECT * FROM ${cleanName} LIMIT 3;`;
        console.log(`[SQL Toolkit] Getting samples: ${sampleSql}`);
        let samples = await prisma.$queryRawUnsafe<any[]>(sampleSql);
        const sensitiveKeys = ["id", "userId", "user_id", "password", "token", "username"];

        samples = samples.map((row) => {
          const newRow: any = {};
          for (const [key, value] of Object.entries(row)) {
            // 脱敏 ID 和 username 相关字段，防止 AI 在不同用户间产生 ID 记忆漂移
            // 强制 AI 使用 user_id 进行查询，而不是 username
            if (
              sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase())) ||
              key.toLowerCase() === "username"
            ) {
              newRow[key] = "[SENSITIVE_ID_MASKED]";
              continue;
            }
            if (typeof value === "string" && value.length > 50) {
              newRow[key] = value.substring(0, 50) + "... [已截断大型数据]";
            } else {
              newRow[key] = value;
            }
          }
          return newRow;
        });

        return `
表 ${cleanName} 的结构概览：
${ddl[0]?.sql || "未找到"}

典型样本数据 (已截断 JSON/长文本):
${JSON.stringify(samples, null, 2)}

【⚠️ 开发提示】：查询用户进度时优先查询 course_stages。不要盲目与 section_contents 做 INNER JOIN，因为内容可能尚未生成导致返回空结果。
        `.trim();
      } catch (e) {
        return `获取 Schema 失败: ${e instanceof Error ? e.message : "非法表名或查询错误"}`;
      }
    },
  });

  // 3. 安全执行工具 - 执行经过验证的查询
  const executeQueryTool = new DynamicTool({
    name: "execute_database_query",
    description: "执行单条 SELECT 语句。必须在确认真实列名后再执行。输入为 SQL 字符串。",
    func: async (input: any) => {
      try {
        const sql = unwrapToolInput(input)
          .replace(/```sql|```/g, "")
          .trim();
        console.log(`[SQL Toolkit] Executing: ${sql}`);

        const results = await executeSecureSqlQuery(sql, userIdentifier);
        return formatQueryResultForAgent(results);
      } catch (error) {
        return `执行失败: ${error instanceof Error ? error.message : "未知错误"}`;
      }
    },
  });

  return [listTablesTool, getSchemaTool, executeQueryTool];
}

/**
 * 安全 SQL 执行器
 */
async function executeSecureSqlQuery(sql: string, userIdentifier: string): Promise<any[]> {
  const prisma = getPrisma();

  if (userIdentifier === "anonymous") return [];

  // 支持多条语句（防患未然）：按分号拆分，过滤空行
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const allResults: any[] = [];
  const forbidden = ["drop", "delete", "update", "insert", "truncate"];

  for (const statement of statements) {
    const lower = statement.toLowerCase();

    if (!lower.startsWith("select")) {
      throw new Error("Security Alert: Only SELECT queries are permitted.");
    }
    if (forbidden.some((kw) => new RegExp(`\\b${kw}\\b`, "i").test(lower))) {
      throw new Error("Security Alert: Dangerous keywords detected.");
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(statement);
    allResults.push(...rows);
  }

  return allResults;
}

function formatQueryResultForAgent(results: any[]): string {
  if (!results || results.length === 0)
    return "【查询无结果】数据库中未找到符合条件的记录。提示：请通过 get_database_schema 确认字段值格式，或核对 user_id 是否准确。不要猜测进度。";

  const formatted = results
    .map((row, i) => {
      const data = Object.entries(row)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ");
      return `[Record ${i + 1}] ${data}`;
    })
    .join("\n");

  // 如果结果特别巨大 (例如超过 15000 字符)，给予 AI 警告建议
  if (formatted.length > 15000) {
    return `${formatted}\n\n[SYSTEM NOTE]: 返回结果量较大 (${formatted.length} 字符)。建议通过 SELECT 具体字段或更精准的 WHERE 条件缩小范围，以防上下文截断。`;
  }

  return formatted;
}
