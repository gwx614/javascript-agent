import React from "react";

/**
 * 课程路径节点（阶段）
 */
export interface StageNode {
  id: string;
  order: number;
  title: string;
  icon?: React.ReactNode;
  coreKnowledge: string[];
}

/**
 * 问卷题目定义
 */
export interface Question {
  id: number;
  question: string;
  type: "select" | "checkbox" | "textarea";
  options?: string[];
  placeholder?: string;
}

/**
 * AI 角色定义与配置
 */
export interface AgentOptions {
  userIdentifier: string;
  systemPrompt: string;
  tools?: any[];
  temperature?: number;
  streaming?: boolean;
}

/**
 * RAG 配置选项
 */
export interface RAGOptions {
  topK: number;
  chunkSize: number;
  maxContextLength: number;
}

/**
 * 聊天消息载荷 (用于前端/API)
 */
export interface ChatMessagePayload {
  role: "user" | "assistant" | "system";
  content: string;
  parts?: any[];
}

/**
 * 知识点评估状态
 */
export interface KnowledgePointStatus {
  name: string;
  status: "mastered" | "learning" | "unreached";
  mastery: "high" | "medium" | "low";
  action: "skip" | "reinforce" | "learn";
  teachingAdvice?: string;
}

/**
 * 诊断报告题干分析
 */
export interface QuestionAnalysis {
  questionIndex: number;
  isCorrect: boolean;
  userAnswer: any;
  correctAnswer: any;
  explanation: string;
}

/**
 * 用户基础画像
 */
export interface UserProfile {
  id: string;
  username: string;
  careerIdentity?: string;
  experienceLevel?: string;
  rolePosition?: string;
  learningGoal?: string;
  interestAreas?: string[];
  targetLevel?: string;
  weeklyStudyTime?: string;
  preferredScenarios?: string[];
  tutorStyle?: string;
  skillLevel?: string;
  roleReport?: string;
  additionalNotes?: string;
}

/**
 * 诊断报告结构
 */
export interface DiagnosisReport {
  overallLevel: string;
  summary: string;
  questionAnalysis: {
    questionIndex: number;
    isCorrect: boolean;
    userAnswer: any;
    correctAnswer: any;
    explanation: string;
  }[];
  knowledgePoints: KnowledgePointStatus[];
  learningPath: string[];
  roleAdvice?: string;
}

/**
 * 摸底测试题目定义
 */
export interface AssessmentQuestion {
  id: string;
  conceptType: string;
  targetKnowledge: string;
  questionText: string;
  hasCode?: boolean;
  codeBlock?: string;
  correctAnswers: string[];
  options?: string[];
}
