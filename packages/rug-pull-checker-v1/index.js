const express = require('express');
const SPLRugchecker = require('./dist/index.js').default;
const WebsiteChecker = require('./dist/index.js').WebsiteChecker;

const app = express();
const PORT = 6463;

// Configuration
const rugCheckConfig = {
    solanaRpcEndpoint: '',
    heliusApiKey: ''
};

const rugChecker = new SPLRugchecker(rugCheckConfig);
const websiteCheck = new WebsiteChecker();

app.get('/checkrug/:address', async (req, res) => {
    const tokenAddress = req.params.address;

    try {
        const result = await rugChecker.check(tokenAddress);
        const score = rugChecker.rugScore(result);
        const isRug = rugChecker.isRug(result);

        res.json({
            result,
            score,
            isRug
        });
    } catch (error) {
        console.error('Error checking the token address:', error);
        res.status(500).json({ error: 'Failed to check token address', details: error.message });
    }
});

// app.get('/checkwebsite/:domain', async (req, res) => {
//     const website = req.params.domain;

//     try {
//         const result = await websiteCheck.check(website);
//         res.json(result);
//     } catch (error) {
//         console.error('Error checking the website:', error);
//         res.status(500).json({ error: 'Failed to check website', details: error.message });
//     }
// });

app.listen(PORT, () => {
    console.log(`Rugcheck API is running on http://localhost:${PORT}`);
});
