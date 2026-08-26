<?php
/**
 * Dump All App Messages to Database
 *
 * Usage: php scratch/dump_all_messages_to_db.php
 *
 * This script extracts all message keys and values defined in
 * BaseApiController.php::$messageKeyMap and seeders, then inserts/upserts
 * them directly into the `app_messages` database table in MariaDB/MySQL.
 */

$host   = 'localhost';
$port   = '3306';
$dbname = 'flex-pro';
$user   = 'flexadmin';
$pass   = 'gZLYbwsS7a7im2vAqfNi';

try {
    $pdo = new PDO("mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "Connected to database '{$dbname}' successfully.\n";

    // 1. Parse BaseApiController.php to extract $messageKeyMap
    $baseApiFile = __DIR__ . '/../app/Controllers/Api/BaseApiController.php';
    if (!file_exists($baseApiFile)) {
        die("Error: BaseApiController.php not found at {$baseApiFile}\n");
    }

    $content = file_get_contents($baseApiFile);

    // Extract single quoted array mappings: 'String Message' => 'key_name'
    preg_match_all("/'([^'\\\\]*(?:\\\\.[^'\\\\]*)*)'\s*=>\s*'([^']+)'/", $content, $matches, PREG_SET_ORDER);

    $messages = [];
    foreach ($matches as $m) {
        $val = stripslashes($m[1]);
        $key = $m[2];
        // Filter out non-message keys
        if (!empty($key) && !empty($val) && $key !== 'messageKeyMap' && $key !== 'json') {
            $messages[$key] = [
                'message_key'   => $key,
                'message_value' => $val,
                'category'      => 'general'
            ];
        }
    }

    echo "Extracted " . count($messages) . " messages from BaseApiController.php.\n";

    // 2. Scan migration seeders for accurate category assignments
    $migrations = glob(__DIR__ . '/../app/Database/Migrations/*.php');
    foreach ($migrations as $migFile) {
        $migContent = file_get_contents($migFile);
        preg_match_all("/\['message_key'\s*=>\s*'([^']+)',\s*'message_value'\s*=>\s*'([^']*)',\s*'category'\s*=>\s*'([^']*)'\]/", $migContent, $migMatches, PREG_SET_ORDER);
        foreach ($migMatches as $mm) {
            $k   = $mm[1];
            $v   = stripslashes($mm[2]);
            $cat = $mm[3];
            if (isset($messages[$k])) {
                $messages[$k]['category'] = $cat;
            } else {
                $messages[$k] = [
                    'message_key'   => $k,
                    'message_value' => $v,
                    'category'      => $cat
                ];
            }
        }
    }

    // 3. Upsert into `app_messages` table
    $now  = date('Y-m-d H:i:s');
    $stmt = $pdo->prepare("
        INSERT INTO app_messages (message_key, message_value, category, created_at, updated_at)
        VALUES (:key, :val, :cat, :created_at, :updated_at)
        ON DUPLICATE KEY UPDATE
            message_value = VALUES(message_value),
            category = VALUES(category),
            updated_at = VALUES(updated_at)
    ");

    $inserted = 0;
    $updated  = 0;

    foreach ($messages as $msg) {
        $check = $pdo->prepare("SELECT id FROM app_messages WHERE message_key = ?");
        $check->execute([$msg['message_key']]);
        $exists = $check->fetch();

        $stmt->execute([
            ':key'        => $msg['message_key'],
            ':val'        => $msg['message_value'],
            ':cat'        => $msg['category'],
            ':created_at' => $now,
            ':updated_at' => $now
        ]);

        if ($exists) {
            $updated++;
        } else {
            $inserted++;
        }
    }

    // Fetch total count in DB
    $totalInDb = $pdo->query("SELECT COUNT(*) FROM app_messages")->fetchColumn();

    echo "--------------------------------------------------\n";
    echo "DUMP COMPLETE!\n";
    echo "  - Inserted (New Keys):     {$inserted}\n";
    echo "  - Updated (Existing Keys): {$updated}\n";
    echo "  - Total Messages in DB:    {$totalInDb}\n";
    echo "--------------------------------------------------\n";

} catch (PDOException $e) {
    echo "DATABASE ERROR: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
