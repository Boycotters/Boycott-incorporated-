-- Create videos table for TikTok-style video feed
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 30,
  points_reward INTEGER NOT NULL DEFAULT 5,
  category TEXT NOT NULL DEFAULT 'entertainment',
  source TEXT NOT NULL DEFAULT 'partner' CHECK (source IN ('admin', 'partner', 'ai')),
  partner_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create user_video_views to track which videos users have watched
CREATE TABLE public.user_video_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  watch_duration_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, video_id)
);

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_video_views ENABLE ROW LEVEL SECURITY;

-- Videos are viewable by all authenticated users
CREATE POLICY "Videos are viewable by authenticated users" 
ON public.videos 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Only admins can insert/update/delete videos (using service role or specific admin check)
CREATE POLICY "Admins can manage videos" 
ON public.videos 
FOR ALL 
USING (auth.uid() = created_by);

-- Users can view their own video history
CREATE POLICY "Users can view their own video history" 
ON public.user_video_views 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own video views
CREATE POLICY "Users can insert their own video views" 
ON public.user_video_views 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own video views
CREATE POLICY "Users can update their own video views" 
ON public.user_video_views 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to complete video watch and award points
CREATE OR REPLACE FUNCTION public.complete_video_watch(
  p_user_id UUID,
  p_video_id UUID,
  p_watch_duration INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_video RECORD;
  v_existing_view RECORD;
  v_points_to_award INTEGER;
BEGIN
  -- Get video details
  SELECT * INTO v_video FROM videos WHERE id = p_video_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Video not found');
  END IF;
  
  -- Check if already watched and completed
  SELECT * INTO v_existing_view FROM user_video_views 
  WHERE user_id = p_user_id AND video_id = p_video_id;
  
  IF FOUND AND v_existing_view.completed THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already watched this video', 'already_completed', true);
  END IF;
  
  -- Calculate points (must watch at least 80% of video)
  IF p_watch_duration >= (v_video.duration_seconds * 0.8) THEN
    v_points_to_award := v_video.points_reward;
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Please watch the full video to earn points');
  END IF;
  
  -- Insert or update view record
  INSERT INTO user_video_views (user_id, video_id, watch_duration_seconds, completed, points_awarded)
  VALUES (p_user_id, p_video_id, p_watch_duration, true, v_points_to_award)
  ON CONFLICT (user_id, video_id) 
  DO UPDATE SET 
    watch_duration_seconds = EXCLUDED.watch_duration_seconds,
    completed = true,
    points_awarded = v_points_to_award,
    watched_at = now();
  
  -- Update video view count
  UPDATE videos SET view_count = view_count + 1 WHERE id = p_video_id;
  
  -- Award points to user wallet
  UPDATE wallets 
  SET available_points = available_points + v_points_to_award
  WHERE user_id = p_user_id;
  
  -- Update user total points
  UPDATE users 
  SET total_points = total_points + v_points_to_award
  WHERE id = p_user_id;
  
  -- Log transaction
  INSERT INTO transactions (user_id, amount, type, description, reference_id)
  VALUES (p_user_id, v_points_to_award, 'earn', 'Watched video: ' || v_video.title, p_video_id);
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Points awarded!', 
    'points', v_points_to_award,
    'video_title', v_video.title
  );
END;
$$;

-- Insert some sample videos
INSERT INTO public.videos (title, description, video_url, duration_seconds, points_reward, category, source, partner_name) VALUES
('Welcome to Earniverse', 'Learn how to maximize your earnings on our platform', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 30, 10, 'tutorial', 'admin', NULL),
('Quick Tips for More Points', 'Top 5 ways to earn faster', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 45, 15, 'tutorial', 'admin', NULL),
('Partner Spotlight: TechBrand', 'Discover amazing deals from TechBrand', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 20, 8, 'partner', 'partner', 'TechBrand'),
('Fun Facts Friday', 'Interesting facts that will blow your mind', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 25, 5, 'entertainment', 'admin', NULL),
('Daily Motivation', 'Start your day with positive energy', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 30, 5, 'entertainment', 'admin', NULL);