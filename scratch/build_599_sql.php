<?php

// 1. Read all_app_messages.txt
$txtContent = file_get_contents(__DIR__ . '/../all_app_messages.txt');
preg_match_all('/Key:\s*([^\r\n]+)\s*\r?\n\s*Message:\s*([^\r\n]+)\s*\r?\n\s*Category:\s*([^\r\n]+)/i', $txtContent, $matches, PREG_SET_ORDER);

$messages = [];
$seen = [];

foreach ($matches as $m) {
    $k = trim($m[1]);
    $v = trim($m[2]);
    $c = trim($m[3]);
    if (!isset($seen[$k])) {
        $seen[$k] = true;
        $messages[] = ['key' => $k, 'val' => $v, 'cat' => $c];
    }
}

// 2. Read BaseApiController.php for messageKeyMap entries
$baseApiContent = file_get_contents(__DIR__ . '/../app/Controllers/Api/BaseApiController.php');
preg_match_all('/\'([^\']+)\'\s*=>\s*\'([^\']+)\'/i', $baseApiContent, $apiMatches, PREG_SET_ORDER);

foreach ($apiMatches as $am) {
    $val = trim($am[1]);
    $key = trim($am[2]);
    if (!isset($seen[$key]) && strlen($key) > 2 && strlen($val) > 2) {
        $seen[$key] = true;
        $messages[] = ['key' => $key, 'val' => $val, 'cat' => 'info'];
    }
}

echo "Extracted total unique messages: " . count($messages) . "\n";

// Generate SQL file seed_all_599_app_messages.sql
$tuples = [];
foreach ($messages as $m) {
    $kSql = str_replace("'", "''", $m['key']);
    $vSql = str_replace("'", "''", $m['val']);
    $cSql = str_replace("'", "''", $m['cat']);
    $tuples[] = "('{$kSql}', '{$vSql}', '{$cSql}', @now, @now)";
}

$sql = "SET @now = NOW();\nINSERT IGNORE INTO `app_messages` (`message_key`, `message_value`, `category`, `created_at`, `updated_at`) VALUES\n" . implode(",\n", $tuples) . ";\n";
file_put_contents(__DIR__ . '/../seed_all_599_app_messages.sql', $sql);
echo "Created seed_all_599_app_messages.sql successfully!\n";

// Also embed into seed_all_app_messages.php
$phpItems = [];
foreach ($messages as $m) {
    $kEsc = addslashes($m['key']);
    $vEsc = addslashes($m['val']);
    $cEsc = addslashes($m['cat']);
    $phpItems[] = "    ['message_key' => '{$kEsc}', 'message_value' => '{$vEsc}', 'category' => '{$cEsc}']";
}

$phpCode = "<?php\n/**\n * Standalone App Messages Seeder (Full 599 Messages)\n * Run via: php seed_all_app_messages.php\n */\n\n";
$phpCode .= "\$host   = 'localhost';\n\$dbName = 'flex-pro';\n\$user   = 'flexadmin';\n\$pass   = 'gZLYbwsS7a7im2vAqfNi';\n\$port   = 3306;\n\n";
$phpCode .= "\$envFiles = [\n    __DIR__ . '/.env',\n    __DIR__ . '/env',\n    getcwd() . '/.env',\n    getcwd() . '/env',\n];\n\n";
$phpCode .= "foreach (\$envFiles as \$envFile) {\n    if (file_exists(\$envFile)) {\n        \$content = file_get_contents(\$envFile);\n        if (preg_match('/database\\.default\\.hostname\\s*=\\s*[\\'\"\\r\\n]*([^\\'\"\\r\\n]+)[\\'\"\\r\\n]*/', \$content, \$m)) \$host = trim(\$m[1]);\n        if (preg_match('/database\\.default\\.database\\s*=\\s*[\\'\"\\r\\n]*([^\\'\"\\r\\n]+)[\\'\"\\r\\n]*/', \$content, \$m)) \$dbName = trim(\$m[1]);\n        if (preg_match('/database\\.default\.username\\s*=\\s*[\\'\"\\r\\n]*([^\\'\"\\r\\n]+)[\\'\"\\r\\n]*/', \$content, \$m)) \$user = trim(\$m[1]);\n        if (preg_match('/database\\.default\\.password\\s*=\\s*[\\'\"\\r\\n]*([^\\'\"\\r\\n]*)[\\'\"\\r\\n]*/', \$content, \$m)) \$pass = trim(\$m[1]);\n        if (preg_match('/database\\.default\\.port\\s*=\\s*[\\'\"\\r\\n]*(\\d+)[\\'\"\\r\\n]*/', \$content, \$m)) \$port = (int)\$m[1];\n        break;\n    }\n}\n\n";
$phpCode .= "try {\n    \$pdo = new PDO(\"mysql:host={\$host};port={\$port};dbname={\$dbName};charset=utf8mb4\", \$user, \$pass, [\n        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,\n        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,\n    ]);\n} catch (\\Exception \$e) {\n    echo \"Database Connection Error: \" . \$e->getMessage() . \"\\n\";\n    exit(1);\n}\n\n";
$phpCode .= "echo \"Connected to database '{\$dbName}' on {\$host}:{\$port}.\\n\";\n\n";
$phpCode .= "\$messages = [\n" . implode(",\n", $phpItems) . "\n];\n\n";
$phpCode .= "\$inserted = 0;\n\$skipped  = 0;\n\$now      = date('Y-m-d H:i:s');\n\n";
$phpCode .= "\$checkStmt  = \$pdo->prepare(\"SELECT COUNT(*) FROM `app_messages` WHERE `message_key` = :key\");\n";
$phpCode .= "\$insertStmt = \$pdo->prepare(\"INSERT INTO `app_messages` (`message_key`, `message_value`, `category`, `created_at`, `updated_at`) VALUES (:key, :val, :cat, :now, :now)\");\n\n";
$phpCode .= "foreach (\$messages as \$msg) {\n    \$checkStmt->execute([':key' => \$msg['message_key']]);\n    \$count = (int) \$checkStmt->fetchColumn();\n\n    if (\$count === 0) {\n        \$insertStmt->execute([\n            ':key' => \$msg['message_key'],\n            ':val' => \$msg['message_value'],\n            ':cat' => \$msg['category'],\n            ':now' => \$now,\n        ]);\n        echo \"  INSERTED: {\$msg['message_key']}\\n\";\n        \$inserted++;\n    } else {\n        echo \"  SKIPPED:  {\$msg['message_key']}\\n\";\n        \$skipped++;\n    }\n}\n\n";
$phpCode .= "echo \"\\nDone. Inserted: \$inserted | Skipped: \$skipped\\n\";\n";

file_put_contents(__DIR__ . '/../seed_all_app_messages.php', $phpCode);
echo "Updated seed_all_app_messages.php with complete list!\n";
