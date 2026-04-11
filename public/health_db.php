<?php
header('Content-Type: text/plain');

echo "--- PHP Environment Info ---\n";
echo "variables_order: " . ini_get('variables_order') . "\n";
echo "PHP Version: " . PHP_VERSION . "\n";
echo "---------------------------\n\n";

echo "--- Common Database Keys (getenv) ---\n";
$keys_to_check = [
    'DB_HOSTNAME', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE', 'DB_PORT',
    'database.default.hostname', 'database.default.username', 'database.default.database',
    'CI_ENVIRONMENT', 'PORT'
];
foreach ($keys_to_check as $k) {
    $v = getenv($k);
    if ($v !== false) {
        echo "$k => " . (stripos($k, 'password') !== false ? '********' : $v) . "\n";
    }
}
echo "---------------------------\n\n";

$host = getenv('DB_HOSTNAME') ?: getenv('database.default.hostname') ?: 'localhost';
$user = getenv('DB_USERNAME') ?: getenv('database.default.username') ?: 'root';
$pass = getenv('DB_PASSWORD') ?: getenv('database.default.password') ?: '';
$db   = getenv('DB_DATABASE') ?: getenv('database.default.database') ?: 'flex';
$port = getenv('DB_PORT')     ?: getenv('database.default.port') ?: 3306;

echo "Attempting connection to $host as $user on database '$db' port $port...\n";

$mysqli = mysqli_init();
try {
    $connected = @mysqli_real_connect($mysqli, $host, $user, $pass, $db, (int)$port);
    if ($connected) {
        echo "SUCCESS: Connected to database successfully!\n";
        
        // Check for users table
        $result = $mysqli->query("SHOW TABLES LIKE 'users'");
        if ($result && $result->num_rows > 0) {
            echo "SUCCESS: 'users' table exists.\n";
            
            $user_check = $mysqli->query("SELECT id, email FROM users WHERE email = 'superadmin@flex.com'");
            if ($user_check && $user_check->num_rows > 0) {
                echo "SUCCESS: Superadmin user found.\n";
            } else {
                echo "WARNING: Superadmin user NOT found in database.\n";
            }
        } else {
            echo "FAILURE: 'users' table does NOT exist. Did you import the SQL dump?\n";
        }
    } else {
        echo "FAILURE: " . mysqli_connect_error() . "\n";
    }
} catch (Exception $e) {
    echo "EXCEPTION: " . $e->getMessage() . "\n";
}
