<?php
header('Content-Type: text/plain');

echo "--- Environment Variables ---\n";
foreach ($_ENV as $key => $value) {
    if (stripos($key, 'database') !== false || stripos($key, 'db') !== false) {
        echo "$key => " . ($key === 'database.default.password' || stripos($key, 'password') !== false ? '********' : $value) . "\n";
    }
}
foreach ($_SERVER as $key => $value) {
    if (stripos($key, 'database') !== false || stripos($key, 'db') !== false) {
        if (!isset($_ENV[$key])) {
            echo "SERVER: $key => " . (stripos($key, 'password') !== false ? '********' : $value) . "\n";
        }
    }
}
echo "---------------------------\n\n";

$host = getenv('database__default__hostname') ?: getenv('database.default.hostname') ?: getenv('DATABASE_DEFAULT_HOSTNAME') ?: 'localhost';
$user = getenv('database__default__username') ?: getenv('database.default.username') ?: getenv('DATABASE_DEFAULT_USERNAME') ?: 'root';
$pass = getenv('database__default__password') ?: getenv('database.default.password') ?: getenv('DATABASE_DEFAULT_PASSWORD') ?: '';
$db   = getenv('database__default__database') ?: getenv('database.default.database') ?: getenv('DATABASE_DEFAULT_DATABASE') ?: 'flex';
$port = getenv('database__default__port') ?: getenv('database.default.port') ?: getenv('DATABASE_DEFAULT_PORT') ?: 3306;

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
