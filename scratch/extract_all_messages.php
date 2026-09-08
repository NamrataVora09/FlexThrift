<?php

$workspace = 'c:/Users/harpreet singh/Downloads/flex/flex';

$messages = [];

function addMessage($key, $val, $source = '') {
    global $messages;
    $key = trim($key);
    $val = trim(stripslashes($val));
    if (!$key) return;
    
    if (!isset($messages[$key])) {
        $messages[$key] = [
            'value' => $val,
            'source' => $source
        ];
    } else {
        // If existing value is generic or empty, update it with better value
        if (empty($messages[$key]['value']) && !empty($val)) {
            $messages[$key]['value'] = $val;
        }
    }
}

// 1. Scan PHP Seeders and Migrations
$files = glob($workspace . '/app/Database/Migrations/*.php');
$files = array_merge($files, glob($workspace . '/app/Database/Seeds/*.php'));
$files = array_merge($files, glob($workspace . '/scratch/*.php'));

foreach ($files as $filePath) {
    if (!file_exists($filePath)) continue;
    $content = file_get_contents($filePath);
    
    // Pattern 1: ['message_key' => 'key', 'message_value' => 'val', ...]
    preg_match_all("/\['message_key'\s*=>\s*'([^']+)',\s*'message_value'\s*=>\s*'([^']*)'/", $content, $matches, PREG_SET_ORDER);
    foreach ($matches as $m) {
        addMessage($m[1], $m[2], basename($filePath));
    }

    // Pattern 2: double quotes
    preg_match_all('/\["message_key"\s*=>\s*"([^"]+)",\s*"message_value"\s*=>\s*"([^"]*)"/', $content, $matches, PREG_SET_ORDER);
    foreach ($matches as $m) {
        addMessage($m[1], $m[2], basename($filePath));
    }
}

// 2. Scan all PHP files in app/
$allPhpFiles = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($workspace . '/app'));
foreach ($allPhpFiles as $file) {
    if ($file->isFile() && $file->getExtension() === 'php') {
        $content = file_get_contents($file->getPathname());
        preg_match_all("/\['message_key'\s*=>\s*'([^']+)',\s*'message_value'\s*=>\s*'([^']*)'/", $content, $matches, PREG_SET_ORDER);
        foreach ($matches as $m) {
            addMessage($m[1], $m[2], basename($file->getPathname()));
        }
    }
}

// 3. Scan all TSX/TS files in frontend/ for toastSuccess, toastError, toastWarning, toastInfo, getMsg
$allTsFiles = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($workspace . '/frontend'));
foreach ($allTsFiles as $file) {
    if ($file->isFile() && in_array($file->getExtension(), ['ts', 'tsx'])) {
        $content = file_get_contents($file->getPathname());
        
        // Pattern: toastSuccess('key', 'fallback') or toastError('key', 'fallback') etc.
        preg_match_all("/toast(?:Success|Error|Warning|Info)\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]/i", $content, $matches, PREG_SET_ORDER);
        foreach ($matches as $m) {
            addMessage($m[1], $m[2], 'frontend/' . basename($file->getPathname()));
        }
        
        // Pattern: getMsg('key', 'fallback')
        preg_match_all("/getMsg\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]/i", $content, $matches, PREG_SET_ORDER);
        foreach ($matches as $m) {
            addMessage($m[1], $m[2], 'frontend/' . basename($file->getPathname()));
        }
    }
}

ksort($messages);

$outPath = $workspace . '/all_app_messages.txt';
$outContent = "=========================================================================\n";
$outContent .= "                 COMPLETE APPLICATION MESSAGES & KEYS                   \n";
$outContent .= "                 Total Unique Message Keys: " . count($messages) . "\n";
$outContent .= "=========================================================================\n\n";

$i = 1;
foreach ($messages as $key => $data) {
    $outContent .= sprintf("[%3d] Key:     %s\n      Message: %s\n      Source:  %s\n\n", $i++, $key, $data['value'], $data['source']);
}

file_put_contents($outPath, $outContent);
echo "Successfully exported " . count($messages) . " unique messages to: " . $outPath . "\n";
