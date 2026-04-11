<?php
header('Content-Type: text/plain');

$host = getenv('database__default__hostname') ?: getenv('database.default.hostname') ?: 'localhost';
$user = getenv('database__default__username') ?: getenv('database.default.username') ?: 'root';
$pass = getenv('database__default__password') ?: getenv('database.default.password') ?: '';
$db   = getenv('database__default__database') ?: getenv('database.default.database') ?: 'flex';
$port = getenv('database__default__port') ?: getenv('database.default.port') ?: 3306;

echo "Attempting connection to $host as $user on port $port...\n";

$mysqli = mysqli_init();
try {
    $connected = @mysqli_real_connect($mysqli, $host, $user, $pass, $db, (int)$port);
    if ($connected) {
        echo "SUCCESS: Connected to database successfully!\n";
    } else {
        echo "FAILURE: " . mysqli_connect_error() . "\n";
    }
} catch (Exception $e) {
    echo "EXCEPTION: " . $e->getMessage() . "\n";
}
