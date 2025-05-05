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
CREATE TABLE giveaways (
  giveaway_id SERIAL PRIMARY KEY,  -- Unique ID for each giveaway
  is_create_giveaway BOOLEAN NOT NULL,  -- Whether this is a giveaway tweet
  participant_count INT,  -- Number of participants (optional)
  amount DECIMAL(18, 8),  -- Amount for the giveaway (e.g., SOL, USDC)
  token_type TEXT,  -- Type of token (e.g., SOL, USDC)
  deadline TIMESTAMP,  -- Deadline for the giveaway
  tweet_id BIGINT NOT NULL,  -- Tweet ID of the giveaway tweet
  user_name VARCHAR(255) NOT NULL,  -- Username of the giveaway creator
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- When the giveaway was created
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- When the giveaway details were last updated
  action_performed BOOLEAN DEFAULT FALSE,  -- Flag to indicate if the action has been performed (e.g., giveaway completion)
  CONSTRAINT unique_giveaway UNIQUE (tweet_id)  -- Ensure each giveaway tweet is unique
);


-- Participants
CREATE TABLE participants (
  participant_id SERIAL PRIMARY KEY,  -- Unique ID for the participant entry
  giveaway_id INT NOT NULL,  -- Foreign key to the giveaways table
  tweet_id BIGINT NOT NULL,  -- Tweet ID of the reply
  user_name VARCHAR(255) NOT NULL,  -- Username of the participant
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- When the participant entered
  FOREIGN KEY (giveaway_id) REFERENCES giveaways (giveaway_id) ON DELETE CASCADE
);
