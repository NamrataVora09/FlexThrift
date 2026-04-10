<?php
$host = 'mail.webappsofttech.com';
$port = 465;
$user = 'info@webappsofttech.com';
$pass = '8kArn,Tg*yC3*IQ#';
$timeout = 10;

echo "Testing SMTP AUTH to {$host}:{$port}\n";
$socket = stream_socket_client('ssl://' . $host . ':' . $port, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT);
if (!$socket) {
    echo "Connection failed: ($errno) $errstr\n";
    exit(1);
}
stream_set_timeout($socket, $timeout);

// Read greeting
echo fgets($socket);

fwrite($socket, "EHLO localhost\r\n");
while (($line = fgets($socket)) !== false) {
    echo $line;
    if (preg_match('/^[0-9]{3} /', $line)) break;
}

// Start AUTH LOGIN
fwrite($socket, "AUTH LOGIN\r\n");
$line = fgets($socket);
echo $line; // should be 334 VXNlcm5hbWU6

fwrite($socket, base64_encode($user) . "\r\n");
$line = fgets($socket); echo $line; // prompt for password

fwrite($socket, base64_encode($pass) . "\r\n");
$line = fgets($socket); echo $line; // authentication result

fwrite($socket, "QUIT\r\n");
fclose($socket);
echo "Done.\n";
