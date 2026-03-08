
-- Create storage buckets for task proofs and content submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('task-proofs', 'task-proofs', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('content-submissions', 'content-submissions', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for task-proofs bucket
CREATE POLICY "Users can upload task proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view task proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-proofs');

CREATE POLICY "Admins can delete task proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-proofs' AND public.is_admin(auth.uid()));

-- RLS policies for content-submissions bucket
CREATE POLICY "Users can upload content submissions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'content-submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own content submissions"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'content-submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all content submissions"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'content-submissions' AND public.is_admin(auth.uid()));

-- GPS locations table for tracking user movement
CREATE TABLE public.user_gps_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  altitude double precision,
  speed double precision,
  heading double precision,
  horizontal_accuracy double precision,
  vertical_accuracy double precision,
  timestamp timestamptz NOT NULL DEFAULT now(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  is_partnered_task boolean DEFAULT false,
  session_id text,
  device_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX idx_user_gps_user_id ON public.user_gps_locations(user_id);
CREATE INDEX idx_user_gps_timestamp ON public.user_gps_locations(timestamp DESC);
CREATE INDEX idx_user_gps_session ON public.user_gps_locations(session_id) WHERE session_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.user_gps_locations ENABLE ROW LEVEL SECURITY;

-- Users can insert their own GPS data
CREATE POLICY "Users can insert own GPS data"
ON public.user_gps_locations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own GPS data
CREATE POLICY "Users can view own GPS data"
ON public.user_gps_locations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all GPS data (for real-time tracking)
CREATE POLICY "Admins can view all GPS data"
ON public.user_gps_locations FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admins can delete GPS data
CREATE POLICY "Admins can delete GPS data"
ON public.user_gps_locations FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
