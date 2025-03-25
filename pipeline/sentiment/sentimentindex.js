const sentimentIndex = (text) => {
    const sentiments = {
        happy: { words: ["joy", "excited", "love", "content", "cheerful"], score: 3 },
        sad: { words: ["down", "depressed", "unhappy", "cry", "miserable"], score: -3 },
        emotional: { words: ["overwhelmed", "touching", "heartfelt", "intense", "tearful"], score: 2 },
        moody: { words: ["irritated", "annoyed", "grumpy", "temperamental", "restless"], score: -2 },
    };

    for (const [sentiment, data] of Object.entries(sentiments)) {
        if (data.words.some(word => text.toLowerCase().includes(word))) {
            return { sentiment, score: data.score };
        }
    }
    return { sentiment: "neutral", score: 0 };
};

// Example usage
const userText = "I feel so excited and joyful today!";
const result = sentimentIndex(userText);
console.log(result); // Output: { sentiment: 'happy', score: 3 }
