import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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

interface Task {
  id: string;
  title: string;
  description: string | null;
  points_reward: number;
  category: string | null;
  difficulty: string | null;
  verification_type: string | null;
  is_active: boolean | null;
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

export function TaskManagement({ tasks }: TaskManagementProps) {
  const queryClient = useQueryClient();
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    points_reward: 20,
    category: 'digital',
    difficulty: 'easy',
    verification_type: 'quiz'
  });

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: async (task: typeof newTask) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          is_active: true,
        })
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
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Task updated');
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      setEditTaskOpen(false);
      setSelectedTask(null);
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
      points_reward: 20,
      category: 'digital',
      difficulty: 'easy',
      verification_type: 'quiz'
    });
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setEditTaskOpen(true);
  };

  const TaskForm = ({ 
    task, 
    onSubmit, 
    isLoading,
    submitLabel 
  }: { 
    task: typeof newTask | Task; 
    onSubmit: () => void; 
    isLoading: boolean;
    submitLabel: string;
  }) => {
    const isNew = !('id' in task);
    const formTask = isNew ? newTask : task as Task;
    const setFormTask = isNew 
      ? setNewTask 
      : (updater: any) => setSelectedTask(prev => prev ? { ...prev, ...updater(prev) } : null);

    return (
      <div className="space-y-4 py-4">
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
              max={100}
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

        <Button 
          className="w-full" 
          onClick={onSubmit}
          disabled={isLoading || !formTask.title || !formTask.description}
        >
          {isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Create a task for users to complete and earn points. Choose the appropriate category and verification type.
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details. Changes will be applied immediately.
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <TaskForm 
              task={selectedTask}
              onSubmit={() => updateTaskMutation.mutate(selectedTask)}
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
