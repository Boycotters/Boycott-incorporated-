import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit, ChevronDown, ChevronUp, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  points_reward: number;
  category: string | null;
  difficulty: string | null;
  verification_type: string | null;
  is_active: boolean | null;
  quiz_data?: QuizQuestion[] | null;
}

interface TaskManagementProps {
  tasks: Task[];
}

const CATEGORIES = [
  { value: 'digital', label: 'Digital' },
  { value: 'physical', label: 'Physical' },
  { value: 'survey', label: 'Survey' },
  { value: 'partnership', label: 'Partnership (AI Partnered)' },
  { value: 'social', label: 'Social' },
  { value: 'learning', label: 'Learning' },
  { value: 'challenge', label: 'Challenge' },
  { value: 'trivia', label: 'Trivia' },
  { value: 'photo', label: 'Photo Verification' },
  { value: 'video_ad', label: 'Video Ad' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'market_research', label: 'Market Research' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'app_install', label: 'App Install' },
];

const PAGE_PLACEMENTS = [
  { value: 'earn', label: 'Earn Page' },
  { value: 'discover', label: 'Discover Page' },
  { value: 'home', label: 'Home Page' },
  { value: 'all', label: 'All Pages' },
];

const VERIFICATION_TYPES = [
  { value: 'url', label: 'URL Verification' },
  { value: 'screenshot', label: 'Screenshot Upload' },
  { value: 'quiz', label: 'Quiz/Trivia' },
  { value: 'timer', label: 'Timer Based' },
  { value: 'survey', label: 'Survey' },
  { value: 'data', label: 'Data Entry' },
  { value: 'ai_survey', label: 'AI Survey' },
  { value: 'gps', label: 'GPS Location' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const DEFAULT_QUESTION: QuizQuestion = {
  question: '',
  options: ['', '', '', ''],
  correct_answer: 0
};

// ==========================================
// Extracted QuizQuestionsEditor component
// ==========================================
function QuizQuestionsEditor({ 
  questions, 
  onAddQuestion, 
  onUpdateQuestion, 
  onUpdateOption, 
  onRemoveQuestion 
}: {
  questions: QuizQuestion[];
  onAddQuestion: () => void;
  onUpdateQuestion: (index: number, field: keyof QuizQuestion, value: any) => void;
  onUpdateOption: (qIndex: number, optIndex: number, value: string) => void;
  onRemoveQuestion: (index: number) => void;
}) {
  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4" />
          Quiz Questions ({questions.length})
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={onAddQuestion}>
          <Plus className="w-3 h-3 mr-1" />
          Add Question
        </Button>
      </div>
      
      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No questions added. Click "Add Question" to create quiz content.
        </p>
      )}
      
      <ScrollArea className="max-h-[300px]">
        <div className="space-y-4 pr-2">
          {questions.map((q, qIndex) => (
            <Card key={qIndex} className="p-3 bg-muted/50">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Label className="text-xs font-medium">Question {qIndex + 1}</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => onRemoveQuestion(qIndex)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                
                <Input
                  placeholder="Enter question..."
                  value={q.question}
                  onChange={(e) => onUpdateQuestion(qIndex, 'question', e.target.value)}
                  className="text-sm"
                />
                
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={q.correct_answer === optIndex}
                        onChange={() => onUpdateQuestion(qIndex, 'correct_answer', optIndex)}
                        className="w-4 h-4"
                      />
                      <Input
                        placeholder={`Option ${optIndex + 1}`}
                        value={opt}
                        onChange={(e) => onUpdateOption(qIndex, optIndex, e.target.value)}
                        className={`text-sm flex-1 ${q.correct_answer === optIndex ? 'border-green-500' : ''}`}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">Select the radio button for the correct answer</p>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ==========================================
// Extracted TaskFormContent component
// ==========================================
function TaskFormContent({ 
  title, description, points_reward, category, difficulty, verification_type, page_placement,
  quizData,
  onFieldChange,
  onQuizAdd, onQuizUpdate, onQuizOptionUpdate, onQuizRemove,
  onSubmit, isLoading, submitLabel
}: {
  title: string;
  description: string;
  points_reward: number;
  category: string;
  difficulty: string;
  verification_type: string;
  page_placement: string;
  quizData: QuizQuestion[];
  onFieldChange: (field: string, value: any) => void;
  onQuizAdd: () => void;
  onQuizUpdate: (index: number, field: keyof QuizQuestion, value: any) => void;
  onQuizOptionUpdate: (qIndex: number, optIndex: number, value: string) => void;
  onQuizRemove: (index: number) => void;
  onSubmit: () => void;
  isLoading: boolean;
  submitLabel: string;
}) {
  const showQuizEditor = ['quiz', 'trivia'].includes(verification_type) || 
    ['learning', 'challenge', 'trivia'].includes(category);

  return (
    <ScrollArea className="max-h-[70vh]">
      <div className="space-y-4 py-4 pr-4">
        <div className="space-y-2">
          <Label htmlFor="task-title">Title *</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => onFieldChange('title', e.target.value)}
            placeholder="e.g., Complete Daily Trivia Challenge"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="task-description">Description *</Label>
          <Textarea
            id="task-description"
            value={description}
            onChange={(e) => onFieldChange('description', e.target.value)}
            placeholder="Detailed instructions for completing the task..."
            rows={3}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="task-points">Points Reward</Label>
            <Input
              id="task-points"
              type="number"
              value={points_reward}
              onChange={(e) => onFieldChange('points_reward', parseInt(e.target.value) || 10)}
              min={1}
              max={200}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => onFieldChange('category', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={(v) => onFieldChange('difficulty', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map(diff => (
                  <SelectItem key={diff.value} value={diff.value}>{diff.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Verification Type</Label>
            <Select value={verification_type} onValueChange={(v) => onFieldChange('verification_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VERIFICATION_TYPES.map(vt => (
                  <SelectItem key={vt.value} value={vt.value}>{vt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Show on Page</Label>
          <Select value={page_placement} onValueChange={(v) => onFieldChange('page_placement', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_PLACEMENTS.map(pp => (
                <SelectItem key={pp.value} value={pp.value}>{pp.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showQuizEditor && (
          <QuizQuestionsEditor
            questions={quizData}
            onAddQuestion={onQuizAdd}
            onUpdateQuestion={onQuizUpdate}
            onUpdateOption={onQuizOptionUpdate}
            onRemoveQuestion={onQuizRemove}
          />
        )}

        <Button 
          className="w-full" 
          onClick={onSubmit}
          disabled={isLoading || !title || !description}
        >
          {isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </ScrollArea>
  );
}

// ==========================================
// Main TaskManagement component
// ==========================================
export function TaskManagement({ tasks }: TaskManagementProps) {
  const queryClient = useQueryClient();
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPoints, setNewPoints] = useState(40);
  const [newCategory, setNewCategory] = useState('digital');
  const [newDifficulty, setNewDifficulty] = useState('easy');
  const [newVerification, setNewVerification] = useState('quiz');
  const [newPlacement, setNewPlacement] = useState('earn');
  const [newQuizData, setNewQuizData] = useState<QuizQuestion[]>([]);

  // Edit task form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPoints, setEditPoints] = useState(40);
  const [editCategory, setEditCategory] = useState('digital');
  const [editDifficulty, setEditDifficulty] = useState('easy');
  const [editVerification, setEditVerification] = useState('quiz');
  const [editPlacement, setEditPlacement] = useState('earn');
  const [editQuizData, setEditQuizData] = useState<QuizQuestion[]>([]);

  const handleNewFieldChange = useCallback((field: string, value: any) => {
    switch (field) {
      case 'title': setNewTitle(value); break;
      case 'description': setNewDescription(value); break;
      case 'points_reward': setNewPoints(value); break;
      case 'category': setNewCategory(value); break;
      case 'difficulty': setNewDifficulty(value); break;
      case 'verification_type': setNewVerification(value); break;
      case 'page_placement': setNewPlacement(value); break;
    }
  }, []);

  const handleEditFieldChange = useCallback((field: string, value: any) => {
    switch (field) {
      case 'title': setEditTitle(value); break;
      case 'description': setEditDescription(value); break;
      case 'points_reward': setEditPoints(value); break;
      case 'category': setEditCategory(value); break;
      case 'difficulty': setEditDifficulty(value); break;
      case 'verification_type': setEditVerification(value); break;
      case 'page_placement': setEditPlacement(value); break;
    }
  }, []);

  // Quiz question management for new task
  const addNewQuestion = useCallback(() => {
    setNewQuizData(prev => [...prev, { ...DEFAULT_QUESTION }]);
  }, []);
  const updateNewQuestion = useCallback((index: number, field: keyof QuizQuestion, value: any) => {
    setNewQuizData(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  }, []);
  const updateNewQuestionOption = useCallback((qIndex: number, optIndex: number, value: string) => {
    setNewQuizData(prev => prev.map((q, i) => i === qIndex ? { ...q, options: q.options.map((o, oi) => oi === optIndex ? value : o) } : q));
  }, []);
  const removeNewQuestion = useCallback((index: number) => {
    setNewQuizData(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Quiz question management for edit
  const addEditQuestion = useCallback(() => {
    setEditQuizData(prev => [...prev, { ...DEFAULT_QUESTION }]);
  }, []);
  const updateEditQuestion = useCallback((index: number, field: keyof QuizQuestion, value: any) => {
    setEditQuizData(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  }, []);
  const updateEditQuestionOption = useCallback((qIndex: number, optIndex: number, value: string) => {
    setEditQuizData(prev => prev.map((q, i) => i === qIndex ? { ...q, options: q.options.map((o, oi) => oi === optIndex ? value : o) } : q));
  }, []);
  const removeEditQuestion = useCallback((index: number) => {
    setEditQuizData(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: async () => {
      const insertData: any = {
        title: newTitle,
        description: newDescription,
        points_reward: newPoints,
        category: newCategory,
        difficulty: newDifficulty,
        verification_type: newVerification,
        page_placement: newPlacement,
        is_active: true,
      };
      if (newQuizData.length > 0) {
        insertData.quiz_data = newQuizData;
      }
      const { error } = await supabase.from('tasks').insert(insertData).select().single();
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Task created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      setAddTaskOpen(false);
      resetNewForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTask) return;
      const updateData: any = {
        title: editTitle,
        description: editDescription,
        points_reward: editPoints,
        category: editCategory,
        difficulty: editDifficulty,
        verification_type: editVerification,
        page_placement: editPlacement,
      };
      if (editQuizData.length > 0) {
        updateData.quiz_data = editQuizData;
      }
      const { error } = await supabase.from('tasks').update(updateData).eq('id', selectedTask.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Task updated');
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      setEditTaskOpen(false);
      setSelectedTask(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Toggle task status
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, isActive }: { taskId: string; isActive: boolean }) => {
      const { error } = await supabase.from('tasks').update({ is_active: isActive }).eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Task status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Delete task
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Task deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetNewForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewPoints(40);
    setNewCategory('digital');
    setNewDifficulty('easy');
    setNewVerification('quiz');
    setNewPlacement('earn');
    setNewQuizData([]);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPoints(task.points_reward);
    setEditCategory(task.category || 'digital');
    setEditDifficulty(task.difficulty || 'easy');
    setEditVerification(task.verification_type || 'quiz');
    setEditPlacement((task as any).page_placement || 'earn');
    setEditQuizData(task.quiz_data || []);
    setEditTaskOpen(true);
  };

  return (
    <div className="space-y-3">
      {/* Add Task Button */}
      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogTrigger asChild>
          <Button className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Create New Task
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Create a task for users to complete and earn points.
            </DialogDescription>
          </DialogHeader>
          <TaskFormContent
            title={newTitle}
            description={newDescription}
            points_reward={newPoints}
            category={newCategory}
            difficulty={newDifficulty}
            verification_type={newVerification}
            page_placement={newPlacement}
            quizData={newQuizData}
            onFieldChange={handleNewFieldChange}
            onQuizAdd={addNewQuestion}
            onQuizUpdate={updateNewQuestion}
            onQuizOptionUpdate={updateNewQuestionOption}
            onQuizRemove={removeNewQuestion}
            onSubmit={() => addTaskMutation.mutate()}
            isLoading={addTaskMutation.isPending}
            submitLabel="Create Task"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editTaskOpen} onOpenChange={setEditTaskOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details. Changes will be applied immediately.
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <TaskFormContent
              title={editTitle}
              description={editDescription}
              points_reward={editPoints}
              category={editCategory}
              difficulty={editDifficulty}
              verification_type={editVerification}
              page_placement={editPlacement}
              quizData={editQuizData}
              onFieldChange={handleEditFieldChange}
              onQuizAdd={addEditQuestion}
              onQuizUpdate={updateEditQuestion}
              onQuizOptionUpdate={updateEditQuestionOption}
              onQuizRemove={removeEditQuestion}
              onSubmit={() => updateTaskMutation.mutate()}
              isLoading={updateTaskMutation.isPending}
              submitLabel="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Task List */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No tasks created yet. Add your first task above.</p>
          </CardContent>
        </Card>
      ) : (
        tasks.map((task) => (
          <Card key={task.id} className="overflow-hidden">
            <Collapsible 
              open={expandedTask === task.id}
              onOpenChange={(open) => setExpandedTask(open ? task.id : null)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold truncate">{task.title}</p>
                      <Badge variant="outline" className="shrink-0">{task.category}</Badge>
                      <Badge variant="secondary" className="shrink-0">{task.difficulty}</Badge>
                      {task.category === 'partnership' && (
                        <Badge className="bg-purple-500/10 text-purple-600 shrink-0">Partnered</Badge>
                      )}
                      {task.quiz_data && task.quiz_data.length > 0 && (
                        <Badge variant="outline" className="shrink-0 text-blue-600 border-blue-300">
                          <HelpCircle className="w-3 h-3 mr-1" />
                          {task.quiz_data.length} Q
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm font-medium text-primary">+{task.points_reward} pts</span>
                      <Badge variant="outline" className="text-xs">{task.verification_type}</Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={task.is_active ?? false}
                      onCheckedChange={(checked) => toggleTaskMutation.mutate({ taskId: task.id, isActive: checked })}
                    />
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        {expandedTask === task.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>

                <CollapsibleContent className="pt-4 border-t mt-4">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                    
                    {task.quiz_data && task.quiz_data.length > 0 && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs font-medium mb-2">Quiz Preview:</p>
                        {task.quiz_data.slice(0, 2).map((q: QuizQuestion, i: number) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            {i + 1}. {q.question}
                          </p>
                        ))}
                        {task.quiz_data.length > 2 && (
                          <p className="text-xs text-muted-foreground">...and {task.quiz_data.length - 2} more</p>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="gap-1"
                        onClick={() => handleEditTask(task)}
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        className="gap-1"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this task?')) {
                            deleteTaskMutation.mutate(task.id);
                          }
                        }}
                        disabled={deleteTaskMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </CardContent>
            </Collapsible>
          </Card>
        ))
      )}
    </div>
  );
}
