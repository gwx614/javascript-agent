export interface Question {
  id: string | number;
  question: string;
  type: "select" | "textarea" | "checkbox";
  options?: string[];
  placeholder?: string;
}

export interface UserProfile {
  id?: string;
  username?: string;
  rolePosition?: string;
  roleReport?: string;

  // 用户画像字段
  careerIdentity?: string;
  experienceLevel?: string;
  learningGoal?: string;
  interestAreas?: string[];
  preferredScenarios?: string[];
  targetLevel?: string;
  tutorStyle?: string;
  weeklyStudyTime?: string;
  additionalNotes?: string;
  surveyData?: Record<string, any>;

  [key: string]: any;
}

/** 单个知识点诊断 */
export interface KnowledgePointStatus {
  name: string;
  mastery: "high" | "medium" | "low";
  action: "skip" | "reinforce" | "learn";
  note: string; // 给用户看的简短提示
  teachingAdvice: string; // 给后续 AI 教学用的结构化建议
}

/** 逐题分析 */
export interface QuestionAnalysis {
  questionIndex: number; // 题目序号（从1开始）
  isCorrect: boolean; // 是否答对
  correctAnswer: string; // 正确答案
  explanation: string; // 解析说明（答错时重点解释为什么错，答对时简要确认）
}

/** AI 诊断报告 */
export interface DiagnosisReport {
  overallLevel: string;
  summary: string;
  questionAnalysis: QuestionAnalysis[];
  knowledgePoints: KnowledgePointStatus[];
  learningPath: string[];
  roleAdvice: string;
}

export interface SectionContentRecord {
  sectionId: string;
  content: string;
}

export interface OnboardingSurveyItem {
  id: string | number;
  question: string;
  answer: string | string[];
}

export interface ChatMessagePayload {
  role: "system" | "user" | "assistant" | "data";
  content?: string;
  parts?: Array<{ type: string; text?: string }>;
}

export interface AssessmentQuestion {
  id: string;
  type: string;
  conceptType?: string;
  targetKnowledge?: string;
  questionText: string;
  hasCode?: boolean;
  codeBlock?: string;
  options?: string[];
  correctAnswers?: string[];
  question?: string;
}
