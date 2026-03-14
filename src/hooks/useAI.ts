import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AIAction = 
  | 'generate_survey' 
  | 'verify_content' 
  | 'recommend_tasks' 
  | 'moderate_content'
  | 'analyze_user'
  | 'generate_partnership'
  | 'chatbot'
  | 'fraud_detection'
  | 'sentiment_analysis'
  | 'learning_insights'
  | 'implementation_roadmap';

interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SurveyQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'scale' | 'text';
  options?: string[];
  required: boolean;
}

export interface GeneratedSurvey {
  title: string;
  description: string;
  estimatedMinutes: number;
  questions: SurveyQuestion[];
}

export interface VerificationResult {
  approved: boolean;
  confidence: number;
  reason: string;
  flags?: string[];
}

export interface TaskRecommendation {
  category: string;
  taskType: string;
  reason: string;
  pointsRange: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface RecommendationsResult {
  recommendations: TaskRecommendation[];
  dailyFocus: string;
}

export interface ModerationResult {
  safe: boolean;
  issues: string[];
  severity: 'none' | 'low' | 'medium' | 'high';
  action: 'approve' | 'flag_for_review' | 'reject';
}

export interface UserAnalysis {
  userType: string;
  strengths: string[];
  suggestedChallenges: string[];
  engagementTips: string[];
  riskOfChurn: 'low' | 'medium' | 'high';
}

export interface PartnershipTask {
  title: string;
  description: string;
  requirements: string[];
  verificationMethod: 'url' | 'screenshot' | 'survey' | 'timer';
  suggestedPoints: number;
  estimatedTime: string;
  callToAction: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatbotResponse {
  reply: string;
}

export interface FraudDetectionResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  isFraudulent: boolean;
  indicators: string[];
  recommendation: 'approve' | 'review' | 'reject' | 'ban';
  explanation: string;
  patterns?: string[];
}

export interface SentimentResult {
  sentiment: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  confidence: number;
  emotions: string[];
  keyTopics: string[];
  satisfaction: number;
  actionItems?: string[];
  summary: string;
}

export interface LearningPattern {
  pattern: string;
  frequency: string;
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface LearningInsights {
  engagementScore: number;
  patterns: LearningPattern[];
  retentionRisk: 'low' | 'medium' | 'high';
  optimizations: string[];
  predictedActions?: string[];
  personalizedSuggestions?: string[];
}

export interface RoadmapPhase {
  name: string;
  description: string;
  durationWeeks: number;
  costUSD: number;
  tasks: string[];
  deliverables: string[];
}

export interface ImplementationRoadmap {
  title: string;
  summary: string;
  totalEstimatedCostUSD: number;
  totalEstimatedCostZMW: number;
  totalTimeWeeks: number;
  phases: RoadmapPhase[];
  risks: string[];
  prerequisites?: string[];
  recommendations?: string[];
}

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callAI = async <T>(action: AIAction, data: Record<string, any>): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke('ai-service', {
        body: { action, data }
      });

      if (fnError) throw new Error(fnError.message);
      const result = response as AIResponse<T>;
      if (!result.success) throw new Error(result.error || 'AI request failed');
      return result.data || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const generateSurvey = (taskType: string, userLevel: number, category: string, previousAnswers?: string[]) =>
    callAI<GeneratedSurvey>('generate_survey', { taskType, userLevel, category, previousAnswers });

  const verifyContent = (type: 'url' | 'text' | 'survey_response', content: string, taskRequirements: string) =>
    callAI<VerificationResult>('verify_content', { type, content, taskRequirements });

  const recommendTasks = (userLevel: number, completedCategories: string[], interests: string[], vipTier: string) =>
    callAI<RecommendationsResult>('recommend_tasks', { userLevel, completedCategories, interests, vipTier });

  const moderateContent = (content: string, contentType: string) =>
    callAI<ModerationResult>('moderate_content', { content, contentType });

  const analyzeUser = (completionHistory: string[], streakDays: number, preferredCategories: string[]) =>
    callAI<UserAnalysis>('analyze_user', { completionHistory, streakDays, preferredCategories });

  const generatePartnership = (brandCategory: string, targetAudience: string, campaignType: string) =>
    callAI<PartnershipTask>('generate_partnership', { brandCategory, targetAudience, campaignType });

  const chatbot = (messages: ChatMessage[], userContext?: any) =>
    callAI<ChatbotResponse>('chatbot', { messages, userContext });

  const detectFraud = (userId: string, submissionType: string, submissionData: any, userHistory?: any) =>
    callAI<FraudDetectionResult>('fraud_detection', { userId, submissionType, submissionData, userHistory });

  const analyzeSentiment = (text: string, context?: string) =>
    callAI<SentimentResult>('sentiment_analysis', { text, context });

  const getLearningInsights = (userId: string, behaviorData: any) =>
    callAI<LearningInsights>('learning_insights', { userId, behaviorData });

  const getImplementationRoadmap = (feature: string, currentStack?: string, constraints?: string) =>
    callAI<ImplementationRoadmap>('implementation_roadmap', { feature, currentStack, constraints });

  return {
    loading,
    error,
    generateSurvey,
    verifyContent,
    recommendTasks,
    moderateContent,
    analyzeUser,
    generatePartnership,
    chatbot,
    detectFraud,
    analyzeSentiment,
    getLearningInsights,
    getImplementationRoadmap,
  };
}

export type { 
  GeneratedSurvey, 
  SurveyQuestion, 
  VerificationResult, 
  TaskRecommendation, 
  RecommendationsResult,
  ModerationResult,
  UserAnalysis,
  PartnershipTask
};
