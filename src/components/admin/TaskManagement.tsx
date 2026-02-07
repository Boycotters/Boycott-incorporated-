import { useState } from "react";
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
];

const VERIFICATION_TYPES = [
  { value: 'url', label: 'URL Verification' },
  { value: 'screenshot', label: 'Screenshot Upload' },
  { value: 'quiz', label: 'Quiz/Trivia' },
  { value: 'timer', label: 'Timer Based' },
  { value: 'survey', label: 'Survey' },
  { value: 'data', label: 'Data Entry' },
  { value: 'ai_survey', label: 'AI Survey' },
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

export function TaskManagement({ tasks }: TaskManagementProps) {
  const queryClient = useQueryClient();
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    points_reward: 40,
    category: 'digital',
    difficulty: 'easy',
    verification_type: 'quiz',
    quiz_data: [] as QuizQuestion[]
  });

  const [editQuizData, setEditQuizData] = useState<QuizQuestion[]>([]);

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: async (task: typeof newTask) => {
      const insertData: any = {
        title: task.title,
        description: task.description,
        points_reward: task.points_reward,
        category: task.category,
        difficulty: task.difficulty,
        verification_type: task.verification_type,
        is_active: true,
      };
      
      if (task.quiz_data.length > 0) {
        insertData.quiz_data = task.quiz_data;
      }
      
      const { data, error } = await supabase
        .from('tasks')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Task created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      setAddTaskOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (task: Partial<Task> & { id: string }) => {
      const { id, ...updates } = task;
      const updateData: any = { ...updates };
      if (editQuizData.length > 0) {
        updateData.quiz_data = editQuizData;
      }
      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Task updated');
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      setEditTaskOpen(false);
      setSelectedTask(null);
      setEditQuizData([]);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Toggle task status mutation
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, isActive }: { taskId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ is_active: isActive })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Task status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Task deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setNewTask({
      title: '',
      description: '',
      points_reward: 40,
      category: 'digital',
      difficulty: 'easy',
      verification_type: 'quiz',
      quiz_data: []
    });
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setEditQuizData(task.quiz_data || []);
    setEditTaskOpen(true);
  };

  // Quiz question management for new task
  const addQuestion = () => {
    setNewTask(prev => ({
      ...prev,
      quiz_data: [...prev.quiz_data, { ...DEFAULT_QUESTION }]
    }));
  };

  const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
    setNewTask(prev => ({
      ...prev,
      quiz_data: prev.quiz_data.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const updateQuestionOption = (qIndex: number, optIndex: number, value: string) => {
    setNewTask(prev => ({
      ...prev,
      quiz_data: prev.quiz_data.map((q, i) => 
        i === qIndex ? { ...q, options: q.options.map((o, oi) => oi === optIndex ? value : o) } : q
      )
    }));
  };

  const removeQuestion = (index: number) => {
    setNewTask(prev => ({
      ...prev,
      quiz_data: prev.quiz_data.filter((_, i) => i !== index)
    }));
  };

  // Quiz question management for edit
  const addEditQuestion = () => {
    setEditQuizData(prev => [...prev, { ...DEFAULT_QUESTION }]);
  };

  const updateEditQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
    setEditQuizData(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const updateEditQuestionOption = (qIndex: number, optIndex: number, value: string) => {
    setEditQuizData(prev => prev.map((q, i) => 
      i === qIndex ? { ...q, options: q.options.map((o, oi) => oi === optIndex ? value : o) } : q
    ));
  };

  const removeEditQuestion = (index: number) => {
    setEditQuizData(prev => prev.filter((_, i) => i !== index));
  };

  const QuizQuestionsEditor = ({ 
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
  }) => (
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

  const TaskForm = ({ 
    task, 
    onSubmit, 
    isLoading,
    submitLabel,
    isEdit = false
  }: { 
    task: typeof newTask | Task; 
    onSubmit: () => void; 
    isLoading: boolean;
    submitLabel: string;
    isEdit?: boolean;
  }) => {
    const isNew = !('id' in task);
    const formTask = isNew ? newTask : task as Task;
    const setFormTask = isNew 
      ? setNewTask 
      : (updater: any) => setSelectedTask(prev => prev ? { ...prev, ...updater(prev) } : null);
    
    const showQuizEditor = ['quiz', 'trivia'].includes(
      isNew ? newTask.verification_type : (selectedTask?.verification_type || '')
    ) || ['learning', 'challenge', 'trivia'].includes(
      isNew ? newTask.category : (selectedTask?.category || '')
    );

    return (
      <ScrollArea className="max-h-[70vh]">
        <div className="space-y-4 py-4 pr-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              value={formTask.title}
              onChange={(e) => setFormTask((prev: any) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Complete Daily Trivia Challenge"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="task-description">Description *</Label>
            <Textarea
              id="task-description"
              value={formTask.description || ''}
              onChange={(e) => setFormTask((prev: any) => ({ ...prev, description: e.target.value }))}
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
                value={formTask.points_reward}
                onChange={(e) => setFormTask((prev: any) => ({ ...prev, points_reward: parseInt(e.target.value) || 10 }))}
                min={1}
                max={200}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formTask.category || 'digital'}
                onValueChange={(value) => setFormTask((prev: any) => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
              <Select
                value={formTask.difficulty || 'easy'}
                onValueChange={(value) => setFormTask((prev: any) => ({ ...prev, difficulty: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map(diff => (
                    <SelectItem key={diff.value} value={diff.value}>{diff.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Verification Type</Label>
              <Select
                value={formTask.verification_type || 'quiz'}
                onValueChange={(value) => setFormTask((prev: any) => ({ ...prev, verification_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VERIFICATION_TYPES.map(vt => (
                    <SelectItem key={vt.value} value={vt.value}>{vt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quiz Questions Editor */}
          {showQuizEditor && (
            isEdit ? (
              <QuizQuestionsEditor
                questions={editQuizData}
                onAddQuestion={addEditQuestion}
                onUpdateQuestion={updateEditQuestion}
                onUpdateOption={updateEditQuestionOption}
                onRemoveQuestion={removeEditQuestion}
              />
            ) : (
              <QuizQuestionsEditor
                questions={newTask.quiz_data}
                onAddQuestion={addQuestion}
                onUpdateQuestion={updateQuestion}
                onUpdateOption={updateQuestionOption}
                onRemoveQuestion={removeQuestion}
              />
            )
          )}

          <Button 
            className="w-full" 
            onClick={onSubmit}
            disabled={isLoading || !formTask.title || !formTask.description}
          >
            {isLoading ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </ScrollArea>
    );
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
              Create a task for users to complete and earn points. For quiz tasks, add questions below.
            </DialogDescription>
          </DialogHeader>
          <TaskForm 
            task={newTask}
            onSubmit={() => addTaskMutation.mutate(newTask)}
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
            <TaskForm 
              task={selectedTask}
              onSubmit={() => updateTaskMutation.mutate({ ...selectedTask, quiz_data: editQuizData.length > 0 ? editQuizData : null })}
              isLoading={updateTaskMutation.isPending}
              submitLabel="Save Changes"
              isEdit={true}
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