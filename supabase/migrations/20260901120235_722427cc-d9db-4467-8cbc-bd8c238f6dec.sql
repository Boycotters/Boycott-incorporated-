
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_verification_type_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_verification_type_check
  CHECK (verification_type IN ('instant','data','screenshot','url','timer','survey','ai_survey','quiz','gps','article'));
