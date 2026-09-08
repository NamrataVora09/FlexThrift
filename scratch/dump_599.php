<?php
$host   = '127.0.0.1';
$dbName = 'flex';
$user   = 'root';
$pass   = '';
$port   = 3306;

$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $content = file_get_contents($envFile);
    if (preg_match('/database\.default\.hostname\s*=\s*[\'"]?([^\'"\r\n]+)[\'"]?/', $content, $m)) $host = trim($m[1]);
    if (preg_match('/database\.default\.database\s*=\s*[\'"]?([^\'"\r\n]+)[\'"]?/', $content, $m)) $dbName = trim($m[1]);
    if (preg_match('/database\.default\.username\s*=\s*[\'"]?([^\'"\r\n]+)[\'"]?/', $content, $m)) $user = trim($m[1]);
    if (preg_match('/database\.default\.password\s*=\s*[\'"]?([^\'"\r\n]*)[\'"]?/', $content, $m)) $pass = trim($m[1]);
    if (preg_match('/database\.default\.port\s*=\s*[\'"]?(\d+)[\'"]?/', $content, $m)) $port = (int)$m[1];
}

try {
    $pdo = new PDO("mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (\Exception $e) {
    echo "Local DB Connection Failed: " . $e->getMessage() . "\n";
    exit(1);
}

$stmt = $pdo->query("SELECT message_key, message_value, category FROM app_messages ORDER BY id ASC");
$rows = $stmt->fetchAll();

echo "Found " . count($rows) . " messages in local database.\n";

// Generate PHP array code
$phpArray = "<?php\n// Complete 599 Messages array\n\$messages = [\n";
$sqlLines = ["SET @now = NOW();", "INSERT IGNORE INTO `app_messages` (`message_key`, `message_value`, `category`, `created_at`, `updated_at`) VALUES"];

$sqlTuples = [];
foreach ($rows as $r) {
    $kEsc = addslashes($r['message_key']);
    $vEsc = addslashes($r['message_value']);
    $cEsc = addslashes($r['category'] ?? 'info');
    $phpArray .= "    ['message_key' => '{$kEsc}', 'message_value' => '{$vEsc}', 'category' => '{$cEsc}'],\n";
    
    $kSql = str_replace("'", "''", $r['message_key']);
    $vSql = str_replace("'", "''", $r['message_value']);
    $cSql = str_replace("'", "''", $r['category'] ?? 'info');
    $sqlTuples[] = "('{$kSql}', '{$vSql}', '{$cSql}', @now, @now)";
}

$phpArray .= "];\n";

file_put_contents(__DIR__ . '/../scratch/messages_array.php', $phpArray);

$sqlFull = "SET @now = NOW();\nINSERT IGNORE INTO `app_messages` (`message_key`, `message_value`, `category`, `created_at`, `updated_at`) VALUES\n" . implode(",\n", $sqlTuples) . ";\n";

file_put_contents(__DIR__ . '/../seed_all_599_app_messages.sql', $sqlFull);

echo "Exported seed_all_599_app_messages.sql (" . strlen($sqlFull) . " bytes).\n";
