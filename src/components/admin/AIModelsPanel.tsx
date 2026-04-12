import { useState } from 'react';
import { 
  Brain, MessageCircle, Shield, BarChart3, BookOpen, Heart, 
  Map, Eye, Sparkles, CheckCircle2, Activity, Zap, RefreshCw,
  Search, FileText, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAI } from '@/hooks/useAI';
import { toast } from 'sonner';

interface AIModel {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: 'active' | 'training' | 'idle';
  category: string;
  accuracy: number;
  requestsToday: number;
  lastUsed: string;
  capabilities: string[];
  action?: string;
}

const AI_MODELS: AIModel[] = [
  {
    id: 'task-recommender',
    name: 'Task Recommendation Engine',
    description: 'Personalized task suggestions based on user behavior, interests, VIP tier, and time of day.',
    icon: Sparkles,
    status: 'active',
    category: 'Personalization',
    accuracy: 92,
    requestsToday: 0,
    lastUsed: 'Active',
    capabilities: ['User profiling', 'Interest matching', 'Difficulty scaling', 'Time-based suggestions'],
    action: 'recommend_tasks',
  },
  {
    id: 'fraud-detector',
    name: 'Fraud Detection System',
    description: 'Analyzes submissions for fraud, bot activity, GPS spoofing, and suspicious earning patterns.',
    icon: Shield,
    status: 'active',
    category: 'Security',
    accuracy: 95,
    requestsToday: 0,
    lastUsed: 'Active',
    capabilities: ['Anomaly detection', 'Pattern recognition', 'GPS validation', 'Bot detection', 'Risk scoring'],
    action: 'fraud_detection',
  },
  {
    id: 'chatbot',
    name: 'Boycott AI Chatbot',
    description: 'Conversational assistant for app support and broader real-time questions across work, learning, and everyday topics.',
    icon: MessageCircle,
    status: 'active',
    category: 'User Support',
    accuracy: 89,
    requestsToday: 0,
    lastUsed: 'Active',
    capabilities: ['Natural conversation', 'Context-aware', 'Multi-turn dialogue', 'User-specific advice'],
    action: 'chatbot',
  },
  {
    id: 'learning-system',
    name: 'Behavior Learning System',
    description: 'Learns from user patterns to improve platform features, predict churn, and optimize engagement.',
    icon: BookOpen,
    status: 'active',
    category: 'Analytics',
    accuracy: 87,
    requestsToday: 0,
    lastUsed: 'Active',
    capabilities: ['Pattern analysis', 'Churn prediction', 'Engagement optimization', 'Feature recommendations'],
    action: 'learning_insights',
  },
  {
    id: 'sentiment-analyzer',
    name: 'Sentiment Analysis',
    description: 'Analyzes user feedback and responses for emotional tone, satisfaction, and actionable insights.',
    icon: Heart,
    status: 'active',
    category: 'Feedback',
    accuracy: 91,
    requestsToday: 0,
    lastUsed: 'Active',
    capabilities: ['Emotion detection', 'Satisfaction scoring', 'Topic extraction', 'Action suggestions'],
    action: 'sentiment_analysis',
  },
  {
    id: 'content-moderator',
    name: 'Content Moderation AI',
    description: 'Automatically screens user submissions for policy violations, spam, and inappropriate content.',
    icon: Eye,
    status: 'active',
    category: 'Security',
    accuracy: 94,
    requestsToday: 0,
    lastUsed: 'Active',
    capabilities: ['Spam detection', 'Policy compliance', 'Content filtering', 'Auto-moderation'],
    action: 'moderate_content',
  },
  {
    id: 'survey-generator',
    name: 'Survey Generation Engine',
    description: 'Creates dynamic, personalized surveys based on user level, category, and previous answers.',
    icon: FileText,
    status: 'active',
    category: 'Content',
    accuracy: 90,
    requestsToday: 0,
    lastUsed: 'Active',
    capabilities: ['Dynamic questions', 'Adaptive difficulty', 'Category-aware', 'Zambian context'],
    action: 'generate_survey',
  },
  {
    id: 'content-verifier',
    name: 'Submission Verifier',
    description: 'AI-powered verification of task submissions including URLs, text responses, and survey answers.',
    icon: CheckCircle2,
    status: 'active',
    category: 'Verification',
    accuracy: 93,
    requestsToday: 0,
    lastUsed: 'Active',
    capabilities: ['URL validation', 'Text analysis', 'Quality scoring', 'Confidence assessment'],
    action: 'verify_content',
  },
  {
    id: 'roadmap-planner',
    name: 'Implementation Roadmap',
    description: 'Generates detailed implementation plans with cost estimates, timelines, and risk assessments.',
    icon: Map,
    status: 'active',
    category: 'Planning',
    accuracy: 88,
    requestsToday: 0,
    lastUsed: 'Active',
    capabilities: ['Cost estimation', 'Timeline planning', 'Risk assessment', 'Phase breakdown'],
    action: 'implementation_roadmap',
  },
  {
    id: 'partnership-generator',
    name: 'Partnership Task Creator',
    description: 'Creates engaging brand partnership tasks tailored to Zambian audiences and campaign types.',
    icon: TrendingUp,
    status: 'active',
    category: 'Business',
    accuracy: 86,
    requestsToday: 0,
    lastUsed: 'Active',
    capabilities: ['Brand matching', 'Task design', 'Audience targeting', 'Campaign optimization'],
    action: 'generate_partnership',
  },
  {
    id: 'user-analyzer',
    name: 'User Behavior Analyzer',
    description: 'Deep analysis of individual user patterns for personalization and churn prevention.',
    icon: Activity,
    status: 'active',
    category: 'Analytics',
    accuracy: 90,
    requestsToday: 0,
    lastUsed: 'Active',
    capabilities: ['Behavior profiling', 'Strength identification', 'Challenge suggestions', 'Churn risk'],
    action: 'analyze_user',
  },
];

export function AIModelsPanel() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const {
    generateSurvey,
    verifyContent,
    recommendTasks,
    moderateContent,
    analyzeUser,
    generatePartnership,
    chatbot,
    analyzeSentiment,
    detectFraud,
    getLearningInsights,
    getImplementationRoadmap,
    loading,
  } = useAI();

  const filteredModels = AI_MODELS.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [...new Set(AI_MODELS.map(m => m.category))];

  const handleTestModel = async (model: AIModel) => {
    setTestResult(null);
    let result: any = null;
    const prompt = testInput.trim() || 'Run a live Boycott AI test with realistic user input.';

    try {
      switch (model.action) {
        case 'generate_survey':
          result = await generateSurvey('market_research', 2, 'research', [prompt]);
          break;
        case 'verify_content':
          result = await verifyContent('text', prompt, 'The answer must be relevant, human, and follow the requested topic closely.');
          break;
        case 'recommend_tasks':
          result = await recommendTasks(3, ['survey', 'video_ad'], [prompt, 'learning', 'gaming'], 'gold');
          break;
        case 'moderate_content':
          result = await moderateContent(prompt, 'text');
          break;
        case 'analyze_user':
          result = await analyzeUser(['survey', 'trivia', 'video_ad'], 6, ['learning', prompt]);
          break;
        case 'generate_partnership':
          result = await generatePartnership('lifestyle', prompt, 'engagement');
          break;
        case 'chatbot':
          result = await chatbot([{ role: 'user', content: prompt }], {
            level: 4,
            vipTier: 'gold',
            totalPoints: 540,
            streak: 8,
          });
          break;
        case 'sentiment_analysis':
          result = await analyzeSentiment(prompt);
          break;
        case 'fraud_detection':
          result = await detectFraud('test-user', 'manual_test', { content: prompt }, { currentStreak: 8, tasksCompletedToday: 3 });
          break;
        case 'learning_insights':
          result = await getLearningInsights('test-user', { description: prompt, sessionDepth: 4, conversionSignal: 'high' });
          break;
        case 'implementation_roadmap':
          result = await getImplementationRoadmap(prompt);
          return;
        default:
          toast.error('This AI model is not wired for testing yet.');
          return;
      }

      if (result) {
        setTestResult(result);
        toast.success('Model test complete!');
      } else {
        toast.error('No result returned');
      }
    } catch (err) {
      toast.error('Test failed');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'training': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'idle': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-3 text-center">
            <Brain className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{AI_MODELS.length}</p>
            <p className="text-[10px] text-muted-foreground">AI Models</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-3 text-center">
            <Zap className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{AI_MODELS.filter(m => m.status === 'active').length}</p>
            <p className="text-[10px] text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-3 text-center">
            <BarChart3 className="w-6 h-6 text-purple-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{categories.length}</p>
            <p className="text-[10px] text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-3 text-center">
            <Activity className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <p className="text-xl font-bold">
              {Math.round(AI_MODELS.reduce((sum, m) => sum + m.accuracy, 0) / AI_MODELS.length)}%
            </p>
            <p className="text-[10px] text-muted-foreground">Avg Accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search AI models..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={searchQuery === '' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setSearchQuery('')}
        >
          All
        </Button>
        {categories.map(cat => (
          <Button
            key={cat}
            variant={searchQuery === cat ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSearchQuery(searchQuery === cat ? '' : cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Model Cards */}
      <div className="grid gap-3 md:grid-cols-2">
        {filteredModels.map((model) => {
          const Icon = model.icon;
          const isSelected = selectedModel === model.id;

          return (
            <Card
              key={model.id}
              className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedModel(isSelected ? null : model.id)}
            >
              <CardHeader className="p-3 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{model.name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[9px] h-4 px-1">
                          {model.category}
                        </Badge>
                        <Badge className={`text-[9px] h-4 px-1 ${getStatusColor(model.status)}`}>
                          {model.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                <p className="text-[11px] text-muted-foreground leading-relaxed">{model.description}</p>
                
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Accuracy</span>
                  <Progress value={model.accuracy} className="h-1.5 flex-1" />
                  <span className="text-[10px] font-medium">{model.accuracy}%</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {model.capabilities.slice(0, 3).map(cap => (
                    <span key={cap} className="text-[9px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">
                      {cap}
                    </span>
                  ))}
                  {model.capabilities.length > 3 && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">
                      +{model.capabilities.length - 3} more
                    </span>
                  )}
                </div>

                {/* Test Panel */}
                {isSelected && (
                  <div className="pt-2 border-t border-border space-y-2" onClick={(e) => e.stopPropagation()}>
                    <p className="text-[10px] font-medium text-primary">Run this model live</p>
                    <Textarea
                      placeholder={
                        model.action === 'chatbot' ? 'Ask Boycott AI anything...' :
                        model.action === 'generate_survey' ? 'Describe the survey topic or audience...' :
                        model.action === 'verify_content' ? 'Paste the content you want verified...' :
                        model.action === 'recommend_tasks' ? 'Type a user interest or earning goal...' :
                        model.action === 'moderate_content' ? 'Paste content to moderate...' :
                        model.action === 'analyze_user' ? 'Describe user behaviour to analyze...' :
                        model.action === 'generate_partnership' ? 'Describe a brand or target audience...' :
                        model.action === 'sentiment_analysis' ? 'Enter feedback text to analyze...' :
                        model.action === 'fraud_detection' ? 'Describe submission to check...' :
                        model.action === 'implementation_roadmap' ? 'Describe feature to plan...' :
                        'Enter test data...'
                      }
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      className="text-xs min-h-[60px]"
                    />
                    <Button
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={() => handleTestModel(model)}
                      disabled={loading}
                    >
                      {loading ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
                      {loading ? 'Processing...' : 'Run Test'}
                    </Button>
                    {testResult && (
                      <pre className="text-[9px] bg-muted p-2 rounded-lg overflow-auto max-h-40">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
