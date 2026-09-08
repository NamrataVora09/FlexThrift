<?php

$txtPath = __DIR__ . '/../all_app_messages.txt';
if (!file_exists($txtPath)) {
    echo "File not found: $txtPath\n";
    exit(1);
}

$content = file_get_contents($txtPath);
// Match entries like: Key: ... Message: ... Category: ...
preg_match_all('/Key:\s*([^\r\n]+)\s*\r?\n\s*Message:\s*([^\r\n]+)\s*\r?\n\s*Category:\s*([^\r\n]+)/i', $content, $matches, PREG_SET_ORDER);

echo "Found " . count($matches) . " entries in all_app_messages.txt\n";

$messages = [];
$keysSeen = [];

foreach ($matches as $m) {
    $key = trim($m[1]);
    $val = trim($m[2]);
    $cat = trim($m[3]);

    if (!isset($keysSeen[$key])) {
        $keysSeen[$key] = true;
        $messages[] = [
            'key' => $key,
            'val' => $val,
            'cat' => $cat
        ];
    }
}

echo "Total unique keys extracted: " . count($messages) . "\n";

// Write SQL file
$sqlTuples = [];
foreach ($messages as $m) {
    $kSql = str_replace("'", "''", $m['key']);
    $vSql = str_replace("'", "''", $m['val']);
    $cSql = str_replace("'", "''", $m['cat']);
    $sqlTuples[] = "('{$kSql}', '{$vSql}', '{$cSql}', @now, @now)";
}

$sqlContent = "SET @now = NOW();\nINSERT IGNORE INTO `app_messages` (`message_key`, `message_value`, `category`, `created_at`, `updated_at`) VALUES\n" . implode(",\n", $sqlTuples) . ";\n";

file_put_contents(__DIR__ . '/../seed_all_599_app_messages.sql', $sqlContent);
echo "Created seed_all_599_app_messages.sql (" . strlen($sqlContent) . " bytes)\n";
