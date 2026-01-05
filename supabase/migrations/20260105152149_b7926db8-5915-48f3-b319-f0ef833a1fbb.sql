-- Fix remaining survey tasks with instant verification
UPDATE public.tasks SET verification_type = 'survey' 
WHERE category = 'survey' AND verification_type = 'instant';