import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/core/db";
import { apiError } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return apiError("请输入用户名和密码", "MISSING_CREDENTIALS", 400);
    }

    // 获取 prisma 实例
    const prisma = getPrisma();

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return apiError("该账号未注册，请先注册", "USER_NOT_FOUND", 400);
    }

    // 验证密码 (明文比对)
    if (user.password !== password) {
      return apiError("密码错误", "INVALID_PASSWORD", 400);
    }

    return NextResponse.json(
      {
        message: "登录成功",
        user: {
          id: user.id,
          username: user.username,
          rolePosition: user.rolePosition,
          roleReport: user.roleReport,
          skillLevel: user.skillLevel,
          careerIdentity: user.careerIdentity,
          experienceLevel: user.experienceLevel,
          learningGoal: user.learningGoal,
          interestAreas: user.interestAreas,
          preferredScenarios: user.preferredScenarios,
          targetLevel: user.targetLevel,
          tutorStyle: user.tutorStyle,
          weeklyStudyTime: user.weeklyStudyTime,
          additionalNotes: user.additionalNotes,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Login error details:", error);
    return apiError("服务器内部错误，请稍后重试", "SERVER_ERROR", 500, error.message);
  }
}
