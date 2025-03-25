-- Drop existing tables if they exist (optional, for a fresh start)
DROP TABLE IF EXISTS replies CASCADE;
DROP TABLE IF EXISTS tweets CASCADE;

-- Create the tweets table
CREATE TABLE tweets (
  tweet_id BIGINT PRIMARY KEY,          -- Unique identifier for each tweet (e.g., Twitter's tweet ID)
  text TEXT NOT NULL,                   -- Tweet content
  author VARCHAR(255) NOT NULL          -- Tweet author (e.g., username)
);

-- Create the replies table
CREATE TABLE replies (
  reply_id SERIAL PRIMARY KEY,          -- Auto-incrementing unique identifier for each reply
  tweet_id BIGINT NOT NULL,             -- Foreign key referencing the tweet being replied to
  text TEXT NOT NULL,                   -- Reply content
  author VARCHAR(255) NOT NULL,         -- Reply author (e.g., username or "AI_Bot")
  is_ai_reply BOOLEAN NOT NULL DEFAULT FALSE, -- Flag to indicate if the reply is AI-generated
  FOREIGN KEY (tweet_id) REFERENCES tweets(tweet_id) ON DELETE CASCADE
);

-- Optional: Create indexes for better query performance
CREATE INDEX idx_replies_tweet_id ON replies(tweet_id);