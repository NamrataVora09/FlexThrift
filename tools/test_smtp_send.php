<?php
/**
 * SMTP Email Test Script
 * This script tests the actual email sending with detailed debugging
 */

// Load CodeIgniter Framework
require_once __DIR__ . '/../vendor/autoload.php';

// Define paths
define('FCPATH', __DIR__ . '/../public/');
define('APPPATH', __DIR__ . '/../app/');
define('WRITEPATH', __DIR__ . '/../writable/');
define('ROOTPATH', __DIR__ . '/../');

// Load Email Config
require_once __DIR__ . '/../app/Config/Email.php';
use Config\Email as EmailConfig;

// Create email instance
$emailConfig = new EmailConfig();

$email = \Config\Services::email();

// Set email details
$email->setFrom('info@webappsofttech.com', 'Flex Market Test');
$email->setTo('info@webappsofttech.com'); // Sending to same email for testing
$email->setSubject('SMTP Test from Flex Market');

$message = "
<html>
<body>
    <h2>SMTP Test Email</h2>
    <p>This is a test email to verify SMTP configuration.</p>
    <p>If you receive this, your SMTP is working correctly!</p>
    <p><strong>Time:</strong> " . date('Y-m-d H:i:s') . "</p>
</body>
</html>
";

$email->setMessage($message);

// Try to send
echo "Attempting to send email...\n";
echo "SMTP Host: " . $emailConfig->SMTPHost . "\n";
echo "SMTP Port: " . $emailConfig->SMTPPort . "\n";
echo "SMTP User: " . $emailConfig->SMTPUser . "\n";
echo "SMTP Crypto: " . $emailConfig->SMTPCrypto . "\n";
echo "From: " . $emailConfig->fromEmail . "\n";
echo "\n";

$result = $email->send();

if ($result) {
    echo "✓ Email sent successfully!\n";
} else {
    echo "✗ Email failed to send.\n";
}

echo "\n--- Debug Information ---\n";
echo $email->printDebugger(['headers', 'subject', 'body']);

// Save debug to file
$logFile = WRITEPATH . 'logs/smtp_test_' . date('Ymd_His') . '.log';
file_put_contents($logFile, ($result ? "SUCCESS\n" : "FAILED\n") . $email->printDebugger(['headers', 'subject', 'body', 'protocol']));
echo "\nDebug log saved to: {$logFile}\n";
