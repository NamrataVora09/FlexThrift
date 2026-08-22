const fs = require('fs');
const path = require('path');

const txtPath = path.join(__dirname, '../all_app_messages.txt');
const txtContent = fs.readFileSync(txtPath, 'utf8');

const matches = [...txtContent.matchAll(/Key:\s*([^\r\n]+)\s*\r?\n\s*Message:\s*([^\r\n]+)\s*\r?\n\s*Category:\s*([^\r\n]+)/gi)];

const messages = [];
const seen = new Set();

for (const m of matches) {
  const k = m[1].trim();
  const v = m[2].trim();
  const c = m[3].trim();
  if (!seen.has(k)) {
    seen.add(k);
    messages.push({ key: k, val: v, cat: c });
  }
}

// Read BaseApiController.php
const apiPath = path.join(__dirname, '../app/Controllers/Api/BaseApiController.php');
const apiContent = fs.readFileSync(apiPath, 'utf8');
const apiMatches = [...apiContent.matchAll(/'([^']+)'\s*=>\s*'([^']+)'/gi)];

for (const am of apiMatches) {
  const v = am[1].trim();
  const k = am[2].trim();
  if (!seen.has(k) && k.length > 2 && v.length > 2) {
    seen.add(k);
    messages.push({ key: k, val: v, cat: 'info' });
  }
}

console.log(`Extracted total unique messages: ${messages.length}`);

// Generate SQL file
const sqlTuples = messages.map(m => {
  const kSql = m.key.replace(/'/g, "''");
  const vSql = m.val.replace(/'/g, "''");
  const cSql = m.cat.replace(/'/g, "''");
  return `('${kSql}', '${vSql}', '${cSql}', @now, @now)`;
});

const sqlContent = `SET @now = NOW();\nINSERT IGNORE INTO \`app_messages\` (\`message_key\`, \`message_value\`, \`category\`, \`created_at\`, \`updated_at\`) VALUES\n` + sqlTuples.join(',\n') + ';\n';

const sqlPath = path.join(__dirname, '../seed_all_599_app_messages.sql');
fs.writeFileSync(sqlPath, sqlContent, 'utf8');
console.log(`Created seed_all_599_app_messages.sql successfully (${sqlContent.length} bytes)!`);

// Generate seed_all_app_messages.php
const phpItems = messages.map(m => {
  const kEsc = m.key.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const vEsc = m.val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const cEsc = m.cat.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `    ['message_key' => '${kEsc}', 'message_value' => '${vEsc}', 'category' => '${cEsc}']`;
});

const seederPhp = `<?php
/**
 * Standalone App Messages Seeder (Full List)
 * Run via: php seed_all_app_messages.php
 */

$host   = 'localhost';
$dbName = 'flex-pro';
$user   = 'flexadmin';
$pass   = 'gZLYbwsS7a7im2vAqfNi';
$port   = 3306;

$envFiles = [
    __DIR__ . '/.env',
    __DIR__ . '/env',
    getcwd() . '/.env',
    getcwd() . '/env',
];

foreach ($envFiles as $envFile) {
    if (file_exists($envFile)) {
        $content = file_get_contents($envFile);
        if (preg_match('/database\\.default\\.hostname\\s*=\\s*[\\'"\\r\\n]*([^\\'"\\r\\n]+)[\\'"\\r\\n]*/', $content, $m)) $host = trim($m[1]);
        if (preg_match('/database\\.default\\.database\\s*=\\s*[\\'"\\r\\n]*([^\\'"\\r\\n]+)[\\'"\\r\\n]*/', $content, $m)) $dbName = trim($m[1]);
        if (preg_match('/database\\.default\\.username\\s*=\\s*[\\'"\\r\\n]*([^\\'"\\r\\n]+)[\\'"\\r\\n]*/', $content, $m)) $user = trim($m[1]);
        if (preg_match('/database\\.default\\.password\\s*=\\s*[\\'"\\r\\n]*([^\\'"\\r\\n]*)[\\'"\\r\\n]*/', $content, $m)) $pass = trim($m[1]);
        if (preg_match('/database\\.default\\.port\\s*=\\s*[\\'"\\r\\n]*(\\d+)[\\'"\\r\\n]*/', $content, $m)) $port = (int)$m[1];
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
${phpItems.join(',\n')}
];

$inserted = 0;
$skipped  = 0;
$now      = date('Y-m-d H:i:s');

$checkStmt  = $pdo->prepare("SELECT COUNT(*) FROM \`app_messages\` WHERE \`message_key\` = :key");
$insertStmt = $pdo->prepare("INSERT INTO \`app_messages\` (\`message_key\`, \`message_value\`, \`category\`, \`created_at\`, \`updated_at\`) VALUES (:key, :val, :cat, :now, :now)");

foreach ($messages as $msg) {
    $checkStmt->execute([':key' => $msg['message_key']]);
    $count = (int) $checkStmt->fetchColumn();

    if ($count === 0) {
        $insertStmt->execute([
            ':key' => $msg['message_key'],
            ':val' => $msg['message_value'],
            ':cat' => $msg['category'],
            ':now' => $now,
        ]);
        echo "  INSERTED: {\$msg['message_key']}\\n";
        $inserted++;
    } else {
        echo "  SKIPPED:  {\$msg['message_key']}\\n";
        $skipped++;
    }
}

echo "\\nDone. Inserted: \$inserted | Skipped: \$skipped\\n";
`;

const seederPath = path.join(__dirname, '../seed_all_app_messages.php');
fs.writeFileSync(seederPath, seederPhp, 'utf8');
console.log(`Updated seed_all_app_messages.php successfully (${seederPhp.length} bytes)!`);
