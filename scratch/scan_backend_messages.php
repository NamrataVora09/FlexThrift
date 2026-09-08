<?php
$workspace = 'c:/Users/harpreet singh/Downloads/flex/flex';
$controllersDir = $workspace . '/app/Controllers/Api';

// 1. Read BaseApiController::$messageKeyMap
$baseContent = file_get_contents($controllersDir . '/BaseApiController.php');
$keyMap = [];
if (preg_match('/protected static array \$messageKeyMap = \[(.*?)\];/s', $baseContent, $m)) {
    preg_match_all("/['\"]([^'\"]{2,200})['\"]\s*=>\s*['\"]([a-z0-9_]{2,70})['\"]/i", $m[1], $matches, PREG_SET_ORDER);
    foreach ($matches as $row) {
        $keyMap[trim($row[1])] = trim($row[2]);
    }
}

// 2. Read Seeder & Migration files to get all seeded DB keys
$seededKeys = [];
$seedFiles = glob($workspace . '/app/Database/Migrations/*.php');
$seedFiles[] = $workspace . '/seed_all_app_messages.php';

foreach ($seedFiles as $sf) {
    if (!file_exists($sf)) continue;
    $c = file_get_contents($sf);
    preg_match_all("/\['message_key'\s*=>\s*['\"]([^'\"]+)['\"]\s*,\s*'message_value'\s*=>\s*['\"]([^'\"]*)['\"]/i", $c, $matches, PREG_SET_ORDER);
    foreach ($matches as $m) {
        $seededKeys[trim($m[1])] = trim($m[2]);
    }
}

// 3. Scan all Controller files for 'message' => '...' or 'message' => "..."
$controllerFiles = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($controllersDir));
$extractedMessages = [];

foreach ($controllerFiles as $file) {
    if ($file->isFile() && $file->getExtension() === 'php') {
        $content = file_get_contents($file->getPathname());
        $filename = basename($file->getPathname());

        // Pattern for single quotes: 'message' => '...'
        preg_match_all("/'message'\s*=>\s*'([^']+)'/", $content, $matches1, PREG_SET_ORDER);
        foreach ($matches1 as $m) {
            $msg = trim($m[1]);
            if (!isset($extractedMessages[$msg])) {
                $extractedMessages[$msg] = [];
            }
            $extractedMessages[$msg][] = $filename;
        }

        // Pattern for double quotes: 'message' => "..."
        preg_match_all('/\'message\'\s*=>\s*"([^"]+)"/', $content, $matches2, PREG_SET_ORDER);
        foreach ($matches2 as $m) {
            $msg = trim($m[1]);
            if (!isset($extractedMessages[$msg])) {
                $extractedMessages[$msg] = [];
            }
            $extractedMessages[$msg][] = $filename;
        }
    }
}

ksort($extractedMessages);

// 4. Categorize into In DB vs Not In DB
$inDb = [];
$notInDb = [];

foreach ($extractedMessages as $msg => $files) {
    $filesList = implode(', ', array_unique($files));
    $mappedKey = $keyMap[$msg] ?? null;

    if ($mappedKey && isset($seededKeys[$mappedKey])) {
        $inDb[] = [
            'message' => $msg,
            'key' => $mappedKey,
            'db_value' => $seededKeys[$mappedKey],
            'files' => $filesList
        ];
    } else {
        $notInDb[] = [
            'message' => $msg,
            'mapped_key' => $mappedKey ?: 'NOT MAPPED IN BASE_API',
            'in_keymap' => $mappedKey ? 'YES' : 'NO',
            'in_db' => isset($seededKeys[$mappedKey]) ? 'YES' : 'NO',
            'files' => $filesList
        ];
    }
}

$outputStr = "=========================================================================\n";
$outputStr .= "       BACKEND API MESSAGES ANALYSIS (Controller vs BaseApi & DB Seeders)\n";
$outputStr .= "=========================================================================\n";
$outputStr .= " Total Unique Response Messages Extracted from Controllers: " . count($extractedMessages) . "\n";
$outputStr .= " Found in Database Seeders (Mapped & Ready): " . count($inDb) . "\n";
$outputStr .= " NOT in Database Seeders (Missing or Unmapped): " . count($notInDb) . "\n";
$outputStr .= "=========================================================================\n\n";

$outputStr .= "🔴 MESSAGES NOT IN DATABASE SEEDERS (" . count($notInDb) . " found):\n";
$outputStr .= "-------------------------------------------------------------------------\n";
$i = 1;
foreach ($notInDb as $item) {
    $outputStr .= sprintf("[%2d] Message:    \"%s\"\n     Mapped Key: %s\n     In KeyMap:  %s\n     In Seeder:  %s\n     Source:     %s\n\n", 
        $i++, $item['message'], $item['mapped_key'], $item['in_keymap'], $item['in_db'], $item['files']);
}

$outputStr .= "\n🟢 MESSAGES FOUND IN DATABASE SEEDERS (" . count($inDb) . " found):\n";
$outputStr .= "-------------------------------------------------------------------------\n";
$j = 1;
foreach ($inDb as $item) {
    $outputStr .= sprintf("[%2d] Message:  \"%s\"\n     DB Key:   %s\n     DB Value: \"%s\"\n     Source:   %s\n\n", 
        $j++, $item['message'], $item['key'], $item['db_value'], $item['files']);
}

file_put_contents($workspace . '/scratch/backend_messages_report.txt', $outputStr);
echo $outputStr;
