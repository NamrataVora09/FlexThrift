<?php
require __DIR__ . '/../vendor/autoload.php';
$mysqli = new mysqli('127.0.0.1', 'root', '', 'flex');
$res = $mysqli->query("SHOW INDEX FROM offers");
while($row = $res->fetch_assoc()) {
    print_r($row);
}
