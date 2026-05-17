<?php
$mysqli = new mysqli("127.0.0.1", "root", "", "flex");
if ($mysqli->connect_error) {
    die("Connection failed: " . $mysqli->connect_error);
}

$stmt = $mysqli->prepare("UPDATE advertisements SET position = 'top_banner', display_page = 'landing' WHERE id = 1");
if ($stmt->execute()) {
    echo "Advertisement 1 successfully set to top_banner!\n";
} else {
    echo "Update failed: " . $mysqli->error . "\n";
}
$stmt->close();
$mysqli->close();
