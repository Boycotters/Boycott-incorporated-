-- Drop old constraint and add new one with survey types
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_verification_type_check;

ALTER TABLE public.tasks ADD CONSTRAINT tasks_verification_type_check 
CHECK (verification_type::text = ANY (ARRAY['instant', 'screenshot', 'url', 'timer', 'survey', 'ai_survey']::text[]));

-- Fix survey/poll tasks to use proper survey verification types
UPDATE public.tasks SET verification_type = 'survey' 
WHERE category = 'survey' AND verification_type IN ('screenshot', 'instant') AND title ILIKE '%survey%';

-- Set poll tasks to use survey verification
UPDATE public.tasks SET verification_type = 'survey' 
WHERE category = 'survey' AND title ILIKE '%poll%';

-- Fix learning quiz/assessment tasks to use ai_survey
UPDATE public.tasks SET verification_type = 'ai_survey' 
WHERE category = 'learning' AND (title ILIKE '%quiz%' OR title ILIKE '%assessment%');