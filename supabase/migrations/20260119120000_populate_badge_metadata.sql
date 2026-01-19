-- Add icon_path and criteria to badges table if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'badges' AND column_name = 'icon_path') THEN
        ALTER TABLE public.badges ADD COLUMN icon_path TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'badges' AND column_name = 'criteria') THEN
        ALTER TABLE public.badges ADD COLUMN criteria TEXT;
    END IF;
END $$;

-- Populate or Update Badges
INSERT INTO public.badges (id, name, description, rarity, icon_path, criteria)
VALUES 
    ('reading_ace', 'Reading Ace', 'Opened your very first book!', 'basic', '/images/badges/reading_ace.png', 'Open any storybook in the library'),
    ('word_master', 'Word Master', 'Mastered 50 new words!', 'rare', '/images/badges/word_master.png', 'Master 50 words in your Data Bank'),
    ('creation_wizard', 'Creation Wizard', 'Created 5 magical stories!', 'epic', '/images/badges/creation_wizard.png', 'Use the Story Maker to create 5 original stories'),
    ('streak_hero', 'Streak Hero', '7 days of reading in a row!', 'legendary', '/images/badges/streak_hero.png', 'Read at least one book every day for a week'),
    ('night_owl', 'Night Owl', 'Reading is better under the stars.', 'rare', '/images/badges/night_owl.png', 'Finish a book after 8:00 PM'),
    ('early_bird', 'Early Bird', 'Morning sunshine and stories!', 'rare', '/images/badges/early_bird.png', 'Read a book before 8:00 AM')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    rarity = EXCLUDED.rarity,
    icon_path = EXCLUDED.icon_path,
    criteria = EXCLUDED.criteria;
