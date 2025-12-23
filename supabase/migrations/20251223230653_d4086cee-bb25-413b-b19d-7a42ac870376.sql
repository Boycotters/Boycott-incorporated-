-- Add verification_type to tasks table
ALTER TABLE public.tasks 
ADD COLUMN verification_type varchar DEFAULT 'instant' CHECK (verification_type IN ('instant', 'screenshot', 'url', 'timer'));

-- Add verification columns to user_tasks
ALTER TABLE public.user_tasks 
ADD COLUMN proof_url text,
ADD COLUMN proof_submitted_at timestamp without time zone,
ADD COLUMN verification_notes text,
ADD COLUMN timer_started_at timestamp without time zone;

-- Create storage bucket for task proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('task-proofs', 'task-proofs', false);

-- RLS policies for task-proofs bucket
CREATE POLICY "Users can upload their own proofs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'task-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own proofs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'task-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own proofs" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'task-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update existing tasks with appropriate verification types based on category
UPDATE public.tasks SET verification_type = 'screenshot' WHERE category IN ('social', 'gaming');
UPDATE public.tasks SET verification_type = 'url' WHERE category IN ('shopping', 'lifestyle');
UPDATE public.tasks SET verification_type = 'timer' WHERE category IN ('video_ad', 'learning');
UPDATE public.tasks SET verification_type = 'instant' WHERE category IN ('quick', 'survey');