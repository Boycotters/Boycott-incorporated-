-- Create storage bucket for entertainment videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('entertainment-videos', 'entertainment-videos', true, 104857600, ARRAY['video/mp4', 'video/webm', 'video/mov', 'video/avi', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the videos bucket
CREATE POLICY "Admins can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'entertainment-videos' 
  AND EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can update videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'entertainment-videos' 
  AND EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can delete videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'entertainment-videos' 
  AND EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

CREATE POLICY "Anyone can view entertainment videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'entertainment-videos');

-- Add user_id to survey_responses if not exists (for tracking who completed each survey)
ALTER TABLE survey_responses 
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Create trigger to auto-populate user info on survey submission
CREATE OR REPLACE FUNCTION public.populate_survey_user_info()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    SELECT email, full_name INTO NEW.user_email, NEW.user_name
    FROM users
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop if exists and recreate trigger
DROP TRIGGER IF EXISTS survey_user_info_trigger ON survey_responses;
CREATE TRIGGER survey_user_info_trigger
  BEFORE INSERT ON survey_responses
  FOR EACH ROW
  EXECUTE FUNCTION populate_survey_user_info();

-- Backfill existing survey responses with user info
UPDATE survey_responses sr
SET 
  user_email = u.email,
  user_name = u.full_name
FROM users u
WHERE sr.user_id = u.id
AND sr.user_email IS NULL;