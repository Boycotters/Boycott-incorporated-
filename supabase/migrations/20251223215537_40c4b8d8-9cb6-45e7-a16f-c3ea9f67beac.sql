-- Delete existing tasks and insert fresh ones with modern slang
DELETE FROM tasks;

INSERT INTO tasks (title, description, points_reward, category, difficulty, is_active) VALUES
-- Social Tasks
('Drop a Fire Comment 🔥', 'Leave a comment that slaps on our featured post. Show some love fr fr!', 35, 'social', 'easy', true),
('Share the Vibes ✨', 'Repost our content to your story. Spread the word, no cap!', 50, 'social', 'easy', true),
('Follow Spree Era 👀', 'Follow 3 of our partner accounts. Build that network bestie!', 45, 'social', 'easy', true),
('Tag a Bestie Challenge', 'Tag your ride-or-die in our latest post. Friendship goals!', 40, 'social', 'easy', true),
('Create Content That Hits 📸', 'Post about us with #PointsGang. Main character energy only!', 150, 'social', 'hard', true),

-- Gaming Tasks
('Gaming Grind Session 🎮', 'Play our mini-game and score 500+. Whether you are a noob or goated, we see you!', 75, 'gaming', 'medium', true),
('Beat the High Score 🏆', 'Top the leaderboard this week. Built different energy required!', 200, 'gaming', 'hard', true),
('Quick Match Wins ⚡', 'Win 3 quick matches in a row. EZ claps or sweaty palms, your choice!', 100, 'gaming', 'medium', true),
('Daily Gaming Check-in', 'Log into the game zone daily. Consistency is bussin!', 25, 'gaming', 'easy', true),

-- Lifestyle Tasks
('Wellness Check Slay 💅', 'Complete your daily wellness survey. Self-care is not selfish!', 40, 'lifestyle', 'easy', true),
('Glow Up Goals ✨', 'Share your morning routine with us. Aesthetic vibes only!', 80, 'lifestyle', 'medium', true),
('Fitness Check No Cap 💪', 'Log 5000 steps today. Touch grass and get paid for it!', 100, 'lifestyle', 'medium', true),
('Mindful Moment Era 🧘', 'Complete a 5-min meditation session. Inner peace hits different!', 60, 'lifestyle', 'easy', true),

-- Shopping Tasks  
('Shopping Spree Intel 🛍️', 'Rate your last ShopRite experience. Help the community find the real ones!', 45, 'shopping', 'easy', true),
('Deal Hunter Status 🔍', 'Find and share the best deal this week. Secure the bag mentality!', 90, 'shopping', 'medium', true),
('Receipt Upload Flex 🧾', 'Upload a receipt from partner stores. Proof you understood the assignment!', 70, 'shopping', 'easy', true),
('Mystery Shopper Vibes 🕵️', 'Complete a mystery shopping mission. Undercover bestie mode activated!', 175, 'shopping', 'hard', true),

-- Learning Tasks
('Knowledge Check Era 📚', 'Take this quick quiz. Big brain energy only, you got this!', 55, 'learning', 'easy', true),
('Course Completion Grind 🎓', 'Finish a mini learning module. Invest in yourself king/queen!', 120, 'learning', 'medium', true),
('Skill Unlock Achievement 🔓', 'Master a new skill and get certified. Resume glow up loading!', 180, 'learning', 'hard', true),
('Daily Brain Teaser 🧠', 'Solve today puzzle. Smart is the new sexy!', 30, 'learning', 'easy', true),

-- Quick Tasks
('Daily Check-in Slay 💫', 'Open the app and vibe with us daily. Consistency is key bestie!', 25, 'quick', 'easy', true),
('Quick Win No Cap ⚡', 'Tap the daily bonus button. Even your gogo could do this one!', 15, 'quick', 'easy', true),
('Profile Glow Up 📱', 'Update your profile pic or bio. First impressions matter!', 35, 'quick', 'easy', true),
('Notification Squad 🔔', 'Enable push notifications. Stay in the loop, never miss a W!', 20, 'quick', 'easy', true),

-- Challenge Tasks
('Level Up Challenge 🚀', 'Complete 5 tasks in one day. Prove you are built different!', 200, 'challenge', 'hard', true),
('Streak Master Mode 🔥', 'Maintain a 7-day login streak. Dedication is underrated!', 175, 'challenge', 'hard', true),
('Referral Legend Status 👑', 'Get 3 friends to join. Networking but make it fun!', 150, 'challenge', 'medium', true),
('Points Millionaire Dream 💰', 'Earn 1000 points in a week. Grind now, flex later!', 250, 'challenge', 'hard', true),

-- Survey Tasks
('Survey Says... 📊', 'Spill the tea in our quick survey. Your opinions lowkey matter!', 50, 'survey', 'easy', true),
('Deep Dive Feedback 💭', 'Complete our detailed feedback form. Help us understand the vibe!', 100, 'survey', 'medium', true),
('Product Review Realness ⭐', 'Review a product you tried. Keep it 100, we appreciate honesty!', 75, 'survey', 'easy', true),

-- Video Ad Tasks
('Watch & Win Era 📺', 'Peep this short video. 30 seconds of your time, points in your pocket!', 30, 'video_ad', 'easy', true),
('Ad Marathon Grind 🎬', 'Watch 5 videos in one session. Multitask or focus, you do you!', 100, 'video_ad', 'medium', true),
('Brand Story Time 📖', 'Watch a brand story video. Learn about the people behind the products!', 45, 'video_ad', 'easy', true),

-- App Install Tasks
('App Discovery Mission 📲', 'Try out a partner app for 5 mins. Might find your new fave!', 80, 'app_install', 'easy', true),
('Power User Energy ⚡', 'Use a partner app for 3 days. Commitment issues who?', 150, 'app_install', 'medium', true),
('App Review Honest Era 💯', 'Rate and review a partner app. Your feedback shapes the future!', 65, 'app_install', 'easy', true);