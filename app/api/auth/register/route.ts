import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/core/db";
import { apiError } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return apiError("请输入用户名和密码", "MISSING_CREDENTIALS", 400);
    }

    if (username.length < 3) {
      return apiError("用户名必须至少为3位", "INVALID_USERNAME_LENGTH", 400);
    }

    if (password.length < 6) {
      return apiError("密码必须至少为6位", "INVALID_PASSWORD_LENGTH", 400);
    }

    // 延迟获取 prisma 实例并捕获初始化错误
    const prisma = getPrisma();

    // 检查用户名是否存在
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return apiError("该用户名已被注册", "USER_ALREADY_EXISTS", 400);
    }

    // 为了简单系统，直接存储明文密码
    const user = await prisma.user.create({
      data: {
        username,
        password,
      },
    });

    return NextResponse.json(
      {
        message: "注册成功",
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
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Register error details:", error);
    return apiError("服务器内部错误，请稍后重试", "SERVER_ERROR", 500, error.message);
  }
}
