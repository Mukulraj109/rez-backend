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

// Known model names (uppercase first letter)
const MODEL_PATTERN = /[A-Z]\w+/;

for (const filePath of allFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Find all query positions needing .lean()
  let insertPositions = [];

  // Regex to find Mongoose query starts
  const queryRegex = /([A-Z]\w+)\.(find|findOne|findById)\s*\(/g;
  let match;

  while ((match = queryRegex.exec(content)) !== null) {
    const model = match[1];
    const method = match[2];
    const queryStart = match.index;

    // Skip update/delete operations
    const fullMethodArea = content.substring(queryStart + model.length + 1, queryStart + model.length + 30);
    if (/^findOneAndUpdate|^findByIdAndUpdate|^findOneAndDelete|^findByIdAndDelete|^findOneAndRemove|^findByIdAndRemove/.test(fullMethodArea)) {
      continue;
    }

    // Skip known non-Model names
    if (['Array', 'Object', 'Promise', 'String', 'Number', 'Date', 'Math', 'JSON', 'RegExp', 'Error', 'Map', 'Set', 'Buffer'].includes(model)) {
      continue;
    }

    // Find the statement end (;)
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

      // If we hit a new statement/declaration without finding ;, stop
      if (depth < 0) break;

      pos++;
    }

    if (semicolonPos === -1) continue;

    // Get the full query string
    const queryStr = content.substring(queryStart, semicolonPos + 1);

    // Skip if already has .lean()
    if (queryStr.includes('.lean()')) continue;

    // Check if it's an Array .find callback pattern
    if (method === 'find') {
      // Check content inside the find parens
      const afterFindParen = content.substring(queryStart + model.length + 6); // After ".find("
      const firstNonSpace = afterFindParen.trimStart();
      if (/^[a-z_]\w*\s*=>/.test(firstNonSpace) || /^\(\s*[a-z_]/.test(firstNonSpace) || /^function/.test(firstNonSpace)) {
        continue;
      }
    }

    // Find the variable name this is assigned to
    const beforeQuery = content.substring(Math.max(0, queryStart - 300), queryStart);
    const varMatch = beforeQuery.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?$/);

    // Also check for patterns without const/let (just assignment or inline)
    const assignMatch = beforeQuery.match(/(\w+)\s*=\s*(?:await\s+)?$/);

    let varName = null;
    let isLetVar = false;
    if (varMatch) {
      varName = varMatch[1];
      isLetVar = /let\s+/.test(varMatch[0]);
    } else if (assignMatch) {
      varName = assignMatch[1];
    }

    // If we have a variable name, check if it's mutated within its scope
    if (varName) {
      // Find the function boundary
      // Look forward from the query for the next function-level closing brace
      // This is approximate but good enough
      const afterQuery = content.substring(semicolonPos + 1);

      // Check only within ~80 lines or until next export/function definition
      const checkLines = afterQuery.split('\n').slice(0, 80);
      let isMutated = false;

      for (const line of checkLines) {
        // Stop at next function/export boundary
        if (/^(export\s+)?(const|function|class)\s+\w+/.test(line.trim())) break;

        // Check for .save()
        if (line.includes(`${varName}.save(`)) { isMutated = true; break; }
        if (line.includes(`${varName}.markModified(`)) { isMutated = true; break; }
        if (line.includes(`${varName}.remove(`)) { isMutated = true; break; }
        if (line.includes(`${varName}.deleteOne(`)) { isMutated = true; break; }
        if (line.includes(`${varName}.updateOne(`)) { isMutated = true; break; }

        // Check for push/pull/set on subdocs
        if (new RegExp(`\\b${varName}\\.\\w+\\.push\\(`).test(line)) { isMutated = true; break; }
        if (new RegExp(`\\b${varName}\\.\\w+\\.pull\\(`).test(line)) { isMutated = true; break; }
        if (new RegExp(`\\b${varName}\\.\\w+\\.splice\\(`).test(line)) { isMutated = true; break; }

        // Check for property assignment (not comparison)
        // Match: varName.prop = value (but not ===, !==, >=, <=, =>)
        const propAssignRegex = new RegExp(`\\b${varName}\\.[a-zA-Z_]\\w*\\s*=[^=>]`);
        if (propAssignRegex.test(line)) {
          // Make sure it's not a comparison
          const compRegex = new RegExp(`\\b${varName}\\.[a-zA-Z_]\\w*\\s*(===|!==|>=|<=|==|!=)`);
          if (!compRegex.test(line)) {
            isMutated = true;
            break;
          }
        }

        // Check for (obj as any).prop = value
        if (new RegExp(`\\(${varName}\\s+as\\s+any\\)\\[`).test(line)) {
          isMutated = true;
          break;
        }
        if (new RegExp(`\\(${varName}\\s+as\\s+any\\)\\.\\w+\\s*=`).test(line)) {
          isMutated = true;
          break;
        }
      }

      if (isMutated) continue;
    }

    // Find position to insert .lean() - right before the ;
    let insertPos = semicolonPos;
    let p = semicolonPos - 1;
    while (p >= queryStart && /\s/.test(content[p])) p--;
    insertPos = p + 1;

    // Don't insert if the char before is not ) - could be malformed
    // Actually it should typically end with ) for chained methods
    // But some might end with other things - let's be flexible

    insertPositions.push(insertPos);
  }

  // Apply in reverse order
  insertPositions.sort((a, b) => b - a);
  const uniquePositions = [...new Set(insertPositions)];

  let changes = 0;
  for (const pos of uniquePositions) {
    content = content.substring(0, pos) + '.lean()' + content.substring(pos);
    changes++;
  }

  if (changes > 0 && content !== original) {
    // Remove any double .lean()
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
