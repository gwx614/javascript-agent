/**
 * 核心工具函数：智能解包工具输入
 *
 * 背景：部分 LLM 或 LangGraph 框架在调用工具时，会自动将参数包装在 {"input": "..."} 或 {"query": "..."} 中，
 * 甚至会出现多层递归 JSON 字符串嵌套。
 *
 * 本函数通过循环解析，确保底层工具拿到的是最核心的纯净数据（通常是自然语言查询字符串或结构化对象）。
 */
export function unwrapToolInput(input: any): any {
  if (input === null || input === undefined) return "";

  let current = input;

  // 1. 如果输入是对象，提取核心字段
  if (typeof current === "object" && !Array.isArray(current)) {
    current =
      current.input ||
      current.query ||
      current.search ||
      current.description ||
      JSON.stringify(current);
  }

  // 2. 循环解开 JSON 字符串嵌套 (限制最大深度 5 层以防死循环)
  let depth = 0;
  while (
    depth < 5 &&
    typeof current === "string" &&
    (current.startsWith("{") || current.startsWith("["))
  ) {
    try {
      const parsed = JSON.parse(current);
      // 如果解析成功且确实有核心内容字段，或者解析后是一个基础类型/数组
      if (parsed && typeof parsed === "object") {
        const next = parsed.input || parsed.query || parsed.search || parsed.description;
        if (next !== undefined && next !== current) {
          current = next;
        } else {
          // 如果没有特定的核心字段，则可能是工具需要的结构化 JSON 对象本身，此时停止解包
          current = parsed;
          break;
        }
      } else {
        current = parsed;
      }
      depth++;
    } catch {
      // 解析失败说明就是普通字符串，停止解包
      break;
    }
  }

  return current;
}
