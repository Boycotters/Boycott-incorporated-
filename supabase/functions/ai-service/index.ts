import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AIAction = 
  | 'generate_survey' 
  | 'verify_content' 
  | 'recommend_tasks' 
  | 'moderate_content'
  | 'analyze_user'
  | 'generate_partnership'
  | 'generate_quiz'
  | 'chatbot'
  | 'fraud_detection'
  | 'sentiment_analysis'
  | 'learning_insights'
  | 'implementation_roadmap';

interface AIRequest {
  action: AIAction;
  data: Record<string, any>;
  userId?: string;
}

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function checkRateLimit(userId: string | undefined, action: string): Promise<{ allowed: boolean; message?: string }> {
  if (!userId) return { allowed: true };
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.rpc('check_ai_rate_limit', {
    p_user_id: userId, p_action: action, p_limit_per_minute: 10
  });
  if (error) { console.error('Rate limit check error:', error); return { allowed: true }; }
  return data as { allowed: boolean; message?: string };
}

async function callAI(systemPrompt: string, userPrompt: string, useTools = false, tools?: any[], stream = false) {
  const body: any = {
    model: 'google/gemini-2.5-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
  };

  if (useTools && tools) {
    body.tools = tools;
    body.tool_choice = { type: 'function', function: { name: tools[0].function.name } };
  }

  if (stream) {
    body.stream = true;
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('AI Gateway error:', response.status, error);
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  if (stream) {
    return response;
  }

  const result = await response.json();
  
  if (useTools && result.choices?.[0]?.message?.tool_calls) {
    const toolCall = result.choices[0].message.tool_calls[0];
    return JSON.parse(toolCall.function.arguments);
  }
  
  return result.choices?.[0]?.message?.content || '';
}

// ===== EXISTING HANDLERS =====

async function generateSurvey(data: any) {
  const randomSeed = Math.floor(Math.random() * 1000);
  const surveyStyles = ['conversational', 'professional', 'fun', 'quick', 'in-depth'];
  const randomStyle = surveyStyles[Math.floor(Math.random() * surveyStyles.length)];
  
  return await callAI(
    `You are an expert survey designer for a Zambian rewards app called Pesa Rewards. Generate engaging, relevant survey questions.`,
    `Generate a ${randomStyle} survey (Variation: ${randomSeed}):
- Task Type: ${data.taskType}
- User Level: ${data.userLevel}
- Category: ${data.category}
${data.previousAnswers ? `- Previous answers: ${data.previousAnswers.join(', ')}` : ''}
Create 4-5 UNIQUE questions.`,
    true,
    [{
      type: 'function',
      function: {
        name: 'create_survey',
        description: 'Create a structured survey',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            estimatedMinutes: { type: 'number' },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  question: { type: 'string' },
                  type: { type: 'string', enum: ['multiple_choice', 'scale', 'text'] },
                  options: { type: 'array', items: { type: 'string' } },
                  required: { type: 'boolean' }
                },
                required: ['id', 'question', 'type', 'required']
              }
            }
          },
          required: ['title', 'description', 'estimatedMinutes', 'questions']
        }
      }
    }]
  );
}

async function verifyContent(data: any) {
  return await callAI(
    `You are a content verification expert for a rewards platform.`,
    `Verify submission:\nRequirements: ${data.taskRequirements}\nType: ${data.type}\nContent: ${data.content}`,
    true,
    [{
      type: 'function',
      function: {
        name: 'verify_submission',
        description: 'Verify submission',
        parameters: {
          type: 'object',
          properties: {
            approved: { type: 'boolean' },
            confidence: { type: 'number' },
            reason: { type: 'string' },
            flags: { type: 'array', items: { type: 'string' } }
          },
          required: ['approved', 'confidence', 'reason']
        }
      }
    }]
  );
}

async function recommendTasks(data: any) {
  const randomSeed = Math.floor(Math.random() * 1000);
  const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening';
  
  return await callAI(
    `You are a personalized task recommendation engine for a Zambian rewards app.`,
    `Recommend tasks (Seed: ${randomSeed}, Time: ${timeOfDay}):
- Level: ${data.userLevel}, VIP: ${data.vipTier}
- Recent: ${data.completedCategories.join(', ') || 'None'}
- Interests: ${data.interests.join(', ') || 'General'}
Recommend 4-5 DIVERSE tasks.`,
    true,
    [{
      type: 'function',
      function: {
        name: 'recommend_tasks',
        description: 'Generate task recommendations',
        parameters: {
          type: 'object',
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  taskType: { type: 'string' },
                  reason: { type: 'string' },
                  pointsRange: { type: 'string' },
                  difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] }
                },
                required: ['category', 'taskType', 'reason', 'pointsRange', 'difficulty']
              }
            },
            dailyFocus: { type: 'string' }
          },
          required: ['recommendations', 'dailyFocus']
        }
      }
    }]
  );
}

async function moderateContent(data: any) {
  return await callAI(
    `You are a content moderation system.`,
    `Analyze this ${data.contentType}: "${data.content}"`,
    true,
    [{
      type: 'function',
      function: {
        name: 'moderate_content',
        description: 'Analyze content',
        parameters: {
          type: 'object',
          properties: {
            safe: { type: 'boolean' },
            issues: { type: 'array', items: { type: 'string' } },
            severity: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
            action: { type: 'string', enum: ['approve', 'flag_for_review', 'reject'] }
          },
          required: ['safe', 'issues', 'severity', 'action']
        }
      }
    }]
  );
}

async function analyzeUser(data: any) {
  return await callAI(
    `You are a user behavior analyst for personalization.`,
    `Analyze user:
- History: ${data.completionHistory.join(', ')}
- Streak: ${data.streakDays} days
- Categories: ${data.preferredCategories.join(', ')}`,
    true,
    [{
      type: 'function',
      function: {
        name: 'analyze_user',
        description: 'Analyze user behavior',
        parameters: {
          type: 'object',
          properties: {
            userType: { type: 'string' },
            strengths: { type: 'array', items: { type: 'string' } },
            suggestedChallenges: { type: 'array', items: { type: 'string' } },
            engagementTips: { type: 'array', items: { type: 'string' } },
            riskOfChurn: { type: 'string', enum: ['low', 'medium', 'high'] }
          },
          required: ['userType', 'strengths', 'suggestedChallenges', 'engagementTips', 'riskOfChurn']
        }
      }
    }]
  );
}

async function generatePartnership(data: any) {
  const randomSeed = Math.floor(Math.random() * 1000);
  const themes = ['trendy', 'classic', 'innovative', 'community-focused', 'lifestyle'];
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];
  
  return await callAI(
    `You are a partnership specialist for a Zambian rewards app.`,
    `Create partnership task (Variation: ${randomSeed}, Theme: ${randomTheme}):
- Brand: ${data.brandCategory}
- Audience: ${data.targetAudience}
- Campaign: ${data.campaignType}`,
    true,
    [{
      type: 'function',
      function: {
        name: 'create_partnership_task',
        description: 'Create a partnership task',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            requirements: { type: 'array', items: { type: 'string' } },
            verificationMethod: { type: 'string', enum: ['url', 'screenshot', 'survey', 'timer'] },
            suggestedPoints: { type: 'number' },
            estimatedTime: { type: 'string' },
            callToAction: { type: 'string' }
          },
          required: ['title', 'description', 'requirements', 'verificationMethod', 'suggestedPoints', 'estimatedTime', 'callToAction']
        }
      }
    }]
  );
}

async function generateQuiz(data: any) {
  const randomSeed = Math.floor(Math.random() * 1000);
  return await callAI(
    `You are an expert quiz creator for a Zambian rewards app.`,
    `Create quiz (Variation: ${randomSeed}):
- Topic: ${data.topic}, Category: ${data.category}
- Difficulty: ${data.difficulty}, Questions: ${data.questionCount}
- Pass: ${data.passPercentage}%`,
    true,
    [{
      type: 'function',
      function: {
        name: 'create_quiz',
        description: 'Create a quiz',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            passPercentage: { type: 'number' },
            timePerQuestion: { type: 'number' },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  question: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  correctAnswer: { type: 'number' },
                  explanation: { type: 'string' }
                },
                required: ['id', 'question', 'options', 'correctAnswer']
              }
            }
          },
          required: ['title', 'description', 'passPercentage', 'timePerQuestion', 'questions']
        }
      }
    }]
  );
}

// ===== NEW AI MODEL HANDLERS =====

// Chatbot - conversational assistant
async function handleChatbot(data: { messages: Array<{ role: string; content: string }>; userContext?: any }) {
  const systemPrompt = `You are Pesa AI, a friendly and helpful assistant for Pesa Rewards, a Zambian rewards and earning app. You help users with:
- Understanding how to earn points (tasks, surveys, videos, games)
- Explaining VIP tiers, streaks, and achievements
- Providing tips to maximize earnings
- Answering questions about withdrawals and mobile money
- General support and troubleshooting

Be conversational, encouraging, and use simple language. Mention Zambian Kwacha (ZMW) when discussing money. Keep responses concise but helpful. Use emojis sparingly for friendliness.

${data.userContext ? `User context: Level ${data.userContext.level}, VIP: ${data.userContext.vipTier}, Points: ${data.userContext.totalPoints}, Streak: ${data.userContext.streak} days` : ''}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...data.messages.map(m => ({ role: m.role, content: m.content }))
  ];

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages,
    }),
  });

  if (!response.ok) throw new Error(`AI Gateway error: ${response.status}`);
  const result = await response.json();
  return { reply: result.choices?.[0]?.message?.content || 'Sorry, I could not process that.' };
}

// Fraud Detection - analyze submissions for fraud
async function handleFraudDetection(data: { userId: string; submissionType: string; submissionData: any; userHistory?: any }) {
  return await callAI(
    `You are a fraud detection AI for a rewards platform. Analyze submissions for signs of fraud, bot activity, duplicate accounts, or gaming the system. Be thorough but fair. Consider patterns like:
- Impossible completion times
- Copy-pasted or generic responses
- GPS spoofing indicators
- Suspicious earning patterns
- Account age vs activity level`,
    `Analyze this submission for fraud:
- User ID: ${data.userId}
- Submission Type: ${data.submissionType}
- Data: ${JSON.stringify(data.submissionData)}
${data.userHistory ? `- User History: ${JSON.stringify(data.userHistory)}` : ''}

Provide a detailed fraud analysis.`,
    true,
    [{
      type: 'function',
      function: {
        name: 'fraud_analysis',
        description: 'Analyze submission for fraud',
        parameters: {
          type: 'object',
          properties: {
            riskScore: { type: 'number', description: 'Fraud risk score 0-100' },
            riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            isFraudulent: { type: 'boolean' },
            indicators: { type: 'array', items: { type: 'string' }, description: 'Fraud indicators found' },
            recommendation: { type: 'string', enum: ['approve', 'review', 'reject', 'ban'] },
            explanation: { type: 'string' },
            patterns: { type: 'array', items: { type: 'string' }, description: 'Suspicious patterns detected' }
          },
          required: ['riskScore', 'riskLevel', 'isFraudulent', 'indicators', 'recommendation', 'explanation']
        }
      }
    }]
  );
}

// Sentiment Analysis - analyze user feedback
async function handleSentimentAnalysis(data: { text: string; context?: string }) {
  return await callAI(
    `You are a sentiment analysis AI. Analyze text for emotional tone, satisfaction level, and actionable insights. Consider cultural context of Zambian users.`,
    `Analyze sentiment of this feedback:
"${data.text}"
${data.context ? `Context: ${data.context}` : ''}`,
    true,
    [{
      type: 'function',
      function: {
        name: 'analyze_sentiment',
        description: 'Analyze text sentiment',
        parameters: {
          type: 'object',
          properties: {
            sentiment: { type: 'string', enum: ['very_negative', 'negative', 'neutral', 'positive', 'very_positive'] },
            confidence: { type: 'number', description: '0-100' },
            emotions: { type: 'array', items: { type: 'string' }, description: 'Detected emotions' },
            keyTopics: { type: 'array', items: { type: 'string' } },
            satisfaction: { type: 'number', description: 'Satisfaction score 1-10' },
            actionItems: { type: 'array', items: { type: 'string' }, description: 'Suggested actions' },
            summary: { type: 'string' }
          },
          required: ['sentiment', 'confidence', 'emotions', 'keyTopics', 'satisfaction', 'summary']
        }
      }
    }]
  );
}

// Learning System - analyze user behavior patterns
async function handleLearningInsights(data: { userId: string; behaviorData: any }) {
  return await callAI(
    `You are a machine learning insights engine for a rewards platform. Analyze user behavior data to generate actionable insights for platform improvement. Focus on:
- User engagement patterns
- Feature usage optimization
- Retention improvement
- Personalization opportunities
- Revenue optimization suggestions`,
    `Analyze platform behavior data:
${JSON.stringify(data.behaviorData)}

Generate insights for platform self-improvement.`,
    true,
    [{
      type: 'function',
      function: {
        name: 'learning_insights',
        description: 'Generate learning insights',
        parameters: {
          type: 'object',
          properties: {
            engagementScore: { type: 'number', description: 'Overall engagement 0-100' },
            patterns: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  pattern: { type: 'string' },
                  frequency: { type: 'string' },
                  impact: { type: 'string', enum: ['low', 'medium', 'high'] },
                  suggestion: { type: 'string' }
                },
                required: ['pattern', 'frequency', 'impact', 'suggestion']
              }
            },
            retentionRisk: { type: 'string', enum: ['low', 'medium', 'high'] },
            optimizations: { type: 'array', items: { type: 'string' } },
            predictedActions: { type: 'array', items: { type: 'string' } },
            personalizedSuggestions: { type: 'array', items: { type: 'string' } }
          },
          required: ['engagementScore', 'patterns', 'retentionRisk', 'optimizations']
        }
      }
    }]
  );
}

// Implementation Roadmap & Cost Estimates
async function handleImplementationRoadmap(data: { feature: string; currentStack?: string; constraints?: string }) {
  return await callAI(
    `You are a technical project manager and architect. Generate detailed implementation roadmaps with realistic cost and time estimates for a mobile-first rewards app built with React, Supabase, and deployed on Lovable. Costs should be in USD and ZMW.`,
    `Create implementation roadmap for:
Feature: ${data.feature}
${data.currentStack ? `Current Stack: ${data.currentStack}` : 'Stack: React + Supabase + Lovable'}
${data.constraints ? `Constraints: ${data.constraints}` : ''}

Provide detailed phases, timelines, costs, and risks.`,
    true,
    [{
      type: 'function',
      function: {
        name: 'create_roadmap',
        description: 'Create implementation roadmap',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            summary: { type: 'string' },
            totalEstimatedCostUSD: { type: 'number' },
            totalEstimatedCostZMW: { type: 'number' },
            totalTimeWeeks: { type: 'number' },
            phases: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  durationWeeks: { type: 'number' },
                  costUSD: { type: 'number' },
                  tasks: { type: 'array', items: { type: 'string' } },
                  deliverables: { type: 'array', items: { type: 'string' } }
                },
                required: ['name', 'description', 'durationWeeks', 'costUSD', 'tasks', 'deliverables']
              }
            },
            risks: { type: 'array', items: { type: 'string' } },
            prerequisites: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } }
          },
          required: ['title', 'summary', 'totalEstimatedCostUSD', 'totalEstimatedCostZMW', 'totalTimeWeeks', 'phases', 'risks']
        }
      }
    }]
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, data, userId } = await req.json() as AIRequest;
    console.log(`AI Service: Processing "${action}" for user ${userId || 'anonymous'}`);

    const rateLimitResult = await checkRateLimit(userId, action);
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ 
        success: false, error: rateLimitResult.message || 'Rate limit exceeded.' 
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let result;

    switch (action) {
      case 'generate_survey':
        result = await generateSurvey(data);
        break;
      case 'verify_content':
        result = await verifyContent(data);
        break;
      case 'recommend_tasks':
        result = await recommendTasks(data);
        break;
      case 'moderate_content':
        result = await moderateContent(data);
        break;
      case 'analyze_user':
        result = await analyzeUser(data);
        break;
      case 'generate_partnership':
        result = await generatePartnership(data);
        break;
      case 'generate_quiz':
        result = await generateQuiz(data);
        break;
      case 'chatbot':
        result = await handleChatbot(data as any);
        break;
      case 'fraud_detection':
        result = await handleFraudDetection(data as any);
        break;
      case 'sentiment_analysis':
        result = await handleSentimentAnalysis(data as any);
        break;
      case 'learning_insights':
        result = await handleLearningInsights(data as any);
        break;
      case 'implementation_roadmap':
        result = await handleImplementationRoadmap(data as any);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`AI Service: "${action}" completed`);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI Service error:', error);
    const err = error as Error;
    
    if (err.message?.includes('429')) {
      return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (err.message?.includes('402')) {
      return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, error: err.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
