const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'src/controllers/productController.ts',
  'src/services/PaymentService.ts',
  'src/controllers/socialMediaController.ts',
  'src/controllers/storeVoucherController.ts',
];

for (const relPath of filesToCheck) {
  const filePath = path.join(__dirname, relPath);
  const content = fs.readFileSync(filePath, 'utf8');

  const queryRegex = /([A-Z]\w+)\.(find|findOne|findById)\s*\(/g;
  let match;

  while ((match = queryRegex.exec(content)) !== null) {
    const model = match[1];
    const method = match[2];
    const queryStart = match.index;

    const fullMethodArea = content.substring(queryStart + model.length + 1, queryStart + model.length + 30);
    if (/^findOneAndUpdate|^findByIdAndUpdate|^findOneAndDelete|^findByIdAndDelete/.test(fullMethodArea)) continue;
    if (['Array', 'Object', 'Promise', 'String', 'Number', 'Date', 'Math', 'JSON'].includes(model)) continue;

    if (method === 'find') {
      const afterParen = content.substring(queryStart + model.length + 6).trimStart();
      if (/^[a-z_]\w*\s*=>/.test(afterParen) || /^\(\s*[a-z_]/.test(afterParen) || /^function/.test(afterParen)) continue;
    }

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
      if (ch === "'" || ch === '"' || ch === '`') { inString = true; stringChar = ch; pos++; continue; }
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      if (ch === ')' || ch === ']' || ch === '}') depth--;
      if (ch === ';' && depth <= 0) { semicolonPos = pos; break; }
      if (depth < -1) break;
      pos++;
    }

    if (semicolonPos === -1) continue;

    const queryStr = content.substring(queryStart, semicolonPos + 1);
    if (queryStr.includes('.lean()')) continue;

    // Get line number
    const lineNum = content.substring(0, queryStart).split('\n').length;

    // Check mutation
    const beforeQuery = content.substring(Math.max(0, queryStart - 300), queryStart);
    const varMatch = beforeQuery.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?$/);
    let isMutated = false;
    let varName = varMatch ? varMatch[1] : null;

    if (varName) {
      const afterQuery = content.substring(semicolonPos + 1, Math.min(content.length, semicolonPos + 3000));
      if (afterQuery.includes(`${varName}.save(`) || afterQuery.includes(`${varName}.markModified(`)) {
        isMutated = true;
      }
      if (!isMutated && new RegExp(`\\b${varName}\\.[a-zA-Z_]\\w*\\s*=[^=>]`).test(afterQuery)) {
        isMutated = true;
      }
    }

    if (!isMutated) {
      console.log(`${relPath}:${lineNum} var=${varName || 'NONE'}: ${queryStr.substring(0, 100).replace(/\n/g, ' ')}`);
    }
  }
}
