/*
  # Create chat application schema

  1. New Tables
    - `conversations`
      - `id` (uuid, primary key)
      - `title` (text, default 'New Conversation')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `user_id` (text, default 'anonymous')
    - `messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, foreign key)
      - `role` (text, check constraint for 'user'/'assistant')
      - `content` (text)
      - `timestamp` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for public access

  3. Performance
    - Add indexes for optimal query performance
    - Add trigger for auto-updating updated_at column
*/

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'New Conversation',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id text DEFAULT 'anonymous'
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DO $$
BEGIN
  -- Drop and recreate conversations policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'conversations' 
    AND policyname = 'Allow public access to conversations'
  ) THEN
    DROP POLICY "Allow public access to conversations" ON conversations;
  END IF;
  
  -- Drop and recreate messages policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' 
    AND policyname = 'Allow public access to messages'
  ) THEN
    DROP POLICY "Allow public access to messages" ON messages;
  END IF;
END $$;

-- Create policies for public access (matching existing schema)
CREATE POLICY "Allow public access to conversations"
  ON conversations
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access to messages"
  ON messages
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_created_at 
  ON conversations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
  ON messages (conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_timestamp 
  ON messages (timestamp DESC);

-- Create trigger to auto-update updated_at column
DO $$
BEGIN
  -- Drop trigger if it exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_conversations_updated_at'
  ) THEN
    DROP TRIGGER update_conversations_updated_at ON conversations;
  END IF;
END $$;

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();