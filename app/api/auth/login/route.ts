import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/core/db";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "请输入用户名和密码" }, { status: 400 });
    }

    // 获取 prisma 实例
    const prisma = getPrisma();

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json({ error: "该账号未注册，请先注册" }, { status: 400 });
    }

    // 验证密码 (明文比对)
    if (user.password !== password) {
      return NextResponse.json({ error: "密码错误" }, { status: 400 });
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
    return NextResponse.json(
      {
        error: "服务器内部错误，请稍后重试",
        details: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
