const fs = require('fs');
const path = require('path');
const SolanaOCR = require('../../../../packages/vision/cloud');

// Set environment variable for Google Cloud credentials
process.env.GOOGLE_APPLICATION_CREDENTIALS = '../../../../packages/vision/linear-reason-459008-p5-05e7e1aceec2.json';

/**
 * Find all media files in a directory and its subdirectories recursively
 * @param {string} directory - Directory to search in
 * @param {boolean} recursive - Whether to search subdirectories
 * @returns {string[]} Array of full paths to media files
 */
function findMediaFilesInDirectory(directory, recursive = true) {
  try {
    const supportedExtensions = ['.mp4', '.png', '.jpg', '.jpeg', '.mov', '.avi', '.mkv'];
    
    if (!fs.existsSync(directory)) {
      console.error(`❌ Directory does not exist: ${directory}`);
      return [];
    }
    
    console.log(`🔍 Searching for media files in ${directory}...`);
    const files = fs.readdirSync(directory);
    let mediaFiles = [];
    
    // Process each file/directory
    for (const file of files) {
      const fullPath = path.join(directory, file);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory() && recursive) {
        // Recursively search subdirectories
        console.log(`📂 Entering subdirectory: ${fullPath}`);
        const subDirFiles = findMediaFilesInDirectory(fullPath, recursive);
        mediaFiles = mediaFiles.concat(subDirFiles);
      } else if (stats.isFile()) {
        // Check if file has supported extension
        const ext = path.extname(file).toLowerCase();
        if (supportedExtensions.includes(ext)) {
          mediaFiles.push(fullPath);
        }
      }
    }
    
    if (mediaFiles.length === 0) {
      console.log(`❌ No supported media files found in ${directory}`);
    } else {
      console.log(`✅ Found ${mediaFiles.length} media files in ${directory} ${recursive ? 'and its subdirectories' : ''}`);
    }
    
    return mediaFiles;
  } catch (error) {
    console.error(`❌ Error searching for media files in ${directory}:`, error.message);
    return [];
  }
}

/**
 * Find txt files in a directory and its subdirectories recursively
 * @param {string} directory - Directory to search in
 * @param {boolean} recursive - Whether to search subdirectories
 * @returns {object} Map of base filenames to full paths
 */
function findTxtFilesInDirectory(directory, recursive = true) {
  try {
    if (!fs.existsSync(directory)) {
      console.error(`❌ Directory does not exist: ${directory}`);
      return {};
    }
    
    const files = fs.readdirSync(directory);
    const txtFiles = {};
    
    // Process each file/directory
    for (const file of files) {
      const fullPath = path.join(directory, file);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory() && recursive) {
        // Recursively search subdirectories
        const subDirTxtFiles = findTxtFilesInDirectory(fullPath, recursive);
        // Merge the results
        Object.assign(txtFiles, subDirTxtFiles);
      } else if (stats.isFile() && path.extname(file).toLowerCase() === '.txt') {
        // Store txt file with basename as key
        const baseName = path.basename(file, '.txt');
        txtFiles[baseName] = fullPath;
      }
    }
    
    console.log(`📄 Found ${Object.keys(txtFiles).length} txt files in ${directory} ${recursive ? 'and its subdirectories' : ''}`);
    return txtFiles;
  } catch (error) {
    console.error(`❌ Error searching for txt files in ${directory}:`, error.message);
    return {};
  }
}

/**
 * Append detected address to corresponding txt file
 * @param {string} filePath - Path to the media file 
 * @param {string} address - Detected Solana address
 * @param {object} txtFileMap - Map of txt files
 * @returns {boolean} Success or failure
 */
function appendToTxtFile(filePath, address, txtFileMap) {
  try {
    // Extract the base name without extension
    const baseName = path.basename(filePath, path.extname(filePath));
    
    // Check if we have a matching txt file
    if (txtFileMap[baseName]) {
      // Read existing content first to avoid duplicate entries
      const existingContent = fs.readFileSync(txtFileMap[baseName], 'utf8');
      const lines = existingContent.split('\n');
      
      // Check if address already exists in the file
      if (!lines.some(line => line.trim() === address.trim())) {
        // Append the address without timestamp
        fs.appendFileSync(txtFileMap[baseName], `\n${address}`);
        console.log(`📝 Appended address to existing file: ${txtFileMap[baseName]}`);
      } else {
        console.log(`⚠️ Address already exists in ${txtFileMap[baseName]}, skipping`);
      }
      return true;
    } else {
      // Create a new txt file in the same directory as the media file
      const newTxtFile = path.join(path.dirname(filePath), `${baseName}.txt`);
      fs.writeFileSync(newTxtFile, `${address}`);
      console.log(`📝 Created new txt file: ${newTxtFile}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error appending to txt file:`, error.message);
    return false;
  }
}

/**
 * Process a single file using SolanaOCR
 * @param {string} filePath - Path to the media file
 * @param {object} txtFileMap - Map of txt files
 * @param {string} tempDir - Directory for temporary files
 * @returns {Promise<boolean>} Success or failure
 */
async function processFile(filePath, txtFileMap, tempDir = 'frames') {
  try {
    console.log(`\n🔍 Processing: ${filePath}`);
    
    // Create temporary directories if they don't exist
    const frameDir = path.join(tempDir, path.basename(filePath, path.extname(filePath)));
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    if (!fs.existsSync(frameDir)) {
      fs.mkdirSync(frameDir, { recursive: true });
    }
    
    // Create a new instance of SolanaOCR with unique frame directory
    const ocr = new SolanaOCR({
      frameDir: frameDir, // Use unique directory for each file to avoid conflicts
      frameRate: 1, // Extract 1 frame per second
      outputFile: path.join(tempDir, `${path.basename(filePath, path.extname(filePath))}_address.txt`) // Unique temporary file
    });
    
    // Process the file
    const result = await ocr.processFile(filePath);
    
    // Clean up the frame directory for this specific file
    cleanupDirectory(frameDir);
    
    // Handle the result
    if (result.success) {
      console.log(`✅ Detected Solana address: ${result.address}`);
      
      // Append to txt file
      const appendResult = appendToTxtFile(filePath, result.address, txtFileMap);
      
      // Clean up the temporary output file if it exists
      const tempOutputFile = path.join(tempDir, `${path.basename(filePath, path.extname(filePath))}_address.txt`);
      if (fs.existsSync(tempOutputFile)) {
        fs.unlinkSync(tempOutputFile);
        console.log(`🧹 Deleted temporary output file: ${tempOutputFile}`);
      }
      
      if (appendResult) {
        return true;
      } else {
        console.error(`❌ Failed to save address for file: ${filePath}`);
        return false;
      }
    } else {
      console.error(`❌ Failed to detect Solana address in file: ${filePath}`);
      console.error(`   Error: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing file ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Clean up a directory by removing all files and subdirectories
 * @param {string} directory - Directory to clean up
 * @returns {boolean} Success or failure
 */
function cleanupDirectory(directory) {
  try {
    if (fs.existsSync(directory)) {
      console.log(`🧹 Cleaning up directory: ${directory}`);
      fs.rmSync(directory, { recursive: true, force: true });
      console.log(`✅ Removed directory: ${directory}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error cleaning up directory ${directory}:`, error.message);
    return false;
  }
}

/**
 * Process all files in specified directories and their subdirectories
 * @param {string[]} directories - Array of directory paths to process
 * @returns {Promise<void>}
 */
async function processDirectories(directories) {
  let totalProcessed = 0;
  let totalSuccess = 0;
  
  // Create a master map of all txt files across all directories
  const masterTxtFileMap = {};
  
  // First pass: collect all txt files from all directories and subdirectories
  for (const directory of directories) {
    console.log(`\n📂 Indexing txt files in: ${directory}`);
    if (!fs.existsSync(directory)) {
      console.error(`❌ Directory does not exist: ${directory}`);
      continue;
    }
    
    const txtFileMap = findTxtFilesInDirectory(directory, true);
    Object.assign(masterTxtFileMap, txtFileMap);
  }
  
  console.log(`\n📑 Total txt files indexed: ${Object.keys(masterTxtFileMap).length}`);
  
  // Create temporary directory for processing
  const tempRootDir = path.join(process.cwd(), 'temp_frames');
  if (!fs.existsSync(tempRootDir)) {
    fs.mkdirSync(tempRootDir, { recursive: true });
  }
  
  // Second pass: process all media files
  for (const directory of directories) {
    console.log(`\n📂 Processing directory: ${directory}`);
    
    if (!fs.existsSync(directory)) {
      console.error(`❌ Directory does not exist: ${directory}`);
      continue;
    }
    
    // Find all media files in the directory and subdirectories
    const mediaFiles = findMediaFilesInDirectory(directory, true);
    
    if (mediaFiles.length === 0) {
      console.log(`⚠️ Skipping directory: ${directory} - no media files found`);
      continue;
    }
    
    // Process each media file
    console.log(`\n🚀 Starting to process ${mediaFiles.length} files from ${directory}`);
    
    // Create a unique temp dir for this directory
    const dirHash = directory.replace(/[^a-z0-9]/gi, '_').substring(0, 20);
    const tempDir = path.join(tempRootDir, dirHash);
    
    for (const filePath of mediaFiles) {
      totalProcessed++;
      const success = await processFile(filePath, masterTxtFileMap, tempDir);
      if (success) totalSuccess++;
      
      // Optional: Add delay between processing files to avoid overloading the system
      // await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Clean up the temporary directory for this specific source directory
    cleanupDirectory(tempDir);
  }
  
  // Print summary
  console.log(`\n📊 Processing complete!`);
  console.log(`   Total files processed: ${totalProcessed}`);
  console.log(`   Successfully processed: ${totalSuccess}`);
  console.log(`   Failed: ${totalProcessed - totalSuccess}`);
  
  // Clean up temporary root directory
  console.log(`\n🧹 Cleaning up all temporary files...`);
  cleanupDirectory(tempRootDir);
  console.log(`✅ All temporary files have been removed`);
}

/**
 * Main function to run the Solana OCR tool
 */
async function main() {
  try {
    // Check if specific file is provided via command line
    const inputPath = process.argv[2];
    
    if (inputPath) {
      // Process a single file
      console.log(`🔍 Processing single file: ${inputPath}`);
      
      const tempDir = path.join(process.cwd(), 'frames');
      
      // Create frames directory if it doesn't exist
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const ocr = new SolanaOCR({
        frameDir: tempDir,
        frameRate: 1,
        outputFile: 'detected_address.txt'
      });
      
      const result = await ocr.processFile(inputPath);
      
      if (result.success) {
        console.log(`\n🚀 Successfully detected Solana address: ${result.address}`);
        console.log(`📄 Address saved to: ${result.file}`);
        
        // Clean up temporary files after successful processing
        console.log(`\n🧹 Cleaning up temporary files...`);
        cleanupDirectory(tempDir);
        
        // Remove the output file if needed
        if (fs.existsSync('detected_address.txt')) {
          fs.unlinkSync('detected_address.txt');
          console.log(`✅ Removed temporary output file: detected_address.txt`);
        }
        
        process.exit(0);
      } else {
        console.error(`\n❌ Failed to detect Solana address: ${result.error}`);
        
        // Clean up temporary files even after failure
        console.log(`\n🧹 Cleaning up temporary files...`);
        cleanupDirectory(tempDir);
        
        process.exit(1);
      }
    } else {
      // Process specified directories
      const directories = [
        '../../../../twitter-scrapper/custom-scrapper/tweet_images/',
        '../../../../twitter-scrapper/custom-scrapper/tweet_videos/'
      ];
      
      console.log('🔄 No input file specified, processing directories:');
      directories.forEach(dir => console.log(`   - ${dir}`));
      
      await processDirectories(directories);
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message || error);
    
    // Clean up any potentially left-over temporary files on error
    console.log(`\n🧹 Attempting to clean up temporary files after error...`);
    const tempRootDir = path.join(process.cwd(), 'temp_frames');
    cleanupDirectory(tempRootDir);
    
    const framesDir = path.join(process.cwd(), 'frames');
    cleanupDirectory(framesDir);
    
    process.exit(1);
  }
}

// Run the main function
main();