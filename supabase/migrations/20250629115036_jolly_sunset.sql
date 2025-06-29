/*
  # Create chat application schema

  1. New Tables
    - `conversations`
      - `id` (uuid, primary key)
      - `title` (text, default 'New Conversation')
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - `user_id` (text, default 'anonymous')
    - `messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, foreign key to conversations)
      - `role` (text, check constraint for 'user' or 'assistant')
      - `content` (text, required)
      - `timestamp` (timestamptz, default now())
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on both tables
    - Add policies for public access (as configured in existing schema)

  3. Indexes
    - Index on conversations.created_at for performance
    - Index on messages.conversation_id for joins
    - Index on messages.timestamp for ordering

  4. Triggers
    - Auto-update updated_at column on conversations
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
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();