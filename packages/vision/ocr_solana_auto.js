const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const Tesseract = require('tesseract.js');
const mime = require('mime-types');

ffmpeg.setFfmpegPath(ffmpegPath);

// Config
const inputPath = process.argv[2]; // CLI arg
const frameDir = 'frames';
const frameRate = 1;
const solanaAddressRegex = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

// File type detection
function getFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = mime.lookup(ext);

  if (!mimeType) return 'unknown';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/') || ext === '.mp4' || ext === '.mov') return 'video';

  return 'unknown';
}

// Frame extraction from video
function extractFrames(inputPath, outputDir, fps = 1) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    ffmpeg(inputPath)
      .outputOptions([`-vf fps=${fps}`])
      .output(`${outputDir}/frame-%03d.png`)
      .on('end', () => {
        console.log('✅ Frame extraction complete.');
        resolve();
      })
      .on('error', (err) => {
        reject(`❌ ffmpeg error: ${err.message}`);
      })
      .run();
  });
}

// OCR + Address Detection with Early Exit
async function runOCROnImages(files) {
  const foundAddresses = new Set();

  for (const file of files) {
    const imagePath = path.resolve(file);
    console.log(`🔍 Processing ${path.basename(imagePath)}...`);

    try {
      const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
        logger: m => {} // Optional: log progress
      });

      const matches = text.match(solanaAddressRegex);
      if (matches) {
        matches.forEach(addr => foundAddresses.add(addr));
        console.log(`📥 Found:`, matches);

        // Exit immediately after finding an address
        console.log('✅ Solana address found. Exiting...');
        return true; // Indicates that we found an address and should stop processing
      } else {
        console.log(`❌ No address found in ${file}`);
      }
    } catch (err) {
      console.error(`⚠️ Error processing ${file}:`, err.message);
    }
  }

  if (foundAddresses.size > 0) {
    console.log('\n🎯 All Detected Solana Addresses:');
    console.log([...foundAddresses]);
  } else {
    console.log('\n🚫 No Solana addresses detected.');
  }

  return false; // No address was found
}

// Function to delete all frames in the 'frames' folder
function deleteFrames() {
  fs.readdirSync(frameDir).forEach((file) => {
    const filePath = path.join(frameDir, file);
    if (fs.statSync(filePath).isFile()) {
      fs.unlinkSync(filePath); // Delete file
      console.log(`🗑️ Deleted frame: ${file}`);
    }
  });
}

// Main function
(async () => {
  try {
    if (!inputPath) {
      console.error('❗ Usage: node ocr_solana_auto.js <file>');
      process.exit(1);
    }

    const fileType = getFileType(inputPath);

    if (fileType === 'image') {
      console.log('🖼️ Detected static image.');
      const found = await runOCROnImages([inputPath]);
      if (found) {
        deleteFrames(); // Clean up frames if an address is found
        return;
      }
    } else if (fileType === 'video') {
      console.log(`🎞️ Detected video – extracting frames...`);
      await extractFrames(inputPath, frameDir, frameRate);

      const frameFiles = fs.readdirSync(frameDir)
        .filter(f => f.endsWith('.png'))
        .map(f => path.join(frameDir, f));

      if (frameFiles.length === 0) {
        console.log('⚠️ No frames extracted.');
        return;
      }

      // Process each frame and exit early if an address is found
      const found = await runOCROnImages(frameFiles);
      if (found) {
        deleteFrames(); // Clean up frames if an address is found
        return;
      }
    } else {
      console.error('❌ Unsupported file type.');
    }

    // Clean up frames after processing all frames
    deleteFrames();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
