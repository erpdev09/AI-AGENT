// checkTweets.js
const pool = require('../config/dbconnect');

async function findMatchingTweets() {
  try {
    const keyword = 'create a token';
    const query = `
      SELECT * FROM tweets1
      WHERE LOWER(tweet_content) LIKE $1
    `;
    const values = [`%${keyword.toLowerCase()}%`];

    const res = await pool.query(query, values);

    if (res.rows.length === 0) {
      console.log('No matching tweets found.');
    } else {
      console.log('Extracted token data:\n');

      res.rows.forEach((row, index) => {
        const content = row.tweet_content;

        const nameMatch = content.match(/name\s*=\s*["'](.+?)["']/i);
        const descMatch = content.match(/description\s*=\s*["'](.+?)["']/i);
        const websiteMatch = content.match(/website\s*=\s*["'](.+?)["']/i);
        const telegramMatch = content.match(/telegram\s*=\s*["'](.+?)["']/i);
        const liquidityMatch = content.match(/initial\s+liquidity\s*=\s*["'](.+?)["']/i);
        const imageurl = content.match(/Image\s+link\s*[:=]\s*["']?(.+?)["']?(?:\s|$)/i);

        const tokenData = {
          tweetid: row.tweet_id,
          name: nameMatch ? nameMatch[1] : 'N/A',
          description: descMatch ? descMatch[1] : 'N/A',
          website: websiteMatch ? websiteMatch[1] : 'N/A',
          telegram: telegramMatch ? telegramMatch[1] : 'N/A',
          initial_liquidity: liquidityMatch ? liquidityMatch[1] : 'N/A',
          imageurl: imageurl ? imageurl[1] : 'N/A',
        };

    
        console.log(tokenData);
        console.log('-------------------------');
      });
    }
  } catch (err) {
    console.error('Error querying tweets:', err);
  } finally {
    await pool.end(); // close the connection if script ends here
  }
}

findMatchingTweets();
