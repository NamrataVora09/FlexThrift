<?php
$host = 'mail.webappsofttech.com';
$port = 465;
$timeout = 10;

echo "Testing SMTP connectivity to {$host}:{$port}\n";

$errno = 0;
$errstr = '';
$start = microtime(true);
$socket = stream_socket_client('ssl://' . $host . ':' . $port, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT);
$elapsed = microtime(true) - $start;

if (!$socket) {
    echo "Connection failed: ($errno) $errstr\n";
    exit(1);
}

stream_set_timeout($socket, $timeout);

// Read server greeting
$greeting = fgets($socket);
if ($greeting === false) {
    echo "No greeting received.\n";
    fclose($socket);
    exit(1);
}

echo "Greeting: " . trim($greeting) . "\n";

fwrite($socket, "EHLO localhost\r\n");
$response = '';
while (($line = fgets($socket)) !== false) {
    $response .= $line;
    // SMTP multi-line responses have '-' after code
    if (preg_match('/^[0-9]{3} /', $line)) {
        break;
    }
}

if ($response === '') {
    echo "No EHLO response.\n";
} else {
    echo "EHLO response:\n" . $response . "\n";
}

fwrite($socket, "QUIT\r\n");
fclose($socket);
echo "Connection check completed (elapsed: " . round($elapsed, 2) . "s)\n";
