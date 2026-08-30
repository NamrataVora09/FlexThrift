<?php
$host   = '127.0.0.1';
$dbName = 'flex';
$user   = 'root';
$pass   = '';
$port   = 3306;

try {
    $pdo = new PDO("mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    echo "Connected to database '{$dbName}' on {$host}:{$port}.\n\n";

    $stmt = $pdo->query("SELECT id, zone_name, zone_type, is_active, zone_polygon FROM `allowed_zones` LIMIT 10");
    while ($row = $stmt->fetch()) {
        echo "ID: " . $row['id'] . "\n";
        echo "Name: " . $row['zone_name'] . "\n";
        echo "Type: " . $row['zone_type'] . "\n";
        echo "Is Active: " . var_export($row['is_active'], true) . " (type: " . gettype($row['is_active']) . ")\n";
        echo "Polygon length: " . strlen($row['zone_polygon'] ?? '') . "\n";
        echo "-----------------------------------------\n";
    }

} catch (Exception $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
}
