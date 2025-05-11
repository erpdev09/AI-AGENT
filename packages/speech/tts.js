const gTTS = require('gtts');
const fs = require('fs');
const path = require('path'); 

const textToConvert = 'hahahah testing';
const language = 'en';
const tempDirName = 'temp'; 
const outputFileName = 'processaudio.mp3'; 

const tempDirPath = path.join(__dirname, tempDirName);


const outputFilePath = path.join(tempDirPath, outputFileName);

try {

  if (!fs.existsSync(tempDirPath)) {
    fs.mkdirSync(tempDirPath, { recursive: true }); 
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