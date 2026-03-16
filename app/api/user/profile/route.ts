import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/core/db";
import type { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      username,
      rolePosition,
      roleReport,
      skillLevel,
      // 新增用户画像字段
      careerIdentity,
      experienceLevel,
      learningGoal,
      interestAreas,
      preferredScenarios,
      targetLevel,
      tutorStyle,
      weeklyStudyTime,
      additionalNotes,
      surveyData,
    } = body;

    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    const prisma = getPrisma();

    console.log(`[Profile] 保存用户 ${username} 的画像数据:`, {
      rolePosition,
      roleReport: roleReport?.substring(0, 50) + "...",
      skillLevel,
      careerIdentity,
      experienceLevel,
      learningGoal,
      interestAreas,
      preferredScenarios,
      targetLevel,
      tutorStyle,
      weeklyStudyTime,
      additionalNotes,
    });

    // 构建 Prisma 更新数据对象（所有字段都是字符串类型）
    const updateData: Prisma.UserUpdateInput = {};

    // 原有字段
    if (rolePosition !== undefined) updateData.rolePosition = rolePosition;
    if (roleReport !== undefined) updateData.roleReport = roleReport;
    if (skillLevel !== undefined) updateData.skillLevel = skillLevel;

    // 新增用户画像字段
    if (careerIdentity !== undefined) updateData.careerIdentity = careerIdentity;
    if (experienceLevel !== undefined) updateData.experienceLevel = experienceLevel;
    if (learningGoal !== undefined) updateData.learningGoal = learningGoal;
    if (interestAreas !== undefined) {
      updateData.interestAreas = Array.isArray(interestAreas)
        ? JSON.stringify(interestAreas)
        : interestAreas;
    }
    if (preferredScenarios !== undefined) {
      updateData.preferredScenarios = Array.isArray(preferredScenarios)
        ? JSON.stringify(preferredScenarios)
        : preferredScenarios;
    }
    if (targetLevel !== undefined) updateData.targetLevel = targetLevel;
    if (tutorStyle !== undefined) updateData.tutorStyle = tutorStyle;
    if (weeklyStudyTime !== undefined) updateData.weeklyStudyTime = weeklyStudyTime;
    if (additionalNotes !== undefined) updateData.additionalNotes = additionalNotes;
    if (surveyData !== undefined) {
      updateData.surveyData =
        typeof surveyData === "object" ? JSON.stringify(surveyData) : surveyData;
    }

    const user = await prisma.user.update({
      where: { username },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      user: {
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
    });
  } catch (error: any) {
    console.error("Save profile error:", error);
    return NextResponse.json(
      { error: "无法保存用户设置", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET 接口 - 获取用户完整画像信息
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 解析 JSON 字段
    const parseJSON = (str: string | null | undefined): any => {
      if (!str) return null;
      try {
        return JSON.parse(str);
      } catch {
        return str;
      }
    };

    return NextResponse.json({
      success: true,
      user: {
        username: user.username,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        rolePosition: user.rolePosition,
        roleReport: user.roleReport,
        skillLevel: user.skillLevel,
        careerIdentity: user.careerIdentity,
        experienceLevel: user.experienceLevel,
        learningGoal: user.learningGoal,
        interestAreas: parseJSON(user.interestAreas),
        preferredScenarios: parseJSON(user.preferredScenarios),
        targetLevel: user.targetLevel,
        tutorStyle: user.tutorStyle,
        weeklyStudyTime: user.weeklyStudyTime,
        additionalNotes: user.additionalNotes,
        surveyData: parseJSON(user.surveyData),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "无法获取用户信息", details: error.message },
      { status: 500 }
    );
  }
}
