const fs = require('fs');
const path = require('path');

const backendData = JSON.parse(fs.readFileSync('scratch/extracted_backend_messages.json', 'utf8'));
const frontendData = JSON.parse(fs.readFileSync('scratch/extracted_frontend_messages.json', 'utf8'));

const combinedMap = new Map();

// 1. Add backend messages
backendData.keys.forEach(item => {
  combinedMap.set(item.key, {
    key: item.key,
    value: item.fallback || item.key,
    category: 'info'
  });
});

// 2. Add frontend messages
frontendData.messages.forEach(item => {
  if (!combinedMap.has(item.key)) {
    combinedMap.set(item.key, {
      key: item.key,
      value: item.value || item.key,
      category: item.category || 'info'
    });
  } else {
    const existing = combinedMap.get(item.key);
    if ((!existing.value || existing.value === existing.key) && item.value) {
      existing.value = item.value;
    }
    if (item.category && item.category !== 'info') {
      existing.category = item.category;
    }
  }
});

const totalCombined = combinedMap.size;
const sqlStatements = [];
const arrayEntries = [];

function escapePhpString(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function escapeSqlString(str) {
  return str.replace(/'/g, "''");
}

for (const [key, data] of combinedMap.entries()) {
  const phpVal = escapePhpString(data.value);
  const sqlVal = escapeSqlString(data.value);
  
  sqlStatements.push(`INSERT INTO app_messages (message_key, message_value, category) VALUES ('${key}', '${sqlVal}', '${data.category}') ON DUPLICATE KEY UPDATE message_value = IF(message_value IS NULL OR message_value = '', '${sqlVal}', message_value);`);
  arrayEntries.push(`    ['message_key' => '${key}', 'message_value' => '${phpVal}', 'category' => '${data.category}'],`);
}

// Generate standalone PHP seeder script
const phpSeederScript = `<?php
/**
 * Combined App Messages Seeder (All Backend + Frontend Messages)
 * Total Unique Keys: ${totalCombined}
 * Run via: php seed_combined_app_messages.php
 */

$host   = 'localhost';
$dbName = 'flex-pro';
$user   = 'flexadmin';
$pass   = 'gZLYbwsS7a7im2vAqfNi';
$port   = 3306;

$envFiles = [__DIR__ . '/.env', __DIR__ . '/env', getcwd() . '/.env', getcwd() . '/env'];
foreach ($envFiles as $envFile) {
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (str_starts_with($line, '#')) continue;
            if (preg_match('/^database\\.default\\.hostname\\s*=\\s*(.*)$/', $line, $m)) $host = trim($m[1], "'\\" ");
            if (preg_match('/^database\\.default\\.database\\s*=\\s*(.*)$/', $line, $m)) $dbName = trim($m[1], "'\\" ");
            if (preg_match('/^database\\.default\\.username\\s*=\\s*(.*)$/', $line, $m)) $user = trim($m[1], "'\\" ");
            if (preg_match('/^database\\.default\\.password\\s*=\\s*(.*)$/', $line, $m)) $pass = trim($m[1], "'\\" ");
            if (preg_match('/^database\\.default\\.port\\s*=\\s*(\\d+)$/', $line, $m)) $port = (int)$m[1];
        }
        break;
    }
}

try {
    $pdo = new PDO("mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (\\Exception $e) {
    echo "Database Connection Error: " . $e->getMessage() . "\\n";
    exit(1);
}

echo "Connected to database '{$dbName}' on {$host}:{$port}.\\n";

$messages = [
${arrayEntries.join('\n')}
];

$stmt = $pdo->prepare("
    INSERT INTO app_messages (message_key, message_value, category)
    VALUES (:message_key, :message_value, :category)
    ON DUPLICATE KEY UPDATE message_value = IF(message_value IS NULL OR message_value = '', VALUES(message_value), message_value)
");

$inserted = 0;
foreach ($messages as $msg) {
    $stmt->execute($msg);
    $inserted++;
}

echo "Successfully seeded/updated {$inserted} app_messages in database '{$dbName}'.\\n";
`;

fs.writeFileSync('seed_combined_app_messages.php', phpSeederScript);
fs.writeFileSync('scratch/seed_combined_app_messages.sql', sqlStatements.join('\n'));

console.log(`Combined Seeder Generated Successfully!`);
console.log(`Total Combined Unique Message Keys: ${totalCombined}`);
