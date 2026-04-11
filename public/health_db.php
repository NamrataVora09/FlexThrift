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

$host = getenv('DB_HOSTNAME') ?: getenv('database.default.hostname') ?: 'localhost';
$user = getenv('DB_USERNAME') ?: getenv('database.default.username') ?: 'root';
$pass = getenv('DB_PASSWORD') ?: getenv('database.default.password') ?: '';
$db   = getenv('DB_DATABASE') ?: getenv('database.default.database') ?: 'flex';
$port = getenv('DB_PORT')     ?: getenv('database.default.port') ?: 3306;

echo "Attempting connection to $host as $user on port $port...\n";

$mysqli = mysqli_init();
try {
    $connected = @mysqli_real_connect($mysqli, $host, $user, $pass, $db, (int)$port);
    if ($connected) {
        echo "SUCCESS: Connected to database successfully!\n";
        // Check for users table
        $result = $mysqli->query("SHOW TABLES LIKE 'users'");
        if ($result->num_rows > 0) {
            echo "SUCCESS: 'users' table exists.\n";
            
            $user_check = $mysqli->query("SELECT id, email FROM users WHERE email = 'superadmin@flex.com'");
            if ($user_check->num_rows > 0) {
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
    echo "EXCEPTION: " . $e->getMessage() . "\n";
}
