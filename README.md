# SOCIAL AI AGENT
![Image Description](https://res.cloudinary.com/dqhgpfnmb/image/upload/v1741419691/whritbdibnedxtalmt1m.webp)


## Overview
This project is a Node.js-based Twitter bot that scrapes tweets based on a search query, analyzes them using the Mistral AI model, and automatically posts replies. It leverages Puppeteer for browser automation and the AIML API for AI-driven analysis and reply generation. The system saves scraped tweets and generated replies to JSON files for persistence and further processing.

## Features
- **Tweet Scraping**: Scrapes tweets from Twitter’s "Latest" tab for a given search query.
- **Thread Extraction**: Captures the original tweet and its replies in a thread.
- **AI Analysis**: Uses Mistral AI to evaluate tweet context and generate casual, user-like replies.
- **Automated Replies**: Posts replies to tweets using a keyboard shortcut (Ctrl+Enter).
- **File Storage**: Saves scraped tweets to `scraped_tweets.json` and replies to `tobereplied.json` in a `temp` directory.
  

## Project Structure
```
AI-AGENT/
├── twitter-scrapper/
│   ├── scrapeTweets.js    # Main scraping and replying logic
│   ├── temp/             # Directory for JSON output
│   │   ├── scraped_tweets.json  # Scraped tweet data
│   │   ├── tobereplied.json     # AI-generated replies
├── client/
│   ├── clientreply.js    # AI analysis and reply generation
├── README.md             # Project documentation
```


## Prerequisites
- **Node.js**: v16 or higher
- **npm**: For package management
- **Twitter Account**: Must be logged in via Puppeteer for scraping and replying

## Installation
1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd AI-AGENT

   Install Dependencies:

2. ``npm install puppeteer openai``
3. Run main.js under ./twitter-scrapper

Set Up Directory:
Ensure the twitter-scrapper/temp directory exists (it will be created automatically if missing).
Configuration

API Key: The AIML API key is hardcoded in clientreply.js (a84bd072398746d7aabde062456652c6). Replace it with your own if needed.

Search Query: Passed as an argument to scrapeTweets(page, "your query").



