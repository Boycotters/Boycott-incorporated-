-- Clean up orphaned video views that reference deleted videos
DELETE FROM user_video_views 
WHERE video_id NOT IN (SELECT id FROM videos);