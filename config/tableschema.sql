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
 1917477216256155833 | share your thoughts let's discuss!                 | Elisabeth   | 2025-04-30 17:51:53.601548 | f              | 
 1917481047270609165 | what do you think about my crush calling me "bro"? | testaccount | 2025-04-30 17:51:53.61054  | t              | **depends.  is he secretly admiring your *bro-mance* potential, or just tragically uninspired?  either way, get creative with your revenge.**
(2 rows)



// Table Schema for reminder bot

CREATE TABLE remindme (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  remindmetime TIMESTAMP NOT NULL,
  tweetid TEXT NOT NULL,
  reminded BOOLEAN DEFAULT FALSE
);

