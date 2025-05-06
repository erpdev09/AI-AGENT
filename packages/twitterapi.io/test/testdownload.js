const { videoDownloader } = require('../main/scrapevideo');

const apiKey = '';
const tweetId = '1919731711459340760';

videoDownloader(apiKey, tweetId)
  .then((video) => {
    if (video) {
      console.log('High-bitrate video URL:', video.url);
    } else {
      console.log('No matching video variant found.');
    }
  });
