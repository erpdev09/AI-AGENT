# SOCIAL AI AGENT
![Image Description](https://res.cloudinary.com/dqhgpfnmb/image/upload/v1741419691/whritbdibnedxtalmt1m.webp)


## Overview
This project is a AI Agent for Twitter bot that scrapes tweets based on a search query, analyzes them using the AI models, Gemini, Deepseek (AI Model Provider), and automatically posts replies. It leverages Puppeteer for browser automation and the AIML API for AI-driven analysis and reply generation. The system saves scraped tweets and generated replies to JSON files for persistence and further processing.

Now support scraping tweets via Twitter-API, and parallel processing of Scrapping via
Browser and Twitter APIs
## Prerequisites

- **Node.js**: v16 or higher
- **npm**: For package management
- **Twitter Account**: Must be logged in via Puppeteer for scraping and replying
- **PostgreSQL**: For data storage and management

## Installation

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd AI-AGENT
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```
   
   Or install individual packages if needed:
   ```bash
   npm install @google-cloud/text-to-speech @google/generative-ai @solana/spl-token @solana/web3.js axios bip39 canvas cheerio crypto dayjs dotenv ethers express ffmpeg-static fluent-ffmpeg fs google-tts-api got llamaai mime-types needle node-fetch oauth-1.0a openai path pg play-sound puppeteer puppeteer-extra puppeteer-extra-plugin-stealth querystring say sharp solana-swap tesseract.js twitter-api-sdk twitter-api-v2 twitter-lite web3
   ```

3. **Environment Setup**:
   - Create a `.env` file in the root directory with required API keys and configuration
   - Set up Google Cloud, Twitter API, and blockchain credentials

4. **Database Setup**:
   - Configure PostgreSQL credentials in `config/` directory
   - Initialize database connection via `client/connectdb.js`

5. **Run the Application**:
   ```bash
   node twitter-scrapper/main.js
   ```

## Project Structure

```
AI-AGENT/
├── api/                  # API endpoints and services
├── twitter-scrapper/     
│   ├── custom-scrapper/  # Handle automated tweets scraping (Without API purely Automation)
│   ├── agent             # Contain all module to automate tweets and process response.
│   ├── temp/             # (Optional, can be removed if fully DB-based) 
│   └── scrapeTweets.js   # Main scraping, liking, retweeting logic with PostgreSQL
│   └── ....
├── client/              
│   ├── clientreply.js    # AI analysis and reply generation
│   ├── replydm.js        # Replies to DMs
│   ├── connectdb.js      # Database connection setup
│   └── utils.js          # Utility functions for client operations
│   └── ....
├── config/               # Configuration files and environment variables
│   └── ....              # Includes all config function and export module to connect db
├── helper/               # Helper class for all multiple function calls
│   ├── updateaAction.js  # Database operations helper functions
│   └── trigger.js        # Twitter-specific helper functions
│   └── ....
├── docs/                 # Overview layout on how-to and implementation of the projects
│   ├──  api              # API documentation
│   ├──  blogs            # Overview blogs and community
│   └──  src              # This document outlines the source of projects including images, branding, logos etc
├── pipeline/             # Data processing pipelines
│   ├──  sentiment        # Contains AI-Agent character customization set
│   └──  src              # Just a normal test-suit
│   └──  cronjob          # Handle all cron jobs from automating all process
├── packages/             # Contains all necessary modules for execution of features
│   ├── weaviate/         # Vector search DB to search for neares/closest distance and detect keywords
│   ├── reminder/         # Reminder modules
│   ├── screenshot/       # Screenshot modules
│   ├── vision/           # AI processing modules for detecting text
│   └── wallet            # Wallet modules
│   └── ....
├── node_modules/         # Node.js dependencies
├── LICENSE               # Project license
├── package.json          # Project dependencies and scripts
├── package-lock.json     # Locked versions of dependencies
└── README.md             # Project documentation
```

## Key Features

- **Automated Tweet Discovery**: Uses Puppeteer to search and scrape tweets based on custom queries
- **AI Integration**: Leverages Google's Generative AI for content generation
- **Text-to-Speech**: Converts text to audio using Google's TTS API
- **OCR Capabilities**: Extracts text from images using Tesseract.js
- **Direct Message Management**: Automatically responds to DMs using AI
- **Vector Search**: Uses Weaviate for semantic matching of content
- **Data Pipeline**: Processes and analyzes tweet data for insights
- **Database Integration**: Stores tweet data and interactions in PostgreSQL
- **Multi-module Architecture**: Modular design with specialized packages for different functionalities
- **Blockchain Integration**: Connects with Solana and Ethereum networks for crypto transactions
- **Web Scraping**: Uses Puppeteer and Cheerio for advanced web data extraction
- **Media Processing**: Handles image and video transformations with Sharp and FFmpeg

## Configuration

- **API Keys**:
  - Replace Gemini API key in `clientreply.js` 
  - Twitter API credentials for direct API access
  - Blockchain wallet credentials for Solana and Ethereum

- **Environment Variables**: Configure the following in your `.env` file:
  ```
  # API Keys
  OPENAI_API_KEY=your_openai_key
  GOOGLE_API_KEY=your_google_key
  TWITTER_API_KEY=your_twitter_key
  TWITTER_API_SECRET=your_twitter_secret
  TWITTER_BEARER_TOKEN=your_twitter_bearer_token


  TWITTER_USERNAME=
  TWITTER_PASSWORD=
  TWITTER_SEARCH_QUERY=
  
  # Database
  POSTGRES_USER=your_db_user
  POSTGRES_PASSWORD=your_db_password
  POSTGRES_DB=your_db_name
  POSTGRES_HOST=localhost
  
  # Blockchain
  SOLANA_PRIVATE_KEY=your_solana_key
  ETHEREUM_PRIVATE_KEY=your_ethereum_key
  
  # Other Settings
  NODE_ENV=development
  ```

- **Search Query**: The search query is passed as an argument to the `scrapeTweets()` function:
  ```javascript
  scrapeTweets(page, "your search query")
  ```



## Usage (HOW TO DOCS) will be update in due time

1. Configure your search parameters in the appropriate configuration files
2. Ensure database connection is properly set up(PostgreSQL)
3. Run the main application script (Under twiiter/scrapper/main.js) or (twitter-scrapper/custom-scrapper/scrapper.js)
4. Monitor the automated interactions through logs or database queries
5. Setup db and tables using the (/config/tableschema.sql)



## Notes

- Be mindful of Twitter's rate limits and terms of service when using this tool.
- Secure your API keys and credentials, especially blockchain private keys.
- For full documentation, refer to the `docs/` directory (Updatingt this in due time)

## Dependencies

This project relies on the following npm packages:

```json
{
 "@google-cloud/text-to-speech": "^6.0.1",
    "@google-cloud/vision": "^5.1.0",
    "@google/generative-ai": "^0.22.0",
    "@solana/spl-token": "^0.4.13",
    "@solana/web3.js": "^1.98.0",
    "axios": "^1.7.9",
    "bip39": "^3.1.0",
    "canvas": "^3.1.0",
    "cheerio": "^1.0.0",
    "chrono-node": "^2.8.0",
    "compromise": "^14.14.4",
    "crypto": "^1.0.1",
    "dayjs": "^1.11.13",
    "dotenv": "^16.5.0",
    "ethers": "^6.13.5",
    "express": "^5.1.0",
    "ffmpeg-static": "^5.2.0",
    "fluent-ffmpeg": "^2.1.3",
    "fs": "^0.0.1-security",
    "google-tts-api": "^2.0.2",
    "got": "^10.7.0",
    "llamaai": "^1.0.4",
    "mime-types": "^3.0.1",
    "needle": "^3.3.1",
    "node-fetch": "^3.3.2",
    "oauth-1.0a": "^2.2.6",
    "openai": "^4.85.4",
    "path": "^0.12.7",
    "pg": "^8.14.1",
    "play-sound": "^1.1.6",
    "puppeteer": "^24.4.0",
    "puppeteer-extra": "^3.3.6",
    "puppeteer-extra-plugin-stealth": "^2.11.2",
    "querystring": "^0.2.1",
    "say": "^0.16.0",
    "sharp": "^0.34.1",
    "solana-swap": "^1.1.6",
    "tesseract.js": "^6.0.1",
    "twitter-api-sdk": "^1.2.1",
    "twitter-api-v2": "^1.22.0",
    "twitter-lite": "^1.1.0",
    "weaviate-client": "^2.2.0",
    "web3": "^4.16.0"
}
```