// This is just a test-suite
const fs = require('fs');

const characterData = JSON.parse(fs.readFileSync('../sentiment/character.json', 'utf8'));

// Function to get response based on user input
function getResponseToInput(userInput) {
  const lowerCaseInput = userInput.toLowerCase();

  // Check for keyword-based responses (you can enhance this logic)
  if (lowerCaseInput.includes("perfect date")) {
    return characterData.responses["perfect_date"];
  } else if (lowerCaseInput.includes("what are you working on")) {
    return characterData.responses["what_are_you_working_on"];
  } else if (lowerCaseInput.includes("social media")) {
    return characterData.responses["social_media"];
  } else if (lowerCaseInput.includes("dream job")) {
    return characterData.responses["dream_job"];
  } else if (lowerCaseInput.includes("philosophy of life")) {
    return characterData.responses["philosophy_of_life"];
  } else if (lowerCaseInput.includes("handle stress")) {
    return characterData.responses["handling_stress"];
  } else if (lowerCaseInput.includes("biggest achievement")) {
    return characterData.responses["biggest_achievement"];
  }
  
  // Default response if no specific match found
  return "Hmm, interesting. Tell me more!";
}

// Simulate interaction with the character
function startInteraction(userInput) {
  const response = getResponseToInput(userInput);

  // Log the character's response
  console.log(`[${characterData.name}] ${response}`);
}

// Example of interaction with the character
startInteraction("What's your perfect date?");
startInteraction("What are you working on lately?");
startInteraction("Tell me about your philosophy on life.");
startInteraction("How do you handle stress?");
startInteraction("What's your biggest achievement?");
