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
  | 'generate_quiz';

interface AIRequest {
  action: AIAction;
  data: Record<string, any>;
  userId?: string;
}

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Rate limit: 10 AI requests per minute per user
async function checkRateLimit(userId: string | undefined, action: string): Promise<{ allowed: boolean; message?: string }> {
  if (!userId) {
    return { allowed: true }; // Allow anonymous requests but they won't be logged
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase.rpc('check_ai_rate_limit', {
    p_user_id: userId,
    p_action: action,
    p_limit_per_minute: 10
  });
  
  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true }; // Allow if rate limit check fails
  }
  
  return data as { allowed: boolean; message?: string };
}

async function callAI(systemPrompt: string, userPrompt: string, useTools = false, tools?: any[]) {
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

  const result = await response.json();
  
  if (useTools && result.choices?.[0]?.message?.tool_calls) {
    const toolCall = result.choices[0].message.tool_calls[0];
    return JSON.parse(toolCall.function.arguments);
  }
  
  return result.choices?.[0]?.message?.content || '';
}

// Generate dynamic survey questions
async function generateSurvey(data: { taskType: string; userLevel: number; category: string; previousAnswers?: string[] }) {
  const systemPrompt = `You are an expert survey designer for a Zambian rewards app called Pesa Rewards. Generate engaging, relevant survey questions that users will enjoy answering. The surveys should be appropriate for the user's level and category. Be creative and generate DIFFERENT questions each time. Include questions relevant to Zambian lifestyle, culture, and local context when appropriate.`;
  
  // Add randomness for variety
  const randomSeed = Math.floor(Math.random() * 1000);
  const surveyStyles = ['conversational', 'professional', 'fun', 'quick', 'in-depth'];
  const randomStyle = surveyStyles[Math.floor(Math.random() * surveyStyles.length)];
  
  const userPrompt = `Generate a ${randomStyle} survey for the following context (Variation: ${randomSeed}):
- Task Type: ${data.taskType}
- User Level: ${data.userLevel}
- Category: ${data.category}
${data.previousAnswers ? `- Previous answers indicate interests in: ${data.previousAnswers.join(', ')}` : ''}

Create 4-5 UNIQUE, engaging questions that feel personalized and interesting. Make them DIFFERENT from typical surveys.`;

  const tools = [{
    type: 'function',
    function: {
      name: 'create_survey',
      description: 'Create a structured survey with questions',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Survey title' },
          description: { type: 'string', description: 'Brief survey description' },
          estimatedMinutes: { type: 'number', description: 'Estimated time in minutes' },
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
  }];

  return await callAI(systemPrompt, userPrompt, true, tools);
}

// AI-powered content verification
async function verifyContent(data: { type: 'url' | 'text' | 'survey_response'; content: string; taskRequirements: string }) {
  const systemPrompt = `You are a content verification expert for a rewards platform. Your job is to determine if submitted content meets task requirements. Be fair but thorough in your assessment.`;
  
  const userPrompt = `Verify if this submission meets the requirements:

Task Requirements: ${data.taskRequirements}
Submission Type: ${data.type}
Content: ${data.content}

Assess whether this appears to be a genuine, quality submission.`;

  const tools = [{
    type: 'function',
    function: {
      name: 'verify_submission',
      description: 'Verify if a submission meets requirements',
      parameters: {
        type: 'object',
        properties: {
          approved: { type: 'boolean', description: 'Whether the submission is approved' },
          confidence: { type: 'number', description: 'Confidence score 0-100' },
          reason: { type: 'string', description: 'Explanation for the decision' },
          flags: { type: 'array', items: { type: 'string' }, description: 'Any concerns or flags' }
        },
        required: ['approved', 'confidence', 'reason']
      }
    }
  }];

  return await callAI(systemPrompt, userPrompt, true, tools);
}

// AI task recommendations
async function recommendTasks(data: { userLevel: number; completedCategories: string[]; interests: string[]; vipTier: string }) {
  const systemPrompt = `You are a personalized task recommendation engine for a Zambian rewards app. Suggest tasks that match user interests and skill level, balancing variety with relevance. Be creative and suggest different types of tasks each time. Include tasks related to local Zambian context when appropriate.`;
  
  // Add randomness seed for variety
  const randomSeed = Math.floor(Math.random() * 1000);
  const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening';
  
  const userPrompt = `Generate task recommendations for this user (Variation seed: ${randomSeed}, Time: ${timeOfDay}):
- Level: ${data.userLevel}
- VIP Tier: ${data.vipTier}
- Recently completed categories: ${data.completedCategories.join(', ') || 'None'}
- Interests: ${data.interests.join(', ') || 'General'}

Recommend a DIVERSE mix of 4-5 task types they would enjoy. Be creative and suggest DIFFERENT tasks than before. Consider time of day for relevance.`;

  const tools = [{
    type: 'function',
    function: {
      name: 'recommend_tasks',
      description: 'Generate personalized task recommendations',
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
                reason: { type: 'string', description: 'Why this is recommended' },
                pointsRange: { type: 'string', description: 'Expected points range' },
                difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] }
              },
              required: ['category', 'taskType', 'reason', 'pointsRange', 'difficulty']
            }
          },
          dailyFocus: { type: 'string', description: 'Suggested focus category for today' }
        },
        required: ['recommendations', 'dailyFocus']
      }
    }
  }];

  return await callAI(systemPrompt, userPrompt, true, tools);
}

// Content moderation
async function moderateContent(data: { content: string; contentType: string }) {
  const systemPrompt = `You are a content moderation system. Analyze content for policy violations, spam, or inappropriate material. Be thorough but fair.`;
  
  const userPrompt = `Analyze this ${data.contentType} for policy compliance:

"${data.content}"

Check for: spam, inappropriate content, fake/misleading info, policy violations.`;

  const tools = [{
    type: 'function',
    function: {
      name: 'moderate_content',
      description: 'Analyze content for policy compliance',
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
  }];

  return await callAI(systemPrompt, userPrompt, true, tools);
}

// User analysis for personalization
async function analyzeUser(data: { completionHistory: string[]; streakDays: number; preferredCategories: string[] }) {
  const systemPrompt = `You are a user behavior analyst. Analyze patterns to understand user preferences and suggest personalization improvements.`;
  
  const userPrompt = `Analyze this user's behavior:
- Task History: ${data.completionHistory.join(', ')}
- Current Streak: ${data.streakDays} days
- Preferred Categories: ${data.preferredCategories.join(', ')}

Provide insights for personalization.`;

  const tools = [{
    type: 'function',
    function: {
      name: 'analyze_user',
      description: 'Provide user behavior analysis',
      parameters: {
        type: 'object',
        properties: {
          userType: { type: 'string', description: 'Classification of user type' },
          strengths: { type: 'array', items: { type: 'string' } },
          suggestedChallenges: { type: 'array', items: { type: 'string' } },
          engagementTips: { type: 'array', items: { type: 'string' } },
          riskOfChurn: { type: 'string', enum: ['low', 'medium', 'high'] }
        },
        required: ['userType', 'strengths', 'suggestedChallenges', 'engagementTips', 'riskOfChurn']
      }
    }
  }];

  return await callAI(systemPrompt, userPrompt, true, tools);
}

// Generate partnership/brand tasks
async function generatePartnership(data: { brandCategory: string; targetAudience: string; campaignType: string }) {
  const systemPrompt = `You are a partnership and campaign specialist for a Zambian rewards app. Create engaging brand collaboration tasks that benefit both users and partners. Be creative and generate UNIQUE, DIFFERENT tasks each time. Include Zambian context when relevant.`;
  
  // Add randomness for variety
  const randomSeed = Math.floor(Math.random() * 1000);
  const themes = ['trendy', 'classic', 'innovative', 'community-focused', 'lifestyle', 'digital', 'local'];
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];
  
  const userPrompt = `Create a UNIQUE partnership task (Variation: ${randomSeed}, Theme: ${randomTheme}):
- Brand Category: ${data.brandCategory}
- Target Audience: ${data.targetAudience}
- Campaign Type: ${data.campaignType}

Generate an engaging, CREATIVE task that users will want to complete. Make it DIFFERENT from typical tasks. Consider local Zambian brands and context when appropriate.`;

  const tools = [{
    type: 'function',
    function: {
      name: 'create_partnership_task',
      description: 'Create a brand partnership task',
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
  }];

  return await callAI(systemPrompt, userPrompt, true, tools);
}

// Generate quiz with pass/fail scoring
async function generateQuiz(data: { topic: string; category: string; difficulty: string; questionCount: number; passPercentage: number }) {
  const systemPrompt = `You are an expert quiz creator for a Zambian rewards app. Create engaging, educational quiz questions that test knowledge while being fun. Include questions relevant to Zambian culture, lifestyle, and general knowledge when appropriate. Make sure each question has exactly 4 options with only one correct answer.`;
  
  const randomSeed = Math.floor(Math.random() * 1000);
  const questionStyles = ['trivia', 'educational', 'fun facts', 'practical knowledge', 'current events'];
  const randomStyle = questionStyles[Math.floor(Math.random() * questionStyles.length)];
  
  const userPrompt = `Create a ${randomStyle} quiz (Variation: ${randomSeed}):
- Topic: ${data.topic}
- Category: ${data.category}
- Difficulty: ${data.difficulty}
- Number of Questions: ${data.questionCount}
- Pass Percentage: ${data.passPercentage}%

Generate ${data.questionCount} UNIQUE quiz questions with 4 options each. Each question should have exactly one correct answer. Include brief explanations for why the correct answer is right. Make questions engaging and educational.`;

  const tools = [{
    type: 'function',
    function: {
      name: 'create_quiz',
      description: 'Create a quiz with questions',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Quiz title' },
          description: { type: 'string', description: 'Brief quiz description' },
          passPercentage: { type: 'number', description: 'Required percentage to pass' },
          timePerQuestion: { type: 'number', description: 'Seconds per question' },
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                question: { type: 'string' },
                options: { type: 'array', items: { type: 'string' }, description: 'Exactly 4 options' },
                correctAnswer: { type: 'number', description: 'Index of correct option (0-3)' },
                explanation: { type: 'string', description: 'Why this answer is correct' }
              },
              required: ['id', 'question', 'options', 'correctAnswer']
            }
          }
        },
        required: ['title', 'description', 'passPercentage', 'timePerQuestion', 'questions']
      }
    }
  }];

  return await callAI(systemPrompt, userPrompt, true, tools);
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, data, userId } = await req.json() as AIRequest;
    console.log(`AI Service: Processing action "${action}" for user ${userId || 'anonymous'}`);

    // Check rate limit
    const rateLimitResult = await checkRateLimit(userId, action);
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: rateLimitResult.message || 'Rate limit exceeded. Please wait a moment.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result;

    switch (action) {
      case 'generate_survey':
        result = await generateSurvey(data as { taskType: string; userLevel: number; category: string; previousAnswers?: string[] });
        break;
      case 'verify_content':
        result = await verifyContent(data as { type: 'url' | 'text' | 'survey_response'; content: string; taskRequirements: string });
        break;
      case 'recommend_tasks':
        result = await recommendTasks(data as { userLevel: number; completedCategories: string[]; interests: string[]; vipTier: string });
        break;
      case 'moderate_content':
        result = await moderateContent(data as { content: string; contentType: string });
        break;
      case 'analyze_user':
        result = await analyzeUser(data as { completionHistory: string[]; streakDays: number; preferredCategories: string[] });
        break;
      case 'generate_partnership':
        result = await generatePartnership(data as { brandCategory: string; targetAudience: string; campaignType: string });
        break;
      case 'generate_quiz':
        result = await generateQuiz(data as { topic: string; category: string; difficulty: string; questionCount: number; passPercentage: number });
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`AI Service: Action "${action}" completed successfully`);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI Service error:', error);
    
    const err = error as Error;
    
    // Handle rate limiting from AI gateway
    if (err.message?.includes('429')) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Rate limit exceeded. Please try again in a moment.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle payment required
    if (err.message?.includes('402')) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'AI credits exhausted. Please add credits to continue.' 
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message || 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

