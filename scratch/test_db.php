<?php
try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=flex', 'root', '');
    echo 'Connected OK' . PHP_EOL;
    
    // Check if app_messages table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'app_messages'");
    $table = $stmt->fetch();
    if ($table) {
        echo 'app_messages table EXISTS' . PHP_EOL;
        $count = $pdo->query("SELECT COUNT(*) FROM app_messages")->fetchColumn();
        echo 'Total rows: ' . $count . PHP_EOL;
        
        // Check for specific keys
        $stmt2 = $pdo->query("SELECT message_key FROM app_messages WHERE message_key IN ('login_fields_required','login_failed','account_blocked_admin') LIMIT 10");
        $keys = $stmt2->fetchAll(PDO::FETCH_COLUMN);
        echo 'Known mapped keys found: ' . implode(', ', $keys) . PHP_EOL;
    } else {
        echo 'app_messages table does NOT exist' . PHP_EOL;
    }
    
    // Check migrations table for our migration
    $stmt3 = $pdo->query("SELECT * FROM migrations WHERE class LIKE '%SeedMappedAppMessages%'");
    $mig = $stmt3->fetch();
    echo 'SeedMappedAppMessages migration run: ' . ($mig ? 'YES' : 'NO') . PHP_EOL;
    
} catch (Exception $e) {
    echo 'FAILED: ' . $e->getMessage() . PHP_EOL;
}
