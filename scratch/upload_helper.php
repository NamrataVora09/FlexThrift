<?php
// Local script to upload files to server using sshpass/scp or direct SSH execution
$serverHost = '200.234.32.9';
$serverUser = 'root';
$serverPass = 'Rootflex@0123';
$targetDir  = '/home/flexthrift/htdocs/flexthrift.in';

$filesToUpload = [
    'seed_seo_settings.sql',
    'check_seo_db.php'
];

foreach ($filesToUpload as $file) {
    if (!file_exists(__DIR__ . '/../' . $file)) {
        echo "File {$file} not found locally.\n";
        continue;
    }

    $content = file_get_contents(__DIR__ . '/../' . $file);
    $b64 = base64_encode($content);

    echo "Uploading {$file} to server...\n";

    // Use ssh with inline password handling or plink
    $cmd = "ssh {$serverUser}@{$serverHost} \"echo '{$b64}' | base64 -d > {$targetDir}/{$file}\"";
    
    // We will run this via plink or ssh command
}
