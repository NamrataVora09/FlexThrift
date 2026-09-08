const fs = require('fs');
const path = require('path');

const targetFiles = [
  'app/Controllers/Api/AdminApi.php',
  'app/Controllers/Api/AuthApi.php',
  'app/Controllers/Api/BuyerApi.php',
  'app/Controllers/Api/SellerApi.php',
  'app/Controllers/Api/SharedApi.php',
  'app/Controllers/Api/SuperAdminApi.php',
  'app/Controllers/Api/ZonesApi.php'
];

const rootDir = path.resolve('.');
const extractedKeysMap = new Map();
const occurrences = [];

targetFiles.forEach(relPath => {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${relPath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  // Regex to match getAppMessage('key' or getAppMessage("key" with optional 2nd param fallback
  const regex = /getAppMessage\s*\(\s*['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]*)['"])?/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    const fallback = match[2] || '';

    // Calculate line number
    const index = match.index;
    const lineNumber = content.substring(0, index).split('\n').length;

    occurrences.push({
      file: relPath,
      line: lineNumber,
      key,
      fallback
    });

    if (!extractedKeysMap.has(key)) {
      extractedKeysMap.set(key, {
        key,
        fallback,
        occurrences: [{ file: relPath, line: lineNumber }]
      });
    } else {
      const existing = extractedKeysMap.get(key);
      existing.occurrences.push({ file: relPath, line: lineNumber });
      if (!existing.fallback && fallback) {
        existing.fallback = fallback;
      }
    }
  }
});

// Format outputs
const txtLines = [];
const sqlStatements = [];
const fileBreakdown = {};

targetFiles.forEach(f => fileBreakdown[f] = []);

for (const occ of occurrences) {
  fileBreakdown[occ.file].push(occ);
}

for (const [key, data] of extractedKeysMap.entries()) {
  const escapedVal = data.fallback.replace(/'/g, "''");
  txtLines.push(`${key} = ${data.fallback || '(no default)'}`);
  sqlStatements.push(`INSERT INTO app_messages (message_key, message_value, category) VALUES ('${key}', '${escapedVal || key}', 'info') ON DUPLICATE KEY UPDATE message_value = VALUES(message_value);`);
}

fs.writeFileSync('scratch/extracted_backend_messages.json', JSON.stringify({
  totalOccurrences: occurrences.length,
  uniqueKeysCount: extractedKeysMap.size,
  fileBreakdown,
  keys: Array.from(extractedKeysMap.values())
}, null, 2));

fs.writeFileSync('scratch/seed_backend_messages.sql', sqlStatements.join('\n'));
fs.writeFileSync('scratch/extracted_backend_messages.txt', txtLines.join('\n'));

console.log(`Backend Extraction Complete!`);
console.log(`Found ${occurrences.length} getAppMessage() calls across the 7 controller files.`);
console.log(`Extracted ${extractedKeysMap.size} unique keys.`);
