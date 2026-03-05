const fs = require('fs');
const path = require('path');

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

  // Find all Mongoose query starts (find, findOne, findById)
  // that don't already have .lean() in their chain
  // Skip findOneAndUpdate etc.

  // Strategy: use regex to find query blocks (from Model.find... to the closing ;)
  // and add .lean() before the ;

  // Build set of variables that are mutated later
  const lines = content.split('\n');
  const savedVars = new Set();

  // Collect variables that are saved/modified
  for (const line of lines) {
    const saveMatch = line.match(/(\w+)\.save\s*\(/);
    if (saveMatch) savedVars.add(saveMatch[1]);
    const modMatch = line.match(/(\w+)\.markModified\s*\(/);
    if (modMatch) savedVars.add(modMatch[1]);
  }

  // Use a regex approach on the full content
  // Match patterns like:
  // const/let x = await Model.find(...).chain(...)...;
  // or just Model.find(...)...;
  // across multiple lines

  // We'll find all occurrences of .find(, .findOne(, .findById( and trace to the ;

  let changes = 0;

  // Process multi-line queries by finding query start positions
  const queryStartRegex = /(\w+)\.(find|findOne|findById)\s*\(/g;
  let match;
  let positions = []; // Track positions where we need to add .lean()

  while ((match = queryStartRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const model = match[1];
    const method = match[2];
    const startPos = match.index;

    // Skip if it's an array method (preceded by non-model chars)
    // Check what's before: should be a Model name (capitalized) or a variable
    // Skip Array.find patterns - check context
    const beforeStart = content.substring(Math.max(0, startPos - 100), startPos);

    // Skip findOneAndUpdate etc
    const afterMethod = content.substring(startPos + model.length + 1);
    if (/^findOneAndUpdate|^findByIdAndUpdate|^findOneAndDelete|^findByIdAndDelete/.test(afterMethod)) {
      continue;
    }

    // Check if it's an array .find with callback
    const afterFind = content.substring(match.index + match[0].length);
    if (/^\s*[\w(]/.test(afterFind)) {
      // Could be Array.find(callback) - check if first char after ( suggests callback
      // Find the content after the opening paren
      const restAfterParen = afterFind.trim();
      if (/^[a-z_]\w*\s*=>/.test(restAfterParen) || /^\(/.test(restAfterParen) || /^function/.test(restAfterParen)) {
        // Likely an array callback, but only for .find() not .findOne/.findById
        if (method === 'find') {
          // Check more carefully - Mongoose .find() takes an object, not a callback usually
          // If it's like .find(item => ...) it's array
          if (/^[a-z_]\w*\s*=>/.test(restAfterParen)) {
            continue;
          }
        }
      }
    }

    // Find the semicolon that ends this statement
    // Need to track parens/brackets to find the right ;
    let depth = 0;
    let pos = startPos;
    let semicolonPos = -1;
    let inString = false;
    let stringChar = '';
    let inTemplate = false;
    let templateDepth = 0;

    while (pos < content.length) {
      const ch = content[pos];

      if (inString) {
        if (ch === '\\') { pos += 2; continue; }
        if (ch === stringChar) inString = false;
        pos++;
        continue;
      }

      if (ch === "'" || ch === '"') {
        inString = true;
        stringChar = ch;
        pos++;
        continue;
      }

      if (ch === '`') {
        inTemplate = !inTemplate;
        pos++;
        continue;
      }

      if (ch === '(' || ch === '[' || ch === '{') depth++;
      if (ch === ')' || ch === ']' || ch === '}') depth--;

      if (ch === ';' && depth <= 0) {
        semicolonPos = pos;
        break;
      }

      pos++;
    }

    if (semicolonPos === -1) continue;

    // Get the full query string
    const queryStr = content.substring(startPos, semicolonPos + 1);

    // Skip if already has .lean()
    if (queryStr.includes('.lean()')) continue;

    // Skip if it's clearly an array operation
    if (/\.find\(\s*[a-z_]\w*\s*=>/i.test(queryStr) && method === 'find') continue;
    if (/\.find\(\s*\(/i.test(queryStr) && method === 'find') continue;

    // Check the variable name assigned
    const beforeQuery = content.substring(Math.max(0, startPos - 200), startPos);
    const varMatch = beforeQuery.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?$/);

    if (varMatch) {
      const varName = varMatch[1];
      // Check if this variable is mutated
      if (savedVars.has(varName)) continue;

      // Check subsequent code for mutations
      const afterQuery = content.substring(semicolonPos + 1, Math.min(content.length, semicolonPos + 3000));
      const afterLines = afterQuery.split('\n');
      let isMutated = false;

      for (let j = 0; j < Math.min(afterLines.length, 80); j++) {
        const checkLine = afterLines[j];
        if (checkLine.includes(`${varName}.save(`) || checkLine.includes(`${varName}.markModified(`)) {
          isMutated = true;
          break;
        }
        // Property assignment
        const propAssign = new RegExp(`\\b${varName}\\.\\w+\\s*=[^=]`);
        const propCompare = new RegExp(`\\b${varName}\\.\\w+\\s*(===|!==|>=|<=)`);
        if (propAssign.test(checkLine) && !propCompare.test(checkLine)) {
          isMutated = true;
          break;
        }
        // .push() on array fields
        if (new RegExp(`\\b${varName}\\.\\w+\\.push\\(`).test(checkLine)) {
          isMutated = true;
          break;
        }
        // .pull() on array fields
        if (new RegExp(`\\b${varName}\\.\\w+\\.pull\\(`).test(checkLine)) {
          isMutated = true;
          break;
        }
      }

      if (isMutated) continue;
    }

    // Also skip if it's part of a let declaration (might be reassigned/mutated)
    // Actually let's be more careful: check if the variable name is used with .save() anywhere in the function

    // Add .lean() before the semicolon
    // Find the position of the last ) before ;
    let insertPos = semicolonPos;
    // Walk backwards from ; to find where to insert .lean()
    // Skip whitespace before ;
    let p = semicolonPos - 1;
    while (p >= startPos && /\s/.test(content[p])) p--;

    // The char at p should be ) or something similar
    // Insert .lean() after position p (before any whitespace and ;)
    insertPos = p + 1;

    positions.push(insertPos);
  }

  // Apply changes in reverse order to preserve positions
  positions.sort((a, b) => b - a);

  // Remove duplicates
  const uniquePositions = [...new Set(positions)];

  for (const pos of uniquePositions) {
    content = content.substring(0, pos) + '.lean()' + content.substring(pos);
    changes++;
  }

  if (changes > 0 && content !== original) {
    // Verify we didn't double-add .lean().lean()
    content = content.replace(/\.lean\(\)\.lean\(\)/g, '.lean()');

    fs.writeFileSync(filePath, content, 'utf8');
    totalChanges += changes;
    changedFiles.push({ file: path.relative(__dirname, filePath), changes });
  }
}

console.log(`Total changes: ${totalChanges}`);
console.log(`Files changed: ${changedFiles.length}`);
for (const f of changedFiles) {
  console.log(`  ${f.file}: ${f.changes} changes`);
}
