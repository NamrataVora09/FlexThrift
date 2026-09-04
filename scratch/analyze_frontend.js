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

const hardcodedMsgFiles = [];
const clientValidationFiles = [];

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(frontendDir, filePath).replace(/\\/g, '/');

  // Skip pure configuration files
  if (relativePath.includes('config') || relativePath.includes('d.ts')) return;

  // --- HARDCODED MESSAGES ANALYSIS ---
  const messages = [];

  // Toasts
  const toastRegex = /toast(Success|Error|Warning|Info|Loading)\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = toastRegex.exec(content)) !== null) {
    messages.push({ type: 'Toast Fallback (' + match[1] + ')', text: match[3], key: match[2] });
  }

  // Direct showToast
  const showToastRegex = /showToast\.(success|error|warning|info)\s*\(\s*['"]([^'"]+)['"]/g;
  while ((match = showToastRegex.exec(content)) !== null) {
    messages.push({ type: 'Direct Toast (' + match[1] + ')', text: match[2] });
  }

  // Confirmations
  const confirmRegex = /(confirmToast|confirm)\s*\(\s*[`'"]([^`'"]+)[`'"]/g;
  while ((match = confirmRegex.exec(content)) !== null) {
    messages.push({ type: 'Confirmation Modal/Alert', text: match[2] });
  }

  // Alerts
  const alertRegex = /alert\s*\(\s*[`'"]([^`'"]+)[`'"]/g;
  while ((match = alertRegex.exec(content)) !== null) {
    messages.push({ type: 'Browser Alert', text: match[1] });
  }

  // setError state
  const setErrorRegex = /setError\s*\(\s*[`'"]([^`'"]+)[`'"]/g;
  while ((match = setErrorRegex.exec(content)) !== null) {
    if (match[1].trim()) {
      messages.push({ type: 'Form Error State', text: match[1] });
    }
  }

  // Validation object property assignments
  const errorPropRegex = /errors\.[a-zA-Z_]+\s*=\s*['"]([^'"]+)['"]/g;
  while ((match = errorPropRegex.exec(content)) !== null) {
    messages.push({ type: 'Field Error Assignment', text: match[1] });
  }

  if (messages.length > 0) {
    hardcodedMsgFiles.push({
      path: relativePath,
      total: messages.length,
      messages
    });
  }

  // --- CLIENT-SIDE VALIDATION ANALYSIS ---
  const validationRules = [];

  // Password Validation
  if (/(password|confirmPassword)/i.test(content) && (/match|length|min|6/i.test(content)) && /if\s*\(/.test(content)) {
    validationRules.push('Password match & length check');
  }

  // Email/Phone Format Validation
  if (/(email|phone|mobile)/i.test(content) && (/@|\.includes\('@'\)|\d{10}|test\(|valid/i.test(content)) && /if\s*\(/.test(content) && !relativePath.includes('layout')) {
    validationRules.push('Email & Mobile number format check');
  }

  // File/Image upload validation
  if (/(file|image|bill|avatar|csv)/i.test(content) && (/size|MB|max|type|allowed/i.test(content)) && /if\s*\(/.test(content)) {
    validationRules.push('File format, count & size limit check');
  }

  // Price & Business Rule Validation
  if (/(price|deposit|rental|cost|discount|amount)/i.test(content) && (/exceed|max|min|cannot|rule/i.test(content)) && /if\s*\(/.test(content) && (content.includes('setError') || content.includes('toastError') || content.includes('resolveMsg'))) {
    validationRules.push('Price, deposit & rental cost threshold check');
  }

  // Map / Polygon validation
  if (/(polygon|zone.*name|lat|lng)/i.test(content) && (/draw|required|enter/i.test(content)) && /if\s*\(/.test(content) && (content.includes('toastError') || content.includes('setError'))) {
    validationRules.push('Map polygon & zone name presence check');
  }

  // Explicit validation methods or form submission checks
  if (/validateForm|validateFields|validateInput|isValidForm/i.test(content) || /errors\.[a-zA-Z_]+\s*=/i.test(content)) {
    validationRules.push('Form error state handler / validation function');
  } else if (/e\.preventDefault/i.test(content) && (/required|please|setError|toastError|toastWarning/i.test(content)) && /if\s*\(/.test(content)) {
    validationRules.push('Required field pre-submission check');
  }

  if (validationRules.length > 0) {
    clientValidationFiles.push({
      path: relativePath,
      rules: Array.from(new Set(validationRules))
    });
  }
});

console.log(JSON.stringify({ hardcodedMsgFiles, clientValidationFiles }, null, 2));
