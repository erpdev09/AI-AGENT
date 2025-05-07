const fs = require('fs');
const path = require('path');
const pool = require('../../../../config/dbconnect'); // Assuming this is the correct path to your PostgreSQL pool connector
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
    
    for (const file of files) {
      const fullPath = path.join(directory, file);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory() && recursive) {
        console.log(`📂 Entering subdirectory: ${fullPath}`);
        const subDirFiles = findMediaFilesInDirectory(fullPath, recursive);
        mediaFiles = mediaFiles.concat(subDirFiles);
      } else if (stats.isFile()) {
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
    
    for (const file of files) {
      const fullPath = path.join(directory, file);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory() && recursive) {
        const subDirTxtFiles = findTxtFilesInDirectory(fullPath, recursive);
        Object.assign(txtFiles, subDirTxtFiles);
      } else if (stats.isFile() && path.extname(file).toLowerCase() === '.txt') {
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
    const baseName = path.basename(filePath, path.extname(filePath));
    
    if (txtFileMap[baseName]) {
      const existingContent = fs.readFileSync(txtFileMap[baseName], 'utf8');
      const lines = existingContent.split('\n');
      
      if (!lines.some(line => line.trim() === address.trim())) {
        fs.appendFileSync(txtFileMap[baseName], `\n${address}`);
        console.log(`📝 Appended address to existing file: ${txtFileMap[baseName]}`);
      } else {
        console.log(`⚠️ Address already exists in ${txtFileMap[baseName]}, skipping`);
      }
      return true;
    } else {
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
    
    const frameDir = path.join(tempDir, path.basename(filePath, path.extname(filePath)));
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    if (!fs.existsSync(frameDir)) {
      fs.mkdirSync(frameDir, { recursive: true });
    }
    
    const ocr = new SolanaOCR({
      frameDir: frameDir,
      frameRate: 1,
      outputFile: path.join(tempDir, `${path.basename(filePath, path.extname(filePath))}_address.txt`)
    });
    
    const result = await ocr.processFile(filePath);
    
    cleanupDirectory(frameDir);
    
    if (result.success) {
      console.log(`✅ Detected Solana address: ${result.address}`);
      
      const appendResult = appendToTxtFile(filePath, result.address, txtFileMap);
      
      const tempOutputFile = path.join(tempDir, `${path.basename(filePath, path.extname(filePath))}_address.txt`);
      if (fs.existsSync(tempOutputFile)) {
        fs.unlinkSync(tempOutputFile);
        console.log(`🧹 Deleted temporary output file: ${tempOutputFile}`);
      }
      
      return appendResult;
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
 * Insert tweet data from txt files into the tweets1 table
 * @param {string} directory - Directory containing txt files
 * @param {boolean} recursive - Whether to search subdirectories
 * @returns {Promise<void>}
 */
async function insertToDb(directory, recursive = true) {
  try {
    console.log(`\n📊 Starting database insertion for txt files in: ${directory}`);

    const txtFileMap = findTxtFilesInDirectory(directory, recursive);

    if (Object.keys(txtFileMap).length === 0) {
      console.log(`⚠️ No txt files found in ${directory}`);
      return;
    }

    let totalInserted = 0;
    let totalFailed = 0;

    for (const [baseName, filePath] of Object.entries(txtFileMap)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8').trim();
        if (!content) {
          console.warn(`⚠️ Empty file: ${filePath}, skipping`);
          totalFailed++;
          continue;
        }

        const tweet_id = baseName;
        const usernameMatch = content.match(/@(\w+)/);
        const user_name = usernameMatch ? usernameMatch[1] : null;
        const tweet_content = content;
        const tweet_link = `https://x.com/status/${tweet_id}`;
        const atCount = (content.match(/@/g) || []).length;
        const is_replied_tweet = atCount >= 2;
        const is_direct_tag = false;
        const action_perform = false;

        if (!tweet_id || !user_name || !tweet_content || !tweet_link) {
          console.error(`❌ Missing required fields for ${filePath}:`, {
            tweet_id,
            user_name,
            tweet_content,
            tweet_link
          });
          totalFailed++;
          continue;
        }

        const query = `
          INSERT INTO tweets1 (
            tweet_id,
            user_name,
            tweet_content,
            tweet_link,
            is_replied_tweet,
            is_direct_tag,
            action_perform
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (tweet_id) DO NOTHING
          RETURNING tweet_id;
        `;

        const values = [
          tweet_id,
          user_name,
          tweet_content,
          tweet_link,
          is_replied_tweet,
          is_direct_tag,
          action_perform
        ];

        const result = await pool.query(query, values);

        if (result.rowCount > 0) {
          console.log(`✅ Successfully inserted tweet_id: ${tweet_id}`);
          totalInserted++;
        } else {
          console.log(`⚠️ Tweet_id ${tweet_id} already exists, skipped`);
        }
      } catch (error) {
        console.error(`❌ Error processing file ${filePath}:`, error.message);
        totalFailed++;
      }
    }

    console.log(`\n📊 Database insertion complete!`);
    console.log(`   Total files processed: ${Object.keys(txtFileMap).length}`);
    console.log(`   Successfully inserted: ${totalInserted}`);
    console.log(`   Failed or skipped: ${totalFailed}`);

  } catch (error) {
    console.error(`❌ Error during database insertion:`, error.message);
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
  
  const masterTxtFileMap = {};
  
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
  
  const tempRootDir = path.join(process.cwd(), 'temp_frames');
  if (!fs.existsSync(tempRootDir)) {
    fs.mkdirSync(tempRootDir, { recursive: true });
  }
  
  for (const directory of directories) {
    console.log(`\n📂 Processing directory: ${directory}`);
    
    if (!fs.existsSync(directory)) {
      console.error(`❌ Directory does not exist: ${directory}`);
      continue;
    }
    
    const mediaFiles = findMediaFilesInDirectory(directory, true);
    
    if (mediaFiles.length === 0) {
      console.log(`⚠️ Skipping directory: ${directory} - no media files found`);
      continue;
    }
    
    console.log(`\n🚀 Starting to process ${mediaFiles.length} files from ${directory}`);
    
    const dirHash = directory.replace(/[^a-z0-9]/gi, '_').substring(0, 20);
    const tempDir = path.join(tempRootDir, dirHash);
    
    for (const filePath of mediaFiles) {
      totalProcessed++;
      const success = await processFile(filePath, masterTxtFileMap, tempDir);
      if (success) totalSuccess++;
    }
    
    cleanupDirectory(tempDir);
    
    // Insert processed txt files into database
    await insertToDb(directory, true);
  }
  
  console.log(`\n📊 Processing complete!`);
  console.log(`   Total files processed: ${totalProcessed}`);
  console.log(`   Successfully processed: ${totalSuccess}`);
  console.log(`   Failed: ${totalProcessed - totalSuccess}`);
  
  console.log(`\n🧹 Cleaning up all temporary files...`);
  cleanupDirectory(tempRootDir);
  console.log(`✅ All temporary files have been removed`);
}

/**
 * Main function to run the Solana OCR and database insertion tool
 */
async function main() {
  try {
    const inputPath = process.argv[2];
    
    if (inputPath) {
      console.log(`🔍 Processing single file: ${inputPath}`);
      
      const tempDir = path.join(process.cwd(), 'frames');
      
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
        
        console.log(`\n🧹 Cleaning up temporary files...`);
        cleanupDirectory(tempDir);
        
        if (fs.existsSync('detected_address.txt')) {
          fs.unlinkSync('detected_address.txt');
          console.log(`✅ Removed temporary output file: detected_address.txt`);
        }
        
        // Insert into database (assuming the txt file was created in the same directory as input)
        const inputDir = path.dirname(inputPath);
        await insertToDb(inputDir, false);
        
        process.exit(0);
      } else {
        console.error(`\n❌ Failed to detect Solana address: ${result.error}`);
        
        console.log(`\n🧹 Cleaning up temporary files...`);
        cleanupDirectory(tempDir);
        
        process.exit(1);
      }
    } else {
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