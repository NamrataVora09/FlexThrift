<?php
define('FCPATH', __DIR__ . '/public/');
require __DIR__ . '/../vendor/autoload.php';

// Initialize CI
$app = \Config\Services::codeigniter();
$app->initialize();

$phonepe = new \App\Libraries\PhonePe();
$tokenData = $phonepe->getAuthToken();

print_r($tokenData);
