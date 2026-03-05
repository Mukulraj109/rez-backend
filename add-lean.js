const fs = require('fs');
const path = require('path');

// Get all .ts files from controllers and services
function getFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else if (entry.name.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const srcDir = path.join(__dirname, 'src');
const dirs = ['controllers', 'services'];
let allFiles = [];
for (const d of dirs) {
  const dirPath = path.join(srcDir, d);
  if (fs.existsSync(dirPath)) {
    allFiles = allFiles.concat(getFiles(dirPath));
  }
}

let totalChanges = 0;
let changedFiles = [];

for (const filePath of allFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // We need to find Mongoose query patterns and add .lean() if:
  // 1. It's a read-only query (find, findOne, findById)
  // 2. It doesn't already have .lean()
  // 3. The result is NOT later used with .save()
  // 4. NOT findOneAndUpdate, findByIdAndUpdate, etc.

  // Strategy: Find lines with .find(, .findOne(, .findById( that don't have .lean()
  // Check if the variable assigned is later .save()'d

  const lines = content.split('\n');

  // First pass: identify all variable names that get .save() called on them
  const savedVars = new Set();
  for (const line of lines) {
    // Match patterns like: variable.save(), await variable.save()
    const saveMatch = line.match(/(\w+)\.save\s*\(/);
    if (saveMatch) {
      savedVars.add(saveMatch[1]);
    }
    // Also match: variable.markModified, variable.set(
    const modifyMatch = line.match(/(\w+)\.(markModified|set)\s*\(/);
    if (modifyMatch) {
      savedVars.add(modifyMatch[1]);
    }
  }

  // Also check for patterns where result is modified: result.field = value
  // Look for assignments to properties of variables that were from queries

  let newLines = [];
  let changeCount = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Skip lines that already have .lean()
    if (line.includes('.lean()')) {
      newLines.push(line);
      continue;
    }

    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
      newLines.push(line);
      continue;
    }

    // Skip findOneAndUpdate, findByIdAndUpdate, etc.
    if (/findOneAndUpdate|findByIdAndUpdate|findOneAndDelete|findByIdAndDelete|findOneAndRemove|findByIdAndRemove/.test(line)) {
      newLines.push(line);
      continue;
    }

    // Skip Array.find patterns (callbacks with arrow functions directly)
    // e.g., someArray.find(item => ...) or DEFINITIONS.find(def =>
    if (/\.\bfind\b\(\s*(\w+)\s*=>|\.\bfind\b\(\s*\(|\.\bfind\b\(\s*function/.test(line)) {
      newLines.push(line);
      continue;
    }

    // Check if this line has a Mongoose query
    const queryMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*await\s+\w+\.(find|findOne|findById)\s*\(/);

    if (queryMatch) {
      const varName = queryMatch[1];

      // Check if this variable is later saved/modified
      if (savedVars.has(varName)) {
        newLines.push(line);
        continue;
      }

      // Check next few lines for .save() on this variable
      let isSaved = false;
      for (let j = i + 1; j < Math.min(i + 50, lines.length); j++) {
        if (lines[j].includes(`${varName}.save(`) ||
            lines[j].includes(`${varName}.markModified(`) ||
            lines[j].includes(`${varName}.set(`) ||
            // Check for property assignments like varName.field =
            new RegExp(`\\b${varName}\\.[a-zA-Z]\\w*\\s*=\\s*`).test(lines[j]) ||
            new RegExp(`\\b${varName}\\.[a-zA-Z]\\w*\\.[a-zA-Z]\\w*\\s*=\\s*`).test(lines[j])) {
          // But not if it's just reading: varName.field === or varName.field !== or varName.field?.
          const assignLine = lines[j];
          if (new RegExp(`\\b${varName}\\.\\w+\\s*=[^=]`).test(assignLine) &&
              !new RegExp(`\\b${varName}\\.\\w+\\s*===`).test(assignLine) &&
              !new RegExp(`\\b${varName}\\.\\w+\\s*!==`).test(assignLine)) {
            isSaved = true;
            break;
          }
          if (lines[j].includes(`${varName}.save(`) || lines[j].includes(`${varName}.markModified(`)) {
            isSaved = true;
            break;
          }
        }
      }

      if (isSaved) {
        newLines.push(line);
        continue;
      }
    }

    // Now try to add .lean() to query chains
    // Pattern 1: Single line query ending with ;
    // e.g., await Model.find({...}).populate('x').sort({...});
    // Add .lean() before the final ;

    const singleLineQuery = /(\w+\.(find|findOne|findById)\s*\([^)]*\)(?:\s*\.\w+\s*\([^)]*\))*)\s*;/.test(line);

    if (singleLineQuery && /\b(find|findOne|findById)\b\(/.test(line) && !line.includes('.lean()')) {
      // Don't add to Array.find patterns
      if (/\.\bfind\b\(\s*\w+\s*=>/.test(line) || /\.\bfind\b\(\(\s*\w+/.test(line)) {
        newLines.push(line);
        continue;
      }

      // Check if variable is saved later
      const varMatch2 = line.match(/(?:const|let|var)\s+(\w+)/);
      if (varMatch2 && savedVars.has(varMatch2[1])) {
        newLines.push(line);
        continue;
      }

      // Check more carefully for property mutations
      if (varMatch2) {
        const vn = varMatch2[1];
        let isMutated = false;
        for (let j = i + 1; j < Math.min(i + 80, lines.length); j++) {
          const checkLine = lines[j];
          if (checkLine.includes(`${vn}.save(`) || checkLine.includes(`${vn}.markModified(`)) {
            isMutated = true;
            break;
          }
          // property assignment (but not comparison)
          const propAssign = new RegExp(`\\b${vn}\\.\\w+\\s*=[^=]`);
          const propCompare = new RegExp(`\\b${vn}\\.\\w+\\s*===`);
          if (propAssign.test(checkLine) && !propCompare.test(checkLine)) {
            isMutated = true;
            break;
          }
        }
        if (isMutated) {
          newLines.push(line);
          continue;
        }
      }

      // Add .lean() before the semicolon at end of chain
      line = line.replace(/(\))\s*;(\s*)$/, '$1.lean();$2');
      changeCount++;
    }

    newLines.push(line);
  }

  // Handle multi-line queries
  // We need a second pass for multi-line patterns
  let result = newLines.join('\n');

  if (changeCount > 0) {
    fs.writeFileSync(filePath, result, 'utf8');
    totalChanges += changeCount;
    changedFiles.push({ file: path.relative(__dirname, filePath), changes: changeCount });
  }
}

console.log(`Total changes: ${totalChanges}`);
console.log(`Files changed: ${changedFiles.length}`);
for (const f of changedFiles) {
  console.log(`  ${f.file}: ${f.changes} changes`);
}
