const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('c:/Users/harpreet singh/Downloads/flex/flex/frontend');

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const regex = /toast(Success|Error|Warning|Info|Loading)\s*\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      const relPath = path.relative('c:/Users/harpreet singh/Downloads/flex/flex', file);
      console.log(`${relPath}:${idx+1} | ${match[1]} | args: ${match[2].trim()}`);
    }
  });
});
