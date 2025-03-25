require("dotenv").config();
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json()); 

const API_KEY = process.env.ELEVEN_LABS_API_KEY;
const VOICE_ID = "pNInz6obpgDQGcFmaJgB";


app.post("/tts", async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            {
                text: text,
                model_id: "eleven_monolingual_v1",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.8,
                },
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": API_KEY,
                },
                responseType: "arraybuffer",
            }
        );

        const filePath = path.join(__dirname, "output.mp3");
        fs.writeFileSync(filePath, response.data, "binary");

        res.download(filePath, "speech.mp3", () => {
          
            fs.unlinkSync(filePath);
        });
    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
