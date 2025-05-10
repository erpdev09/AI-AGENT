const gTTS = require('gtts');
const fs = require('fs');
const path = require('path'); // Import the path module

const textToConvert = 'hahahah testing';
const language = 'en';
const tempDirName = 'temp'; // Name of the temporary directory
const outputFileName = 'processaudio.mp3'; // Desired output filename

// Construct the full path to the temporary directory
const tempDirPath = path.join(__dirname, tempDirName);

// Construct the full path to the output file
const outputFilePath = path.join(tempDirPath, outputFileName);

try {
  // Check if the temporary directory exists, if not, create it
  if (!fs.existsSync(tempDirPath)) {
    fs.mkdirSync(tempDirPath, { recursive: true }); // { recursive: true } creates parent dirs if needed
    console.log(`Created directory: ${tempDirPath}`);
  }

  const tts = new gTTS(textToConvert, language);

  tts.save(outputFilePath, function (err, result) {
    if (err) {
      console.error('Error converting text to speech:', err);
      return;
    }
    console.log(`Text to speech converted successfully! Audio saved as ${outputFilePath}`);
  });

} catch (error) {
  console.error('An error occurred:', error);
}