import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  | 'generate_partnership';

interface AIRequest {
  action: AIAction;
  data: Record<string, any>;
}

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

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
  const systemPrompt = `You are an expert survey designer for a rewards app. Generate engaging, relevant survey questions that users will enjoy answering. The surveys should be appropriate for the user's level and category.`;
  
  const userPrompt = `Generate a survey for the following context:
- Task Type: ${data.taskType}
- User Level: ${data.userLevel}
- Category: ${data.category}
${data.previousAnswers ? `- Previous answers indicate interests in: ${data.previousAnswers.join(', ')}` : ''}

Create 4-5 engaging questions that feel personalized and interesting.`;

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
  const systemPrompt = `You are a personalized task recommendation engine. Suggest tasks that match user interests and skill level, balancing variety with relevance.`;
  
  const userPrompt = `Generate task recommendations for this user:
- Level: ${data.userLevel}
- VIP Tier: ${data.vipTier}
- Recently completed categories: ${data.completedCategories.join(', ') || 'None'}
- Interests: ${data.interests.join(', ') || 'General'}

Recommend a mix of task types they would enjoy.`;

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
  const systemPrompt = `You are a partnership and campaign specialist. Create engaging brand collaboration tasks that benefit both users and partners.`;
  
  const userPrompt = `Create a partnership task:
- Brand Category: ${data.brandCategory}
- Target Audience: ${data.targetAudience}
- Campaign Type: ${data.campaignType}

Generate an engaging task that users will want to complete.`;

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

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, data } = await req.json() as AIRequest;
    console.log(`AI Service: Processing action "${action}"`);

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
    
    // Handle rate limiting
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

