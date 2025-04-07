const fs = require('fs');

// This is also a test script to analyze the performance later integrate\
// model to learn from context and store the context on Redis DB, search
// the context using vector search
const characterData = JSON.parse(fs.readFileSync('./character.json', 'utf8'));

// Simple function to analyze user input and return the relevant response
function analyzeInput(userInput) {
    const lowerCaseInput = userInput.toLowerCase();

    // Check if the input is related to music interests
  // store the interest and score them
    if (lowerCaseInput.includes("music") || lowerCaseInput.includes("song") || lowerCaseInput.includes("listen")) {
        return analyzeMusicInterest();
    }

    // Check if the input is about the character's coding interests
    if (lowerCaseInput.includes("coding") || lowerCaseInput.includes("programming") || lowerCaseInput.includes("language")) {
        return analyzeCodingInterest();
    }

    // Check if the input is about food preferences
    if (lowerCaseInput.includes("food") || lowerCaseInput.includes("chicken wings") || lowerCaseInput.includes("eat")) {
        return analyzeFoodInterest();
    }

    // Check if the input is about fish
    if (lowerCaseInput.includes("fish") || lowerCaseInput.includes("nemo") || lowerCaseInput.includes("dory")) {
        return analyzeFishInterest();
    }

    // Check if the input is about crypto
    if (lowerCaseInput.includes("crypto") || lowerCaseInput.includes("dogecoin") || lowerCaseInput.includes("coin")) {
        return analyzeCryptoInterest();
    }

    // Default response if the context is unclear
    return "Hmm, I didn't catch that. Could you rephrase the question?";
}

// Helper functions for analyzing different topics

function analyzeMusicInterest() {
    return characterData.bio.music_interests;
}

function analyzeCodingInterest() {
    return characterData.bio.coding_interests;
}

function analyzeFoodInterest() {
    return characterData.bio.food_interests;
}

function analyzeFishInterest() {
    return characterData.bio.fish_love;
}

function analyzeCryptoInterest() {
    return characterData.bio.crypto_interests;
}

// Example of interaction
function startInteraction(userInput) {
    const response = analyzeInput(userInput);
    console.log(`[${characterData.name}] ${response}`);
}

// Test the function
startInteraction("What is your interest on listening to song?");
startInteraction("What do you like about coding?");
startInteraction("Tell me about your food preferences?");
startInteraction("Do you like fish? Especially Nemo and Dory?");
startInteraction("What do you think about crypto?");

