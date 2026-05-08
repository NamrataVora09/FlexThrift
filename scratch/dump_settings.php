<?php
define('FCPATH', __DIR__ . '/public/');
require __DIR__ . '/../vendor/autoload.php';
$db = \Config\Database::connect();
$rows = $db->table('system_settings')->where('setting_key LIKE', 'phonepe%')->get()->getResultArray();
foreach ($rows as $row) {
    echo "{$row['setting_key']}: {$row['setting_value']}\n";
}
