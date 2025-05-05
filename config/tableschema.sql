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
    id SERIAL PRIMARY KEY,                          -- Auto-incrementing unique ID
    main_tweet_id VARCHAR(50) NOT NULL,             -- The tweet ID that initiated the giveaway
    prize_pool NUMERIC(18, 6) NOT NULL,             -- Prize pool (e.g., tokens, cryptocurrency amount)
    timeline TIMESTAMP NOT NULL,                    -- Deadline or end time of the giveaway
    CONSTRAINT unique_main_tweet_id UNIQUE (main_tweet_id)  -- Ensure no duplicates by main_tweet_id
);

-- Participants Table: Stores user entries for the giveaway
CREATE TABLE participants (
    id SERIAL PRIMARY KEY,                          -- Unique participant ID
    giveaway_id INTEGER NOT NULL REFERENCES giveaway(id) ON DELETE CASCADE, -- Foreign key to giveaway
    username VARCHAR(50) NOT NULL,                  -- Username of the participant
    tweet_id VARCHAR(50) NOT NULL,                  -- Tweet ID of the participant's reply
    action_perform BOOLEAN DEFAULT FALSE NOT NULL   -- Whether they followed the rules
);
