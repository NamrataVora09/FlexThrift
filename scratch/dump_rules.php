<?php
define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);
require 'vendor/autoload.php';
// Mock CI environment if needed, but let's try just connecting to DB
try {
    $db = \Config\Database::connect();
    $rules = $db->table('rental_pricing_rules')->get()->getResultArray();
    echo json_encode($rules, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo $e->getMessage();
}
