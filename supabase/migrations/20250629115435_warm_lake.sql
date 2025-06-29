/*
  # Add mood tracking and feelings storage

  1. New Tables
    - `moods`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, foreign key to conversations)
      - `mood_type` (text, the selected mood)
      - `intensity` (integer, 1-5 scale)
      - `description` (text, optional user description)
      - `created_at` (timestamp)
    - `mood_entries`
      - `id` (uuid, primary key)
      - `user_id` (text, user identifier)
      - `mood_type` (text, primary mood)
      - `secondary_moods` (text array, additional moods)
      - `intensity` (integer, 1-5 scale)
      - `notes` (text, user's feelings description)
      - `triggers` (text array, what caused the mood)
      - `created_at` (timestamp)
      - `date` (date, for daily tracking)

  2. Security
    - Enable RLS on both tables
    - Add policies for public access (temporary)

  3. Indexes
    - Performance indexes for mood queries and date-based lookups
*/

-- Create moods table for conversation-specific moods
CREATE TABLE IF NOT EXISTS moods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  mood_type text NOT NULL,
  intensity integer NOT NULL CHECK (intensity >= 1 AND intensity <= 5),
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create mood_entries table for comprehensive mood tracking
CREATE TABLE IF NOT EXISTS mood_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL DEFAULT 'anonymous',
  mood_type text NOT NULL,
  secondary_moods text[] DEFAULT '{}',
  intensity integer NOT NULL CHECK (intensity >= 1 AND intensity <= 5),
  notes text,
  triggers text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  date date DEFAULT CURRENT_DATE
);

-- Enable Row Level Security
ALTER TABLE moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
DO $$
BEGIN
  -- Drop existing policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'moods' 
    AND policyname = 'Allow public access to moods'
  ) THEN
    DROP POLICY "Allow public access to moods" ON moods;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mood_entries' 
    AND policyname = 'Allow public access to mood_entries'
  ) THEN
    DROP POLICY "Allow public access to mood_entries" ON mood_entries;
  END IF;
END $$;

CREATE POLICY "Allow public access to moods"
  ON moods
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access to mood_entries"
  ON mood_entries
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_moods_conversation_id 
  ON moods (conversation_id);

CREATE INDEX IF NOT EXISTS idx_moods_created_at 
  ON moods (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id 
  ON mood_entries (user_id);

CREATE INDEX IF NOT EXISTS idx_mood_entries_date 
  ON mood_entries (date DESC);

CREATE INDEX IF NOT EXISTS idx_mood_entries_mood_type 
  ON mood_entries (mood_type);

CREATE INDEX IF NOT EXISTS idx_mood_entries_created_at 
  ON mood_entries (created_at DESC);