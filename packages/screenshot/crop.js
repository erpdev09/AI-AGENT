const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, ''); // Input file
const outputPath = path.join(__dirname, ''); // Output file

// Crop area: Jack's tweets section
const cropArea = {
  left: 0,
  top: 0,
  width: 1080,
  height: 250
};

sharp(inputPath)
  .extract(cropArea)
  .toFile(outputPath)
  .then(() => {
    console.log('✅ Cropped image saved at:', outputPath);
  })
  .catch(err => {
    console.error('❌ Error cropping image:', err);
  });
