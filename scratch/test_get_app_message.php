<?php
// Mock CodeIgniter environment for CLI testing
define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR);
chdir(FCPATH);

require FCPATH . '../app/Config/Paths.php';
$paths = new Config\Paths();

require $paths->systemDirectory . '/Boot.php';
// Boot the framework but don't run the web app fully, just initialize environment:
\CodeIgniter\Boot::bootWeb($paths);

echo "Testing getAppMessage global function...\n";

// Fetching a known key from DB (e.g. system_locked_error)
$msg1 = getAppMessage('system_locked_error', 'Fallback system locked message');
echo "system_locked_error: $msg1\n";

// Fetching with parameters
$msg2 = getAppMessage('rental_min_days_error', 'Min rental is {min} days. You chose {selected}.', ['min' => 5, 'selected' => 2]);
echo "rental_min_days_error (with params): $msg2\n";

// Fetching a non-existing key
$msg3 = getAppMessage('non_existing_key_xyz', 'Default fallback message');
echo "non_existing_key: $msg3\n";
