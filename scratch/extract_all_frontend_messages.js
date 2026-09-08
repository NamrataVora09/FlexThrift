const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item === 'node_modules' || item === '.next' || item === '.git') continue;
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, files);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

const frontendDir = path.resolve('frontend');
const files = getFiles(frontendDir);

const extractedMessages = [];
const uniqueKeysMap = new Map();

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(frontendDir, filePath).replace(/\\/g, '/');

  // Skip type declarations or config files
  if (relativePath.endsWith('.d.ts') || relativePath.includes('config')) return;

  // Pattern 1: toastSuccess, toastError, toastWarning, toastInfo, toastLoading ('key', 'fallback')
  const toastRegex = /toast(Success|Error|Warning|Info|Loading)\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = toastRegex.exec(content)) !== null) {
    const categoryMap = { Success: 'success', Error: 'error', Warning: 'warning', Info: 'info', Loading: 'info' };
    const category = categoryMap[match[1]] || 'info';
    const key = match[2];
    const value = match[3];

    extractedMessages.push({ file: relativePath, key, value, category, source: `toast${match[1]}` });
    if (!uniqueKeysMap.has(key)) {
      uniqueKeysMap.set(key, { key, value, category, files: [relativePath] });
    } else {
      uniqueKeysMap.get(key).files.push(relativePath);
    }
  }

  // Pattern 2: resolveMsg('key', 'fallback')
  const resolveRegex = /resolveMsg\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;
  while ((match = resolveRegex.exec(content)) !== null) {
    const key = match[1];
    const value = match[2];
    const category = 'info';

    extractedMessages.push({ file: relativePath, key, value, category, source: 'resolveMsg' });
    if (!uniqueKeysMap.has(key)) {
      uniqueKeysMap.set(key, { key, value, category, files: [relativePath] });
    } else {
      uniqueKeysMap.get(key).files.push(relativePath);
    }
  }

  // Pattern 3: getMsg('key', 'fallback')
  const getMsgRegex = /getMsg\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;
  while ((match = getMsgRegex.exec(content)) !== null) {
    const key = match[1];
    const value = match[2];
    const category = 'info';

    extractedMessages.push({ file: relativePath, key, value, category, source: 'getMsg' });
    if (!uniqueKeysMap.has(key)) {
      uniqueKeysMap.set(key, { key, value, category, files: [relativePath] });
    } else {
      uniqueKeysMap.get(key).files.push(relativePath);
    }
  }

  // Pattern 4: showToast.success / error / warning / info ('fallback')
  const showToastRegex = /showToast\.(success|error|warning|info)\s*\(\s*['"]([^'"]+)['"]/g;
  while ((match = showToastRegex.exec(content)) !== null) {
    const category = match[1];
    const value = match[2];
    // Generate key from text if direct string
    const key = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50);

    extractedMessages.push({ file: relativePath, key, value, category, source: `showToast.${match[1]}` });
    if (!uniqueKeysMap.has(key)) {
      uniqueKeysMap.set(key, { key, value, category, files: [relativePath] });
    }
  }

  // Pattern 5: setError('fallback')
  const setErrorRegex = /setError\s*\(\s*['"]([^'"]+)['"]/g;
  while ((match = setErrorRegex.exec(content)) !== null) {
    const value = match[1];
    if (!value.trim()) continue;
    const key = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50);
    const category = 'error';

    extractedMessages.push({ file: relativePath, key, value, category, source: 'setError' });
    if (!uniqueKeysMap.has(key)) {
      uniqueKeysMap.set(key, { key, value, category, files: [relativePath] });
    }
  }
});

// Format SQL insert statements
const sqlStatements = [];
const txtLines = [];
const arrayEntries = [];

for (const [key, data] of uniqueKeysMap.entries()) {
  const escapedValue = data.value.replace(/'/g, "''");
  sqlStatements.push(`INSERT INTO app_messages (message_key, message_value, category) VALUES ('${key}', '${escapedValue}', '${data.category}') ON DUPLICATE KEY UPDATE message_value = VALUES(message_value);`);
  txtLines.push(`${key} = ${data.value} [${data.category}]`);
  arrayEntries.push(`  ['message_key' => '${key}', 'message_value' => '${escapedValue}', 'category' => '${data.category}'],`);
}

// Write outputs to scratch
fs.writeFileSync('scratch/extracted_frontend_messages.json', JSON.stringify({
  totalExtracted: extractedMessages.length,
  uniqueKeysCount: uniqueKeysMap.size,
  messages: Array.from(uniqueKeysMap.values())
}, null, 2));

fs.writeFileSync('scratch/seed_frontend_messages.sql', sqlStatements.join('\n'));
fs.writeFileSync('scratch/extracted_frontend_messages.txt', txtLines.join('\n'));

console.log(`Extraction Complete! Found ${extractedMessages.length} message usages across frontend files.`);
console.log(`Generated ${uniqueKeysMap.size} unique key-value pairs.`);
