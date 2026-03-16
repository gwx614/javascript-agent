import { indexDocuments, checkVectorDBStatus, getSQLiteVectorDB, initVectorDB } from "@/lib/rag";

export const dynamic = "force-dynamic";

/**
 * RAG 相关 API 端点
 * GET /api/rag - 获取向量数据库状态
 * POST /api/rag - 索引文档
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "list") {
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const db = await getSQLiteVectorDB();
      const result = await db.getAllPaginated(limit, offset);

      return new Response(
        JSON.stringify({
          status: "ok",
          documents: result.documents,
          total: result.total,
          hasMore: result.hasMore,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    await initVectorDB();
    const status = await checkVectorDBStatus();

    return new Response(JSON.stringify(status), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("获取RAG状态失败:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        message: "获取RAG状态失败",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { action } = await req.json();

    switch (action) {
      case "index":
        await initVectorDB();
        const indexedCount = await indexDocuments("./knowledge");

        return new Response(
          JSON.stringify({
            status: "success",
            message: `成功索引 ${indexedCount} 个文档块`,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );

      default:
        return new Response(
          JSON.stringify({
            status: "error",
            message: "未知操作",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
    }
  } catch (error) {
    console.error("RAG操作失败:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        message: "RAG操作失败",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
