const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const vision = require('@google-cloud/vision');
const mime = require('mime-types');

/**
 * Solana OCR Module - Extracts Solana addresses from images and videos
 * using Google Cloud Vision OCR.
 */
class SolanaOCR {
  constructor(options = {}) {
    // Configuration with defaults
    this.frameDir = options.frameDir || 'frames';
    this.frameRate = options.frameRate || 1;
    this.outputFile = options.outputFile || 'detected_address.txt';
    this.solanaAddressRegex = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
    
    // Configure ffmpeg
    ffmpeg.setFfmpegPath(ffmpegPath);
    
    // Configure Google Cloud Vision Client
    // Assumes GOOGLE_APPLICATION_CREDENTIALS environment variable is set
    this.visionClient = new vision.ImageAnnotatorClient();
  }

  /**
   * Detects the file type (image, video, or unknown) based on extension and MIME type.
   * @param {string} filePath - Path to the file.
   * @returns {'image' | 'video' | 'unknown'} - The detected file type.
   */
  getFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = mime.lookup(ext);

    if (!mimeType) return 'unknown';
    if (mimeType.startsWith('image/')) return 'image';
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
  extractFrames(inputVideoPath, outputDir, fps = 1) {
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
          reject(new Error(`ffmpeg error: ${err.message}`));
        })
        .run(); // Start the ffmpeg process
    });
  }

  /**
   * Performs OCR using Google Cloud Vision on a list of image files and attempts
   * to detect Solana addresses, including potentially space-separated ones.
   * @param {string[]} imageFiles - An array of paths to image files.
   * @returns {Promise<boolean>} - True if a valid address was found and saved, false otherwise.
   */
  async runOCROnImagesWithVision(imageFiles) {
    let addressFound = false;
    let finalAddress = null;

    console.log(`\n🔬 Starting Google Vision OCR process on ${imageFiles.length} image(s)...`);

    for (const file of imageFiles) {
      const imagePath = path.resolve(file);
      console.log(`\n🔍 Processing ${path.basename(imagePath)} with Google Vision...`);

      try {
        // Perform OCR using Google Cloud Vision API
        const [result] = await this.visionClient.textDetection(imagePath);
        const detections = result.textAnnotations;
        // The first element (index 0) usually contains the full detected text block
        const ocrText = detections && detections.length > 0 ? detections[0].description : '';

        if (!ocrText) {
          console.log(`  ⚠️ No text detected by Vision API in ${path.basename(imagePath)}.`);
          continue; // Skip to the next image if no text found
        }

        // --- Text Cleaning and Address Detection Logic ---
        // 1. Basic cleaning: Remove line breaks, trim whitespace.
        let cleanedText = ocrText
          .replace(/(\r\n|\n|\r)/gm, " ") // Replace newlines with spaces
          .replace(/[,|]/g, '') // Remove commas and pipes
          .trim();

        console.log(`\n📄 Cleaned Text from ${path.basename(imagePath)} (Vision API):`);
        console.log(`"${cleanedText}"`);

        let potentialAddresses = new Set(); // Use a Set for unique addresses

        // 2. Find direct matches using the standard regex
        const directMatches = cleanedText.match(this.solanaAddressRegex);
        if (directMatches) {
          console.log(`  👀 Found direct matches: ${directMatches.join(', ')}`);
          directMatches.forEach(addr => potentialAddresses.add(addr));
        }

        // 3. Attempt concatenation of space-separated parts
        const textParts = cleanedText.split(/\s+/).filter(part => part.length > 0);
        if (textParts.length >= 2) {
          console.log(`  🧩 Checking space-separated parts for concatenation...`);
          for (let i = 0; i < textParts.length - 1; i++) {
            const part1 = textParts[i];
            const part2 = textParts[i + 1];
            const concatenated = part1 + part2;

            // Validate the concatenated string (length, chars, regex)
            if (concatenated.length >= 32 && concatenated.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(concatenated)) {
              if (concatenated.match(this.solanaAddressRegex)) {
                console.log(`    🔗 Concatenated "${part1}" + "${part2}" -> "${concatenated}" (Valid)`);
                potentialAddresses.add(concatenated);
              }
            }
          }
        }

        // 4. Filter and select the best address from all candidates found in THIS image
        const validAddressesInImage = Array.from(potentialAddresses).filter(addr =>
          addr.match(this.solanaAddressRegex) // Double check validity
        );

        if (validAddressesInImage.length > 0) {
          console.log(`  ✅ Valid addresses found in this image: ${validAddressesInImage.join(', ')}`);
          const longestInImage = validAddressesInImage.reduce((longest, current) => {
            return current.length > longest.length ? current : longest;
          }, "");

          // Update the overall final address if this image's longest is better
          if (!finalAddress || longestInImage.length > finalAddress.length) {
            finalAddress = longestInImage;
            console.log(`  ⭐ New longest overall address candidate: ${finalAddress}`);
          }
          addressFound = true; // Mark that we found at least one address
        } else {
          console.log(`  ❌ No valid Solana address found in ${path.basename(imagePath)}.`);
        }

      } catch (err) {
        console.error(`⚠️ Error processing ${path.basename(file)} with Google Vision:`, err.message || err);
      }
    } // End of loop through files

    // --- Final Result Processing ---
    if (finalAddress) {
      console.log(`\n🎯 Selected longest valid Solana Address across all images: ${finalAddress}`);
      try {
        fs.writeFileSync(this.outputFile, finalAddress);
        console.log(`💾 Address saved to ${this.outputFile}`);
        return {
          success: true,
          address: finalAddress,
          file: this.outputFile
        };
      } catch (writeErr) {
        console.error(`❌ Error writing address to file: ${writeErr.message}`);
        return {
          success: false,
          error: writeErr.message
        };
      }
    } else {
      console.log('\n❌ No valid Solana address found in any processed image.');
      return {
        success: false,
        error: 'No valid Solana address found'
      };
    }
  }

  /**
   * Deletes all files within the specified frame directory.
   */
  deleteFrames() {
    if (!fs.existsSync(this.frameDir)) return; // Exit if directory doesn't exist

    console.log(`\n🗑️ Deleting frames from ${this.frameDir}...`);
    try {
      const files = fs.readdirSync(this.frameDir);
      files.forEach((file) => {
        const filePath = path.join(this.frameDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      });
      console.log('✅ Frames deleted.');
    } catch (err) {
      console.error(`❌ Error deleting frames: ${err.message}`);
    }
  }

  /**
   * Main processing method to extract Solana address from an image or video file.
   * @param {string} inputPath - Path to the input file.
   * @returns {Promise<object>} - Result object with success status and address if found.
   */
  async processFile(inputPath) {
    console.log("--- Solana Address OCR Tool (Google Vision) ---");
    
    // Validate input file
    if (!inputPath) {
      console.error('❗ Error: Input file path is required.');
      return {
        success: false,
        error: 'Input file path is required'
      };
    }

    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      console.error(`❗ Error: Input file not found at "${inputPath}"`);
      return {
        success: false,
        error: `Input file not found at "${inputPath}"`
      };
    }

    // Check if Google Credentials are set (basic check)
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.warn('⚠️ Warning: GOOGLE_APPLICATION_CREDENTIALS environment variable not set.');
      console.warn('   The script might fail if credentials are not configured elsewhere.');
    } else if (!fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      console.warn(`⚠️ Warning: Google credentials file not found at "${process.env.GOOGLE_APPLICATION_CREDENTIALS}".`);
      console.warn('   The script might fail to authenticate.');
    }

    try {
      const fileType = this.getFileType(inputPath);
      let result;

      // --- Process Image ---
      if (fileType === 'image') {
        console.log(`\n🖼️ Detected image file: ${path.basename(inputPath)}`);
        result = await this.runOCROnImagesWithVision([inputPath]);
      }
      // --- Process Video ---
      else if (fileType === 'video') {
        console.log(`\n🎞️ Detected video file: ${path.basename(inputPath)}`);
        this.deleteFrames(); // Clean up old frames
        await this.extractFrames(inputPath, this.frameDir, this.frameRate);

        const frameFiles = fs.readdirSync(this.frameDir)
          .filter(f => f.endsWith('.png'))
          .map(f => path.join(this.frameDir, f))
          .sort();

        if (frameFiles.length === 0) {
          console.log('⚠️ No frames were extracted from the video.');
          result = {
            success: false,
            error: 'No frames were extracted from the video'
          };
        } else {
          result = await this.runOCROnImagesWithVision(frameFiles);
        }
        this.deleteFrames(); // Clean up frames after processing
      }
      // --- Unsupported File ---
      else {
        const error = `Unsupported file type for "${inputPath}". Please provide an image or video file.`;
        console.error(`❌ Error: ${error}`);
        return {
          success: false,
          error
        };
      }

      // --- Final Status ---
      if (result && result.success) {
        console.log("\n✅ Process finished successfully. Address saved.");
      } else {
        console.log("\n❌ Process finished, but no address was found or saved.");
      }

      return result;

    } catch (err) {
      console.error('\n❌ An unexpected error occurred during execution:');
      console.error(err.message || err);
      // Clean up frames in case of error during video processing
      if (this.getFileType(inputPath) === 'video') {
        this.deleteFrames();
      }
      return {
        success: false,
        error: err.message || 'Unknown error'
      };
    }
  }
}

module.exports = SolanaOCR;
