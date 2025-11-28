const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Get temp directory
const tempDir = os.tmpdir();
const metroCachePath = path.join(tempDir, 'metro-cache');

console.log('Clearing Metro cache...');

// Function to delete directory recursively with retries
function deleteDirectory(dirPath, retries = 3) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Cache directory doesn't exist: ${dirPath}`);
    return;
  }

  for (let i = 0; i < retries; i++) {
    try {
      // On Windows, use rmdir with /s /q for more reliable deletion
      if (process.platform === 'win32') {
        try {
          execSync(`rmdir /s /q "${dirPath}"`, { stdio: 'ignore' });
        } catch (e) {
          // If rmdir fails, try using Node's fs methods with delay
          if (i < retries - 1) {
            console.log(`Attempt ${i + 1} failed, retrying in 1 second...`);
            // Wait a bit before retrying
            execSync('timeout /t 1 /nobreak >nul 2>&1', { stdio: 'ignore' });
            continue;
          }
          // Last attempt: try to delete individual files
          deleteDirectoryRecursive(dirPath);
        }
      } else {
        // Unix-like systems
        execSync(`rm -rf "${dirPath}"`, { stdio: 'ignore' });
      }
      console.log('Metro cache cleared successfully!');
      return;
    } catch (error) {
      if (i === retries - 1) {
        console.warn(`Warning: Could not fully clear cache at ${dirPath}`);
        console.warn('You may need to manually delete it or close any processes using it.');
      }
    }
  }
}

// Recursive deletion using Node.js fs methods
function deleteDirectoryRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        deleteDirectoryRecursive(filePath);
      } else {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          // File might be locked, skip it
        }
      }
    }
    try {
      fs.rmdirSync(dirPath);
    } catch (e) {
      // Directory might not be empty, that's okay
    }
  } catch (error) {
    // Ignore errors, just try to delete what we can
  }
}

// Clear Metro cache
deleteDirectory(metroCachePath);

// Also clear .expo cache in the project
const projectRoot = path.resolve(__dirname, '..');
const expoCachePath = path.join(projectRoot, '.expo');

if (fs.existsSync(expoCachePath)) {
  console.log('Clearing .expo cache...');
  deleteDirectory(expoCachePath);
}

console.log('Cache clearing complete!');

