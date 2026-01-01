-- Delete duplicate user_task entries keeping only the latest one
DELETE FROM user_tasks a
USING user_tasks b
WHERE a.user_id = b.user_id 
  AND a.task_id = b.task_id 
  AND a.created_at < b.created_at;

-- Now add the unique constraint
ALTER TABLE user_tasks ADD CONSTRAINT user_tasks_user_id_task_id_key UNIQUE (user_id, task_id);