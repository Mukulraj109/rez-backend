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

// Find the function boundary (end) from a given position
function findFunctionEnd(content, startPos) {
  // Walk forward tracking brace depth
  // First find the opening brace of the enclosing function
  let braceDepth = 0;
  let pos = startPos;

  // We need to find where we are in the brace nesting
  // Count from the beginning up to startPos
  let inString = false;
  let stringChar = '';
  let currentDepth = 0;

  // Find depth at startPos
  for (let i = 0; i < startPos; i++) {
    const ch = content[i];
    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === stringChar) inString = false;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === '{') currentDepth++;
    if (ch === '}') currentDepth--;
  }

  // Now find where this depth level's brace closes
  const targetDepth = currentDepth - 1;
  inString = false;
  pos = startPos;

  while (pos < content.length) {
    const ch = content[pos];
    if (inString) {
      if (ch === '\\') { pos++; pos++; continue; }
      if (ch === stringChar) inString = false;
      pos++;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inString = true;
      stringChar = ch;
      pos++;
      continue;
    }
    if (ch === '{') currentDepth++;
    if (ch === '}') {
      currentDepth--;
      if (currentDepth <= targetDepth) return pos;
    }
    pos++;
  }

  return content.length;
}

// Check if a variable is mutated between startPos and endPos
function isVarMutated(content, varName, startPos, endPos) {
  const section = content.substring(startPos, endPos);

  if (section.includes(`${varName}.save(`)) return true;
  if (section.includes(`${varName}.markModified(`)) return true;
  if (section.includes(`${varName}.remove(`)) return true;
  if (section.includes(`${varName}.deleteOne(`)) return true;

  // Property assignment
  const propAssignRegex = new RegExp(`\\b${varName}\\.[a-zA-Z_]\\w*\\s*=[^=>]`);
  const compRegex = new RegExp(`\\b${varName}\\.[a-zA-Z_]\\w*\\s*(===|!==|>=|<=|==|!=)`);

  const lines = section.split('\n');
  for (const line of lines) {
    if (propAssignRegex.test(line) && !compRegex.test(line)) return true;
    if (new RegExp(`\\b${varName}\\.[a-zA-Z_]\\w+\\.push\\(`).test(line)) return true;
    if (new RegExp(`\\b${varName}\\.[a-zA-Z_]\\w+\\.pull\\(`).test(line)) return true;
    if (new RegExp(`\\(${varName}\\s+as\\s+any\\)`).test(line)) return true;
    if (new RegExp(`\\b${varName}\\.[a-zA-Z_]\\w+\\.splice\\(`).test(line)) return true;
  }

  return false;
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

  let insertPositions = [];

  const queryRegex = /([A-Z]\w+)\.(find|findOne|findById)\s*\(/g;
  let match;

  while ((match = queryRegex.exec(content)) !== null) {
    const model = match[1];
    const method = match[2];
    const queryStart = match.index;

    // Skip non-Mongoose operations
    const fullMethodArea = content.substring(queryStart + model.length + 1, queryStart + model.length + 30);
    if (/^findOneAndUpdate|^findByIdAndUpdate|^findOneAndDelete|^findByIdAndDelete|^findOneAndRemove|^findByIdAndRemove/.test(fullMethodArea)) {
      continue;
    }

    if (['Array', 'Object', 'Promise', 'String', 'Number', 'Date', 'Math', 'JSON', 'RegExp', 'Error', 'Map', 'Set', 'Buffer'].includes(model)) {
      continue;
    }

    // Find the statement end
    let depth = 0;
    let pos = queryStart;
    let semicolonPos = -1;
    let inString = false;
    let stringChar = '';

    while (pos < content.length) {
      const ch = content[pos];
      if (inString) {
        if (ch === '\\') { pos += 2; continue; }
        if (ch === stringChar) inString = false;
        pos++;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        inString = true;
        stringChar = ch;
        pos++;
        continue;
      }
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      if (ch === ')' || ch === ']' || ch === '}') depth--;
      if (ch === ';' && depth <= 0) {
        semicolonPos = pos;
        break;
      }
      if (depth < 0) break;
      pos++;
    }

    if (semicolonPos === -1) continue;

    const queryStr = content.substring(queryStart, semicolonPos + 1);
    if (queryStr.includes('.lean()')) continue;

    // Skip array callbacks
    if (method === 'find') {
      const afterFindParen = content.substring(queryStart + model.length + 6).trimStart();
      if (/^[a-z_]\w*\s*=>/.test(afterFindParen) || /^\(\s*[a-z_]/.test(afterFindParen) || /^function/.test(afterFindParen)) {
        continue;
      }
    }

    // Find variable name
    const beforeQuery = content.substring(Math.max(0, queryStart - 300), queryStart);
    const varMatch = beforeQuery.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?$/);

    if (varMatch) {
      const varName = varMatch[1];

      // Find function end from query position
      const funcEnd = findFunctionEnd(content, semicolonPos + 1);

      // Check if var is mutated only within this function scope
      if (isVarMutated(content, varName, semicolonPos + 1, funcEnd)) {
        continue;
      }
    }

    // Find insertion point
    let p = semicolonPos - 1;
    while (p >= queryStart && /\s/.test(content[p])) p--;
    const insertPos = p + 1;

    insertPositions.push(insertPos);
  }

  insertPositions.sort((a, b) => b - a);
  const uniquePositions = [...new Set(insertPositions)];

  let changes = 0;
  for (const pos of uniquePositions) {
    content = content.substring(0, pos) + '.lean()' + content.substring(pos);
    changes++;
  }

  if (changes > 0 && content !== original) {
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
