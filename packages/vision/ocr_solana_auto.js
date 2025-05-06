/**
 * Solana Address OCR Script
 *
 * This script processes an image or video file to detect Solana addresses using OCR.
 * It handles both direct address detection and addresses potentially split by spaces.
 *
 * Usage: node ocr_solana_auto.js <path_to_image_or_video>
 */

const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const Tesseract = require('tesseract.js');
const mime = require('mime-types');

// Configure ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// --- Configuration ---
const inputPath = process.argv[2]; // Input file path from command line argument
const frameDir = 'frames'; // Directory to store extracted video frames
const frameRate = 1; // Extract 1 frame per second from videos
// Solana address regex: Base58 characters, 32 to 44 characters long
const solanaAddressRegex = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

// --- Helper Functions ---

/**
 * Detects the file type (image, video, or unknown) based on extension and MIME type.
 * @param {string} filePath - Path to the file.
 * @returns {'image' | 'video' | 'unknown'} - The detected file type.
 */
function getFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = mime.lookup(ext); // Get MIME type from extension

  if (!mimeType) return 'unknown';
  if (mimeType.startsWith('image/')) return 'image';
  // Treat common video extensions explicitly as video
  if (mimeType.startsWith('video/') || ext === '.mp4' || ext === '.mov' || ext === '.avi' || ext === '.mkv') return 'video';

  return 'unknown';
}

/**
 * Extracts frames from a video file using ffmpeg.
 * @param {string} inputVideoPath - Path to the input video file.
 * @param {string} outputDir - Directory to save the extracted frames.
 * @param {number} fps - Frames per second to extract.
 * @returns {Promise<void>} - A promise that resolves when frame extraction is complete.
 */
function extractFrames(inputVideoPath, outputDir, fps = 1) {
  return new Promise((resolve, reject) => {
    // Create the output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`🎞️ Extracting frames at ${fps} FPS to ${outputDir}...`);
    ffmpeg(inputVideoPath)
      .outputOptions([
        `-vf fps=${fps}` // Set the frame rate filter
      ])
      .output(path.join(outputDir, 'frame-%04d.png')) // Output filename pattern (padded)
      .on('end', () => {
        console.log('✅ Frame extraction complete.');
        resolve();
      })
      .on('error', (err) => {
        console.error(`❌ ffmpeg error during frame extraction: ${err.message}`);
        reject(new Error(`ffmpeg error: ${err.message}`)); // Reject with an Error object
      })
      .run(); // Start the ffmpeg process
  });
}

/**
 * Performs OCR on a list of image files and attempts to detect Solana addresses,
 * including potentially space-separated ones.
 * @param {string[]} imageFiles - An array of paths to image files.
 * @returns {Promise<boolean>} - True if a valid address was found and saved, false otherwise.
 */
async function runOCROnImages(imageFiles) {
  const worker = await Tesseract.createWorker('eng'); // Use 'eng' language model
  let addressFound = false;
  let finalAddress = null;

  console.log(`\n🔬 Starting OCR process on ${imageFiles.length} image(s)...`);

  for (const file of imageFiles) {
    const imagePath = path.resolve(file);
    console.log(`\n🔍 Processing ${path.basename(imagePath)}...`);

    try {
      // Perform OCR
      const { data: { text } } = await worker.recognize(imagePath);
      const ocrText = text || '';

      // --- Text Cleaning and Address Detection Logic ---
      // 1. Basic cleaning: Remove line breaks, trim whitespace.
      //    Keep spaces for potential concatenation. Replace common OCR errors if needed.
      let cleanedText = ocrText
        .replace(/(\r\n|\n|\r)/gm, " ") // Replace newlines with spaces
        .replace(/[,|]/g, '') // Remove commas and pipes which might break addresses
        // Add more replacements for common OCR errors if observed (e.g., O -> 0, l -> 1)
        // .replace(/O/g, 'o')
        // .replace(/l/g, '1')
        .trim();

      console.log(`\n📄 Cleaned Text from ${path.basename(imagePath)}:`);
      console.log(`"${cleanedText}"`); // Log the cleaned text

      let potentialAddresses = new Set(); // Use a Set to automatically handle duplicates

      // 2. Find direct matches using the standard regex
      const directMatches = cleanedText.match(solanaAddressRegex);
      if (directMatches) {
        console.log(`  👀 Found direct matches: ${directMatches.join(', ')}`);
        directMatches.forEach(addr => potentialAddresses.add(addr));
      }

      // 3. **NEW:** Attempt concatenation of space-separated parts
      const textParts = cleanedText.split(/\s+/).filter(part => part.length > 0); // Split by spaces and remove empty parts
      if (textParts.length >= 2) {
        console.log(`  🧩 Checking space-separated parts for concatenation...`);
        for (let i = 0; i < textParts.length - 1; i++) {
          const part1 = textParts[i];
          const part2 = textParts[i+1];
          const concatenated = part1 + part2; // Concatenate adjacent parts

          // Validate the concatenated string
          if (concatenated.length >= 32 && concatenated.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(concatenated)) {
             // Check length and character set (more specific than regex for this case)
             // Now double-check with the full regex to ensure it's a valid structure
             if (concatenated.match(solanaAddressRegex)) {
                console.log(`    🔗 Concatenated "${part1}" + "${part2}" -> "${concatenated}" (Valid)`);
                potentialAddresses.add(concatenated);
             } else {
                // Optional: Log if concatenation looked promising but failed regex
                // console.log(`    🔗 Concatenated "${part1}" + "${part2}" -> "${concatenated}" (Invalid Structure)`);
             }
          }
        }
      }

      // 4. Filter and select the best address from all candidates found in THIS image
      const validAddressesInImage = Array.from(potentialAddresses).filter(addr =>
        addr.match(solanaAddressRegex) // Double check validity
      );

      if (validAddressesInImage.length > 0) {
        console.log(`  ✅ Valid addresses found in this image: ${validAddressesInImage.join(', ')}`);
        // Find the longest address among the valid ones for this image
        const longestInImage = validAddressesInImage.reduce((longest, current) => {
          return current.length > longest.length ? current : longest;
        }, "");

        // Update the overall final address if this image's longest is longer than the current best
        if (!finalAddress || longestInImage.length > finalAddress.length) {
          finalAddress = longestInImage;
          console.log(`  ⭐ New longest overall address candidate: ${finalAddress}`);
        }
        addressFound = true; // Mark that we found at least one address somewhere
      } else {
        console.log(`  ❌ No valid Solana address found in ${path.basename(imagePath)}.`);
      }

    } catch (err) {
      console.error(`⚠️ Error processing ${path.basename(file)}:`, err.message || err);
    }
  } // End of loop through files

  await worker.terminate(); // Terminate the Tesseract worker

  // --- Final Result Processing ---
  if (finalAddress) {
    console.log(`\n🎯 Selected longest valid Solana Address across all images: ${finalAddress}`);
    try {
      fs.writeFileSync('detected_address.txt', finalAddress);
      console.log('💾 Address saved to detected_address.txt');
      return true; // Indicate success
    } catch (writeErr) {
      console.error(`❌ Error writing address to file: ${writeErr.message}`);
      return false; // Indicate failure
    }
  } else {
    console.log('\n❌ No valid Solana address found in any processed image.');
    return false; // Indicate failure
  }
}

/**
 * Deletes all files within the specified frame directory.
 */
function deleteFrames() {
  if (!fs.existsSync(frameDir)) return; // Exit if directory doesn't exist

  console.log(`\n🗑️ Deleting frames from ${frameDir}...`);
  try {
    const files = fs.readdirSync(frameDir);
    files.forEach((file) => {
      const filePath = path.join(frameDir, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
        // console.log(`   - Deleted: ${file}`); // Optional: log each deleted file
      }
    });
    // Optionally remove the directory itself if empty
    // fs.rmdirSync(frameDir);
    console.log('✅ Frames deleted.');
  } catch (err) {
    console.error(`❌ Error deleting frames: ${err.message}`);
  }
}

// --- Main Execution Flow ---
(async () => {
  console.log("--- Solana Address OCR Tool ---");
  // Check for input file argument
  if (!inputPath) {
    console.error('❗ Error: Input file path is required.');
    console.error('   Usage: node ocr_solana_auto.js <path_to_image_or_video>');
    process.exit(1); // Exit with error code
  }

  // Check if input file exists
  if (!fs.existsSync(inputPath)) {
     console.error(`❗ Error: Input file not found at "${inputPath}"`);
     process.exit(1);
  }

  try {
    const fileType = getFileType(inputPath);
    let addressSaved = false;

    // --- Process Image ---
    if (fileType === 'image') {
      console.log(`\n🖼️ Detected image file: ${path.basename(inputPath)}`);
      addressSaved = await runOCROnImages([inputPath]);
    }
    // --- Process Video ---
    else if (fileType === 'video') {
      console.log(`\n🎞️ Detected video file: ${path.basename(inputPath)}`);
      // Clean up any old frames first
      deleteFrames();
      await extractFrames(inputPath, frameDir, frameRate);

      // Get list of extracted frame files
      const frameFiles = fs.readdirSync(frameDir)
        .filter(f => f.endsWith('.png')) // Ensure only PNGs are processed
        .map(f => path.join(frameDir, f)) // Create full paths
        .sort(); // Process frames in order

      if (frameFiles.length === 0) {
        console.log('⚠️ No frames were extracted from the video.');
      } else {
        addressSaved = await runOCROnImages(frameFiles);
      }
      // Clean up frames after processing
      deleteFrames();
    }
    // --- Unsupported File ---
    else {
      console.error(`❌ Error: Unsupported file type for "${inputPath}". Please provide an image or video file.`);
      process.exit(1);
    }

    // --- Final Status ---
    if (addressSaved) {
        console.log("\n✅ Process finished successfully. Address saved.");
        process.exit(0); // Exit successfully
    } else {
        console.log("\n❌ Process finished, but no address was found or saved.");
        process.exit(1); // Exit with error code (address not found)
    }

  } catch (err) {
    console.error('\n❌ An unexpected error occurred during execution:');
    console.error(err.message || err);
    // Clean up frames in case of error during video processing
    if (getFileType(inputPath) === 'video') {
        deleteFrames();
    }
    process.exit(1); // Exit with error code
  }
})();
