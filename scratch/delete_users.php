<?php

$host = '127.0.0.1';
$user = 'root';
$pass = '';
$db   = 'flex';

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$emails = ['jasmits007@gmail.com', 'jasmits53@gmail.com', 'jasmits007@gmail'];

foreach ($emails as $email) {
    $stmt = $conn->prepare("DELETE FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    if ($stmt->execute()) {
        echo "Deleted user with email: $email. Affected rows: " . $conn->affected_rows . "\n";
    } else {
        echo "Error deleting user $email: " . $stmt->error . "\n";
    }
    $stmt->close();
}

$conn->close();
