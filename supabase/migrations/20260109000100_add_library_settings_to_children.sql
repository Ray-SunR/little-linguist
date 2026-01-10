-- Add library_settings column to children table for personalized filters/sorts
ALTER TABLE children
ADD COLUMN IF NOT EXISTS library_settings JSONB DEFAULT '{}';

-- Add comment for clarity
COMMENT ON COLUMN children.library_settings IS 'Child-specific preferences for library filters and sorting';
