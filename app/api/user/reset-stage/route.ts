import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";

/**
 * 重置用户在特定阶段的学习状态
 * 物理删除 CourseStage 表中对应的记录，级联删除 SectionContent
 */
export async function POST(req: Request) {
  try {
    const { username, courseId } = await req.json();

    if (!username || !courseId) {
      return apiError("缺少必要参数", "BAD_REQUEST", 400);
    }

    const prisma = getPrisma();

    // 1. 查找用户 ID
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return apiError("用户不存在", "USER_NOT_FOUND", 404);
    }

    // 2. 物理删除该用户在该课程阶段的所有数据
    // 注意：CourseStage 模型在 schema.prisma 中定义了 onDelete: Cascade，
    // 所以删除 CourseStage 时，关联的 SectionContent 会被自动物理删除。
    await prisma.courseStage.deleteMany({
      where: {
        userId: user.id,
        courseId: courseId,
      },
    });

    return NextResponse.json({ success: true, message: "该阶段的学习进度已彻底重置" });
  } catch (error: any) {
    console.error("Reset stage error:", error);
    return apiError("重置进度失败", "INTERNAL_SERVER_ERROR", 500);
  }
}
