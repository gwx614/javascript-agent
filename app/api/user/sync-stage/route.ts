import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { username, courseId, newStage } = await req.json();

    if (!username || !courseId) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 查找该用户在该课程下的阶段记录
    let stage = await prisma.courseStage.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: courseId
        }
      },
      include: {
        sectionContents: true
      }
    });

    // 如果没有记录，创建一个新的阶段记录
    if (!stage) {
      stage = await prisma.courseStage.create({
        data: {
          userId: user.id,
          courseId: courseId,
          status: "PRE_ASSESSMENT"
        },
        include: {
          sectionContents: true
        }
      });
    }

    // 如果请求中包含新的阶段状态，更新阶段状态
    if (newStage) {
      // 验证状态转换是否合法
      const validStatusTransitions: Record<string, string[]> = {
        "PRE_ASSESSMENT": ["PRE_REPORT"],
        "PRE_REPORT": ["STUDY_OUTLINE", "STUDYING"],
        "STUDY_OUTLINE": ["STUDYING"],
        "STUDYING": ["POST_ASSESSMENT"],
        "POST_ASSESSMENT": ["POST_REPORT"],
        "POST_REPORT": ["COMPLETED"],
        "COMPLETED": []
      };

      if (!validStatusTransitions[stage.status]?.includes(newStage)) {
        return NextResponse.json({ 
          error: "状态转换不合法",
          currentStatus: stage.status,
          validTransitions: validStatusTransitions[stage.status]
        }, { status: 400 });
      }

      // 更新阶段状态
      stage = await prisma.courseStage.update({
        where: {
          id: stage.id
        },
        data: {
          status: newStage
        },
        include: {
          sectionContents: true
        }
      });
    }

    // 返回完整数据
    return NextResponse.json({
      status: stage.status,
      preQuestions: stage.preQuestions ? JSON.parse(stage.preQuestions) : null,
      preReport: stage.preReport ? JSON.parse(stage.preReport) : null,
      learningOutline: stage.learningOutline ? JSON.parse(stage.learningOutline) : null,
      postQuestions: stage.postQuestions ? JSON.parse(stage.postQuestions) : null,
      postReport: stage.postReport ? JSON.parse(stage.postReport) : null,
      sectionContents: stage.sectionContents.map((sc: any) => ({
        sectionId: sc.sectionId,
        content: sc.content
      }))
    });

  } catch (error: any) {
    console.error("Sync stage error:", error);
    return NextResponse.json({ error: "同步进度失败" }, { status: 500 });
  }
}
