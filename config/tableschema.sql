DROP TABLE IF EXISTS tweets;

CREATE TABLE tweets (
    tweet_id BIGINT PRIMARY KEY,
    the_original_text TEXT NOT NULL,
    author TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ai_has_replied BOOLEAN DEFAULT FALSE,
    ai_replied_text TEXT,
    CONSTRAINT unique_tweet_text_author UNIQUE (the_original_text, author)
);


DROP TABLE


CREATE TABLE
my_new_database=> SELECT * FROM tweets;
 tweet_id | the_original_text | author | timestamp | ai_has_replied | ai_replied_text 
----------+-------------------+--------+-----------+----------------+-----------------
(0 rows)

my_new_database=> SELECT * FROM tweets;
      tweet_id       |                 the_original_text                  |   author    |         timestamp          | ai_has_replied |                                                                ai_replied_text                                                                
---------------------+----------------------------------------------------+-------------+----------------------------+----------------+-----------------------------------------------------------------------------------------------------------------------------------------------






// Table Schema for reminder bot

CREATE TABLE remindme (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  remindmetime TIMESTAMP NOT NULL,
  tweetid TEXT NOT NULL,
  reminded BOOLEAN DEFAULT FALSE
);


// Table Schema for Tweet scraping for action
CREATE TABLE tweets1 (
    tweet_id TEXT PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    tweet_content TEXT NOT NULL,
    tweet_link VARCHAR(255) NOT NULL,
    tweet_link_extra TEXT,
    is_replied_tweet BOOLEAN DEFAULT FALSE,
    is_direct_tag BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action_perform BOOLEAN DEFAULT FALSE
);


// Table Schema for Giveaways

-- Giveaway Table: Stores campaign-level data
CREATE TABLE giveaway (
  giveaway_id BIGINT PRIMARY KEY,  -- Manually set to tweet_id
  is_create_giveaway BOOLEAN NOT NULL,
  participant_count INT,
  amount DECIMAL(18, 8),
  token_type TEXT,
  deadline TIMESTAMP,
  tweet_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  action_performed BOOLEAN DEFAULT FALSE,
  CONSTRAINT unique_giveaway UNIQUE (tweet_id)
);

CREATE TABLE participants (
  participant_id SERIAL PRIMARY KEY,
  giveaway_id BIGINT REFERENCES giveaway(giveaway_id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  solana_address VARCHAR(50) NOT NULL,
  tweet_url TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_participant_per_giveaway UNIQUE (giveaway_id, username)
);


CREATE TABLE
CREATE TABLE "public"."giveaway" (
    "giveaway_id" BIGINT PRIMARY KEY,       -- Now stores the actual tweet_id and is the PK
    "is_create_giveaway" BOOLEAN NOT NULL,
    "participant_count" INTEGER,
    "amount" NUMERIC(18,8),
    "token_type" TEXT,
    "deadline" TIMESTAMP,
    -- NO separate "tweet_id" column here
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "action_performed" BOOLEAN DEFAULT false
);