import { DynamicTool } from "@langchain/core/tools";
import { getPrisma } from "@/lib/core/db";

/**
 * 创建数据库查询工具
 * 允许 AI 根据自然语言查询本项目 SQLite 数据库
 *
 * @param userIdentifier - 当前用户的唯一 ID (CUID)
 */
export async function createDatabaseQueryTool(userIdentifier: string) {
  return new DynamicTool({
    name: "query_database",
    description:
      "用于查询系统内的用户资料、学习进度、课程内容、对话历史等。建议在用户询问有关'我'、'我的进度'、'什么状态'、'历史记录'等问题时使用。" +
      "工具内置了对当前用户的数据隔离保护。",
    func: async (input: string | Record<string, any>) => {
      try {
        let queryDescription = typeof input === "string" ? input : JSON.stringify(input);

        // 智能提取查询核心描述
        if (queryDescription.startsWith("{")) {
          try {
            const parsed = JSON.parse(queryDescription);
            queryDescription = parsed.query || parsed.input || parsed.search || queryDescription;
          } catch (e) {
            // Keep original if parse fails
          }
        }

        console.log(`[DatabaseQuery] 任务: ${queryDescription} (用户: ${userIdentifier})`);

        // 1. 生成 SQL (注入专家级 Schema 知识)
        const sqlQuery = await generateAgenticSqlQuery(queryDescription, userIdentifier);

        // 2. 安全执行
        const results = await executeSecureSqlQuery(sqlQuery, userIdentifier);

        // 3. 智能格式化返回给 LLM
        return formatQueryResultForAgent(results);
      } catch (error) {
        console.error("[DatabaseQuery] 失败:", error);
        return `查询失败: ${error instanceof Error ? error.message : "未知错误"}`;
      }
    },
  });
}

/**
 * 专家级 SQL 生成器
 */
async function generateAgenticSqlQuery(
  description: string,
  userIdentifier: string
): Promise<string> {
  const { ChatOpenAI } = await import("@langchain/openai");
  const { SystemMessage, HumanMessage } = await import("@langchain/core/messages");
  const { getAIApiKey, DEFAULT_MODEL } = await import("@/lib/core/config");

  const model = new ChatOpenAI({
    modelName: DEFAULT_MODEL,
    apiKey: getAIApiKey(),
    configuration: { baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1/" },
    temperature: 0, // 追求极致确定性
  });

  const schemaContext = `
# 核心表结构预览 (SQLite)
1. users: id (CUID), username, name, role_position, skill_level
2. course_stages: id (CUID), user_id, course_id (格式: 'stage_1'...'stage_7'), status (STUDYING/COMPLETED/etc)
3. section_contents: id, stage_id, section_id (数字字符串), content (Markdown)
4. chat_sessions: id, user_id, title
5. chat_messages: id, session_id, role, content

# 查询导航指南
- **用户隔离**: 必须包含 \`WHERE user_id = '${userIdentifier}'\` (在 course_stages/chat_sessions 中) 或 \`WHERE id = '${userIdentifier}'\` (在 users 中)。
- **课程匹配**: \`course_id\` 必须形如 'stage_2'，严禁使用纯数字。
- **内容检索**: 查询章节内容请使用 \`course_stages\` LEFT JOIN \`section_contents\`，这样即使内容未生成也能返回状态。
- **时间线**: 默认使用 \`ORDER BY updated_at DESC\` 或 \`created_at DESC\` 以获取最新信息。
`;

  const prompt = `
你是一个资深数据库专家。请将用户的描述转换为**最精准且安全**的 SQLite 查询。

${schemaContext}

# 生成规范
1. 仅输出纯 SQL，严禁 Markdown 标签或解释。
2. 限制结果集: 所有查询必须带有 \`LIMIT 10\`，除非是聚合查询。
3. 严格数据隔离: 仅针对 ID 为 '${userIdentifier}' 的记录。

# 场景示例
Q: "我阶段 3 进度" -> SELECT status, updated_at FROM course_stages WHERE user_id = '${userIdentifier}' AND course_id = 'stage_3' LIMIT 1;
Q: "我的详细资料" -> SELECT * FROM users WHERE id = '${userIdentifier}' LIMIT 1;
Q: "最近聊了什么" -> SELECT m.content FROM chat_messages m JOIN chat_sessions s ON m.session_id = s.id WHERE s.user_id = '${userIdentifier}' ORDER BY m.created_at DESC LIMIT 5;

用户需求: "${description}"
SQL: `;

  const response = await model.invoke([
    new SystemMessage("你只负责生成 SQL 语句，不废话。"),
    new HumanMessage(prompt),
  ]);

  return (
    response.content
      ?.toString()
      .replace(/```sql|```/g, "")
      .trim() || ""
  );
}

/**
 * 安全 SQL 执行器
 */
async function executeSecureSqlQuery(sql: string, userIdentifier: string): Promise<any[]> {
  const prisma = getPrisma();
  const lowerSql = sql.toLowerCase();

  if (!lowerSql.startsWith("select"))
    throw new Error("Security Alert: Only SELECT queries are permitted.");

  if (userIdentifier === "anonymous") return [];

  // 防止 SQL 注入的基本关键词检查
  const forbidden = ["drop", "delete", "update", "insert", "truncate"];
  if (forbidden.some((kw) => new RegExp(`\\b${kw}\\b`, "i").test(lowerSql))) {
    throw new Error("Security Alert: Dangerous keywords detected.");
  }

  console.log(`[ExecuteSQL] Running: ${sql}`);
  return await prisma.$queryRawUnsafe<any[]>(sql);
}

/**
 * 格式化查询结果
 */
function formatQueryResultForAgent(results: any[]): string {
  if (!results || results.length === 0)
    return "数据库中未找到符合记录。请告知用户可能尚未开始相关学习。";

  return results
    .map((row, i) => {
      const data = Object.entries(row)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ");
      return `[Record ${i + 1}] ${data}`;
    })
    .join("\n");
}
