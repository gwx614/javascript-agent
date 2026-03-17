import { DynamicTool } from "@langchain/core/tools";
import { getPrisma } from "@/lib/core/db";
import { unwrapToolInput } from "@/lib/core/utils";

/**
 * 创建数据库查询工具
 * 允许 AI 根据自然语言查询本项目 SQLite 数据库
 *
 * @param userIdentifier - 当前用户的唯一 ID (CUID)
 */
/**
 * 创建数据库查询工具
 *
 * 【重要变更】: 现在的工具输入直接由主模型生成 SQL 语句，而非自然语言。
 * 这样做避免了工具内部再次发起 API 请求，从而将查询延迟降低了 50% 以上。
 *
 * @param userIdentifier - 当前用户的唯一 ID (CUID)
 */
export async function createDatabaseQueryTool(userIdentifier: string) {
  const schemaContext = `
  1. users: id (主键), username, skill_level, name (没有 user_id 字段)
  2. course_stages: id, user_id (关联 users.id), course_id, status
  3. section_contents: id, stage_id (通过 stage_id 关联)
  * 核心隔离原则:
    - 查自己资料 (users 表): 必须使用 WHERE id = '${userIdentifier}'
    - 查进度/消息/会话 (其他表): 必须使用 WHERE user_id = '${userIdentifier}'
  `.trim();

  return new DynamicTool({
    name: "query_database",
    description: `直接执行针对 SQLite 数据库的 SELECT 查询。
      输入必须是单条合法的 SQL 语句。
      注意：users 表过滤用 id = '${userIdentifier}'，其他表过滤用 user_id = '${userIdentifier}'。
      可用表概览：${schemaContext}`,
    func: async (input: any) => {
      try {
        // 解开模型可能包装的 JSON 结构 (处理 {"input": "..."} 等)
        const rawSql = unwrapToolInput(input);

        // 清理 Markdown 标记
        const cleanSql = rawSql.replace(/```sql|```/g, "").trim();

        // 内部审计记录
        console.log(`[DatabaseQuery Tool] Executing: ${cleanSql}`);

        const results = await executeSecureSqlQuery(cleanSql, userIdentifier);

        // 格式化结果返回给 LLM
        return formatQueryResultForAgent(results);
      } catch (error) {
        console.error("[DatabaseQuery] 失败:", error);
        return `查询失败: ${error instanceof Error ? error.message : "未知错误"}`;
      }
    },
  });
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

/**
 * 格式化查询结果
 */
function formatQueryResultForAgent(results: any[]): string {
  if (!results || results.length === 0) return "数据库中未找到符合记录。";

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
