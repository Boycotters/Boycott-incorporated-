-- Fix transactions_type_check to include 'game' type
ALTER TABLE public.transactions DROP CONSTRAINT transactions_type_check;

ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN (
  'earn', 
  'cashout', 
  'withdrawal', 
  'refund', 
  'task_completion', 
  'daily_bonus', 
  'streak_recovery', 
  'streak_milestone', 
  'achievement', 
  'referral_bonus', 
  'survey_completion', 
  'video_reward', 
  'tier_upgrade', 
  'redemption', 
  'redeem',
  'game',
  'game_reward',
  'tournament_prize'
));