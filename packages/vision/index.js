const fs = require('fs');
const path = require('path');
const SolanaOCR = require('./cloud');

// Set environment variable for Google Cloud credentials if needed
process.env.GOOGLE_APPLICATION_CREDENTIALS = './linear-reason-459008-p5-05e7e1aceec2.json';

/**
 * Find the first .mp4 or .png file in the current directory
 * @returns {string|null} Path to the found file or null if none found
 */
function findMediaFile() {
  try {
    const supportedExtensions = ['.mp4', '.png', '.jpg', '.jpeg', '.mov', '.avi', '.mkv'];
    const files = fs.readdirSync(process.cwd());
    
    console.log('🔍 Searching for media files in current directory...');
    
    // First prioritize video files
    const videoExtensions = supportedExtensions.filter(ext => 
      ['.mp4', '.mov', '.avi', '.mkv'].includes(ext));
    
    for (const ext of videoExtensions) {
      const found = files.find(file => path.extname(file).toLowerCase() === ext);
      if (found) {
        console.log(`🎥 Found video file: ${found}`);
        return path.join(process.cwd(), found);
      }
    }
    
    // Then look for image files
    const imageExtensions = supportedExtensions.filter(ext => 
      ['.png', '.jpg', '.jpeg'].includes(ext));
    
    for (const ext of imageExtensions) {
      const found = files.find(file => path.extname(file).toLowerCase() === ext);
      if (found) {
        console.log(`🖼️ Found image file: ${found}`);
        return path.join(process.cwd(), found);
      }
    }
    
    console.log('❌ No supported media files found in the current directory.');
    return null;
    
  } catch (error) {
    console.error('❌ Error searching for media files:', error.message);
    return null;
  }
}

/**
 * Main function to run the Solana OCR tool
 */
async function main() {
  try {
    // Get the input file path from command line arguments or find automatically
    let inputPath = process.argv[2];
    
    // If no path is provided via command line, automatically find a suitable file
    if (!inputPath) {
      console.log('📂 No input file specified, searching for media files automatically...');
      inputPath = findMediaFile();
      
      if (!inputPath) {
        console.error('❗ Error: No supported media files found in the current directory.');
        console.error('   Please place a .mp4, .png, .jpg, .jpeg, .mov, .avi, or .mkv file in this directory');
        console.error('   or specify a path: node index.js <path_to_image_or_video>');
        process.exit(1);
      }
    }
    
    // Create a new instance of SolanaOCR with optional custom settings
    const ocr = new SolanaOCR({
      frameDir: 'frames', // Directory to store extracted video frames
      frameRate: 1,       // Extract 1 frame per second (not used for single frame)
      outputFile: 'detected_address.txt' // File to save the detected address
    });
    
    // Process the file
    const result = await ocr.processFile(inputPath);
    
    // Handle the result
    if (result.success) {
      console.log(`\n🚀 Successfully detected Solana address: ${result.address}`);
      console.log(`📄 Address saved to: ${result.file}`);
      process.exit(0);
    } else {
      console.error(`\n❌ Failed to detect Solana address: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message || error);
    process.exit(1);
  }
}

// Run the main function
main();