<?php
require_once __DIR__ . '/../app/Helpers/geolocation_helper.php';

echo "Testing getLocationFromIP('103.48.198.141')...\n";
$locIP = getLocationFromIP('103.48.198.141');
var_dump($locIP);
