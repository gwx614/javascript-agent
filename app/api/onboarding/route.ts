import { OnboardingSurveyItem } from "@/types";

interface SurveyData {
  id: string | number;
  question: string;
  answer: string | string[];
}

interface ExtractedProfile {
  skillLevel: string;
  careerIdentity: string;
  experienceLevel: string;
  learningGoal: string;
  interestAreas: string[];
  preferredScenarios: string[];
  targetLevel: string;
  tutorStyle: string;
  weeklyStudyTime: string;
  additionalNotes: string;
}

/**
 * 从问卷数据中提取结构化用户画像
 */
function extractProfileFromSurvey(data: SurveyData[]): ExtractedProfile {
  const profile: ExtractedProfile = {
    skillLevel: "",
    careerIdentity: "",
    experienceLevel: "",
    learningGoal: "",
    interestAreas: [],
    preferredScenarios: [],
    targetLevel: "",
    tutorStyle: "",
    weeklyStudyTime: "",
    additionalNotes: "",
  };

  // 问题ID映射到字段名
  const fieldMapping: Record<number, keyof ExtractedProfile> = {
    1: "skillLevel",
    2: "careerIdentity",
    3: "experienceLevel",
    4: "learningGoal",
    5: "interestAreas",
    6: "preferredScenarios",
    7: "targetLevel",
    8: "tutorStyle",
    9: "weeklyStudyTime",
    10: "additionalNotes",
  };

  data.forEach((item) => {
    const id = typeof item.id === "string" ? parseInt(item.id, 10) : item.id;
    const fieldName = fieldMapping[id];

    if (fieldName) {
      if (Array.isArray(item.answer)) {
        (profile[fieldName] as string[]) = item.answer;
      } else {
        (profile[fieldName] as string) = item.answer;
      }
    }
  });

  return profile;
}

/**
 * 根据技能水平映射到标准值
 */
function mapSkillLevel(answer: string): "beginner" | "intermediate" | "advanced" {
  if (answer.includes("小白") || answer.includes("从零")) {
    return "beginner";
  }
  if (answer.includes("有一定基础")) {
    return "intermediate";
  }
  if (answer.includes("基础较好") || answer.includes("深入进阶")) {
    return "advanced";
  }
  return "beginner";
}

export async function POST(req: Request) {
  try {
    const data: SurveyData[] = await req.json();

    // 提取结构化用户画像
    const extractedProfile = extractProfileFromSurvey(data);

    // 映射技能水平
    const skillLevel = mapSkillLevel(extractedProfile.skillLevel);

    // 组装用户提交的完整问卷数据作为上下文
    const promptContext = data
      .map(
        (item) =>
          `问题${item.id}: ${item.question}\n回答: ${Array.isArray(item.answer) ? item.answer.join("、") : item.answer}`
      )
      .join("\n\n");
    console.log("[Onboarding] 问卷上下文:", promptContext);
    console.log("[Onboarding] 提取的用户画像:", extractedProfile);

    const systemPrompt = `你是一个资深的 JavaScript 导师。
    根据用户提交的详细学习情况调研问卷，请直接为该用户生成一个准确的【专属角色定位】。
    
    用户的调研回答如下：
    ${promptContext}

    要求：
    绝对不要输出任何无关的寒暄、废话或多余的排版格式。请严格遵循以下输出结构：
    
    【角色定位】：[填写一个简短有力、响亮的角色名]
    
    [正文：用一段100~200字左右的连贯文字，简单准确地结合问卷介绍他为什么属于这个定位（注意使用"你"来称呼用户）]`;

    const { invokeGeneralAgent } = await import("@/lib/services/ai/ai.service");

    const reportText =
      (await invokeGeneralAgent({
        userIdentifier: "new-user-onboarding",
        systemPrompt,
        input: `这是用户的真实学习画像：\n${JSON.stringify(data, null, 2)}`,
        temperature: 0.8,
        tools: [], // 禁用工具调用以减少 token 开销
      })) || "无法生成报告，可能未获取到有效内容。";

    // 返回角色报告 + 结构化用户画像数据
    return Response.json({
      report: reportText,
      profile: {
        skillLevel,
        careerIdentity: extractedProfile.careerIdentity,
        experienceLevel: extractedProfile.experienceLevel,
        learningGoal: extractedProfile.learningGoal,
        interestAreas: extractedProfile.interestAreas,
        preferredScenarios: extractedProfile.preferredScenarios,
        targetLevel: extractedProfile.targetLevel,
        tutorStyle: extractedProfile.tutorStyle,
        weeklyStudyTime: extractedProfile.weeklyStudyTime,
        additionalNotes: extractedProfile.additionalNotes,
        surveyData: data,
      },
    });
  } catch (error: any) {
    console.error("Onboarding endpoint error:", error);
    return new Response(JSON.stringify({ error: "分析生成失败，请稍后重试" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
