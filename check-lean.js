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

let totalWithout = 0;
let totalWith = 0;
let totalMutated = 0;
let filesWithout = [];

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf8');

  const queryRegex = /([A-Z]\w+)\.(find|findOne|findById)\s*\(/g;
  let match;
  let fileWithout = 0;

  while ((match = queryRegex.exec(content)) !== null) {
    const model = match[1];
    const method = match[2];
    const queryStart = match.index;

    // Skip non-Mongoose
    const fullMethodArea = content.substring(queryStart + model.length + 1, queryStart + model.length + 30);
    if (/^findOneAndUpdate|^findByIdAndUpdate|^findOneAndDelete|^findByIdAndDelete/.test(fullMethodArea)) continue;
    if (['Array', 'Object', 'Promise', 'String', 'Number', 'Date', 'Math', 'JSON', 'RegExp', 'Error', 'Map', 'Set', 'Buffer'].includes(model)) continue;

    // Check for array callback
    if (method === 'find') {
      const afterParen = content.substring(queryStart + model.length + 6).trimStart();
      if (/^[a-z_]\w*\s*=>/.test(afterParen) || /^\(\s*[a-z_]/.test(afterParen) || /^function/.test(afterParen)) continue;
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
      if (depth < -1) break;
      pos++;
    }

    if (semicolonPos === -1) continue;

    const queryStr = content.substring(queryStart, semicolonPos + 1);

    if (queryStr.includes('.lean()')) {
      totalWith++;
    } else {
      totalWithout++;
      fileWithout++;

      // Check if it's a mutated variable
      const beforeQuery = content.substring(Math.max(0, queryStart - 300), queryStart);
      const varMatch = beforeQuery.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?$/);
      if (varMatch) {
        const varName = varMatch[1];
        const afterQuery = content.substring(semicolonPos + 1, Math.min(content.length, semicolonPos + 3000));
        if (afterQuery.includes(`${varName}.save(`) ||
            afterQuery.includes(`${varName}.markModified(`) ||
            new RegExp(`\\b${varName}\\.[a-zA-Z_]\\w*\\s*=[^=>]`).test(afterQuery)) {
          totalMutated++;
          fileWithout--; // Don't count these
        }
      }
    }
  }

  if (fileWithout > 0) {
    filesWithout.push({ file: path.relative(__dirname, filePath), count: fileWithout });
  }
}

console.log(`Queries WITH .lean(): ${totalWith}`);
console.log(`Queries WITHOUT .lean() (mutated vars): ${totalMutated}`);
console.log(`Queries WITHOUT .lean() (non-mutated, need .lean()): ${totalWithout - totalMutated}`);
console.log(`\nFiles with remaining queries:`);
filesWithout.sort((a, b) => b.count - a.count);
for (const f of filesWithout) {
  console.log(`  ${f.file}: ${f.count}`);
}
