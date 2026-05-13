<?php

require __DIR__ . '/../vendor/autoload.php';

// Define paths for CI4
if (!defined('FCPATH')) define('FCPATH', __DIR__ . '/../public/');

// Initialize the environment
require __DIR__ . '/../vendor/codeigniter4/framework/system/bootstrap.php';

$db = \Config\Database::connect();
$user = $db->table('users')->where('email', 'buyer@flex.com')->get()->getRowArray();

if ($user) {
    echo "OTP for buyer@flex.com: " . ($user['otp'] ?? 'No OTP found') . "\n";
    echo "Expires at: " . ($user['otp_expires_at'] ?? 'N/A') . "\n";
} else {
    echo "User not found\n";
}
