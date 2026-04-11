<?php
header('Content-Type: text/plain');

echo "--- PHP Environment Info ---\n";
echo "variables_order: " . ini_get('variables_order') . "\n";
echo "PHP Version: " . PHP_VERSION . "\n";
echo "---------------------------\n\n";

echo "--- All Environment Keys (getenv) ---\n";
// Since we can't easily list all getenv() keys in some PHP versions, 
// we'll check common ones and then dump $_SERVER which usually has them.
$keys_to_check = [
    'database.default.hostname', 'database_default_hostname', 'DATABASE_DEFAULT_HOSTNAME',
    'DB_HOST', 'DB_HOSTNAME', 'DATABASE_URL', 'PORT', 'CI_ENVIRONMENT'
];
foreach ($keys_to_check as $k) {
    $v = getenv($k);
    if ($v !== false) {
        echo "$k => " . (stripos($k, 'password') !== false ? '********' : $v) . "\n";
    }
}

echo "\n--- $_SERVER Keys ---\n";
foreach ($_SERVER as $key => $value) {
    echo "$key\n";
}
echo "---------------------------\n\n";

$host = getenv('database.default.hostname') ?: getenv('database_default_hostname') ?: getenv('DATABASE_DEFAULT_HOSTNAME') ?: getenv('DB_HOSTNAME') ?: 'localhost';
$user = getenv('database.default.username') ?: getenv('database_default_username') ?: getenv('DATABASE_DEFAULT_USERNAME') ?: getenv('DB_USERNAME') ?: 'root';
$pass = getenv('database.default.password') ?: getenv('database_default_password') ?: getenv('DATABASE_DEFAULT_PASSWORD') ?: getenv('DB_PASSWORD') ?: '';
$db   = getenv('database.default.database') ?: getenv('database_default_database') ?: getenv('DATABASE_DEFAULT_DATABASE') ?: getenv('DB_DATABASE') ?: 'flex';
$port = getenv('database.default.port') ?: getenv('database_default_port') ?: getenv('DATABASE_DEFAULT_PORT') ?: getenv('DB_PORT') ?: 3306;

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
