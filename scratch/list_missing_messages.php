<?php
$workspace = 'c:/Users/harpreet singh/Downloads/flex/flex';
$controllersDir = $workspace . '/app/Controllers/Api';

$baseContent = file_get_contents($controllersDir . '/BaseApiController.php');
$keyMap = [];
if (preg_match('/protected static array \$messageKeyMap = \[(.*?)\];/s', $baseContent, $m)) {
    preg_match_all("/['\"]([^'\"]{2,200})['\"]\s*=>\s*['\"]([a-z0-9_]{2,70})['\"]/i", $m[1], $matches, PREG_SET_ORDER);
    foreach ($matches as $row) {
        $keyMap[trim($row[1])] = trim($row[2]);
    }
}

$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=flex', 'root', '');
$dbKeys = $pdo->query("SELECT message_key, message_value FROM app_messages")->fetchAll(PDO::FETCH_KEY_PAIR);

$controllerFiles = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($controllersDir));
$extractedMessages = [];

foreach ($controllerFiles as $file) {
    if ($file->isFile() && $file->getExtension() === 'php') {
        $content = file_get_contents($file->getPathname());
        $filename = basename($file->getPathname());

        preg_match_all("/'message'\s*=>\s*'([^']+)'/", $content, $matches1, PREG_SET_ORDER);
        foreach ($matches1 as $m) {
            $msg = trim($m[1]);
            $extractedMessages[$msg] = $filename;
        }

        preg_match_all('/\'message\'\s*=>\s*"([^"]+)"/', $content, $matches2, PREG_SET_ORDER);
        foreach ($matches2 as $m) {
            $msg = trim($m[1]);
            $extractedMessages[$msg] = $filename;
        }
    }
}

ksort($extractedMessages);

$missing = [];
foreach ($extractedMessages as $msg => $file) {
    $mappedKey = $keyMap[$msg] ?? null;
    if (!$mappedKey || !isset($dbKeys[$mappedKey])) {
        $missing[] = [
            'msg' => $msg,
            'file' => $file,
            'mappedKey' => $mappedKey
        ];
    }
}

echo "Found " . count($missing) . " missing messages:\n";
foreach ($missing as $idx => $item) {
    echo sprintf("[%2d] \"%s\"  (File: %s)\n", $idx + 1, $item['msg'], $item['file']);
}
