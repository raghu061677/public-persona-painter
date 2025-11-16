-- Add tour_completed column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT FALSE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_tour_completed ON profiles(tour_completed);