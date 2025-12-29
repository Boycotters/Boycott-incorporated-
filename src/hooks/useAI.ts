import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AIAction = 
  | 'generate_survey' 
  | 'verify_content' 
  | 'recommend_tasks' 
  | 'moderate_content'
  | 'analyze_user'
  | 'generate_partnership';

interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SurveyQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'scale' | 'text';
  options?: string[];
  required: boolean;
}

interface GeneratedSurvey {
  title: string;
  description: string;
  estimatedMinutes: number;
  questions: SurveyQuestion[];
}

interface VerificationResult {
  approved: boolean;
  confidence: number;
  reason: string;
  flags?: string[];
}

interface TaskRecommendation {
  category: string;
  taskType: string;
  reason: string;
  pointsRange: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface RecommendationsResult {
  recommendations: TaskRecommendation[];
  dailyFocus: string;
}

interface ModerationResult {
  safe: boolean;
  issues: string[];
  severity: 'none' | 'low' | 'medium' | 'high';
  action: 'approve' | 'flag_for_review' | 'reject';
}

interface UserAnalysis {
  userType: string;
  strengths: string[];
  suggestedChallenges: string[];
  engagementTips: string[];
  riskOfChurn: 'low' | 'medium' | 'high';
}

interface PartnershipTask {
  title: string;
  description: string;
  requirements: string[];
  verificationMethod: 'url' | 'screenshot' | 'survey' | 'timer';
  suggestedPoints: number;
  estimatedTime: string;
  callToAction: string;
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

      if (fnError) {
        throw new Error(fnError.message);
      }

      const result = response as AIResponse<T>;

      if (!result.success) {
        throw new Error(result.error || 'AI request failed');
      }

      return result.data || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const generateSurvey = async (
    taskType: string,
    userLevel: number,
    category: string,
    previousAnswers?: string[]
  ): Promise<GeneratedSurvey | null> => {
    return callAI<GeneratedSurvey>('generate_survey', {
      taskType,
      userLevel,
      category,
      previousAnswers
    });
  };

  const verifyContent = async (
    type: 'url' | 'text' | 'survey_response',
    content: string,
    taskRequirements: string
  ): Promise<VerificationResult | null> => {
    return callAI<VerificationResult>('verify_content', {
      type,
      content,
      taskRequirements
    });
  };

  const recommendTasks = async (
    userLevel: number,
    completedCategories: string[],
    interests: string[],
    vipTier: string
  ): Promise<RecommendationsResult | null> => {
    return callAI<RecommendationsResult>('recommend_tasks', {
      userLevel,
      completedCategories,
      interests,
      vipTier
    });
  };

  const moderateContent = async (
    content: string,
    contentType: string
  ): Promise<ModerationResult | null> => {
    return callAI<ModerationResult>('moderate_content', {
      content,
      contentType
    });
  };

  const analyzeUser = async (
    completionHistory: string[],
    streakDays: number,
    preferredCategories: string[]
  ): Promise<UserAnalysis | null> => {
    return callAI<UserAnalysis>('analyze_user', {
      completionHistory,
      streakDays,
      preferredCategories
    });
  };

  const generatePartnership = async (
    brandCategory: string,
    targetAudience: string,
    campaignType: string
  ): Promise<PartnershipTask | null> => {
    return callAI<PartnershipTask>('generate_partnership', {
      brandCategory,
      targetAudience,
      campaignType
    });
  };

  return {
    loading,
    error,
    generateSurvey,
    verifyContent,
    recommendTasks,
    moderateContent,
    analyzeUser,
    generatePartnership
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
