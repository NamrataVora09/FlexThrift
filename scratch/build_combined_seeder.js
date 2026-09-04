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
const arrayEntries = [];

function escapePhpString(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

for (const [key, data] of combinedMap.entries()) {
  const phpVal = escapePhpString(data.value);
  arrayEntries.push(`    ['key' => '${key}', 'message' => '${phpVal}', 'category' => '${data.category}'],`);
}

// Generate dual-schema smart standalone PHP seeder script
const phpSeederScript = `<?php
/**
 * Combined App Messages Seeder (All Backend + Frontend Messages)
 * Dual-Schema Auto-Detecting (Supports both key/message and message_key/message_value)
 * Total Unique Keys: ${totalCombined}
 * Run via: php seed_combined_app_messages.php
 */

$host   = '127.0.0.1';
$dbName = 'flex';
$user   = 'root';
$pass   = '';
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

// Inspect database table structure dynamically
$cols = $pdo->query("DESCRIBE app_messages")->fetchAll();
$colNames = array_column($cols, 'Field');

$hasKeyCol = in_array('key', $colNames);
$keyField = $hasKeyCol ? 'key' : 'message_key';
$valField = in_array('message', $colNames) ? 'message' : 'message_value';
$hasCategory = in_array('category', $colNames);

echo "Detected schema: Key Column = '{$keyField}', Value Column = '{$valField}'" . ($hasCategory ? ", Category Column = 'category'" : "") . "\\n";

$messages = [
${arrayEntries.join('\n')}
];

if ($hasCategory) {
    $stmt = $pdo->prepare("
        INSERT INTO app_messages (\`{$keyField}\`, \`{$valField}\`, \`category\`)
        VALUES (:key, :message, :category)
        ON DUPLICATE KEY UPDATE \`{$valField}\` = IF(\`{$valField}\` IS NULL OR \`{$valField}\` = '', VALUES(\`{$valField}\`), \`{$valField}\`)
    ");
} else {
    $stmt = $pdo->prepare("
        INSERT INTO app_messages (\`{$keyField}\`, \`{$valField}\`)
        VALUES (:key, :message)
        ON DUPLICATE KEY UPDATE \`{$valField}\` = IF(\`{$valField}\` IS NULL OR \`{$valField}\` = '', VALUES(\`{$valField}\`), \`{$valField}\`)
    ");
}

$inserted = 0;
foreach ($messages as $msg) {
    $data = [
        'key' => $msg['key'],
        'message' => $msg['message'],
    ];
    if ($hasCategory) {
        $data['category'] = $msg['category'];
    }
    $stmt->execute($data);
    $inserted++;
}

echo "Successfully seeded/updated {$inserted} app_messages in database '{$dbName}'.\\n";
`;

fs.writeFileSync('seed_combined_app_messages.php', phpSeederScript);
console.log('Smart dual-schema seeder generated!');
