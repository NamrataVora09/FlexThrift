<?php
/**
 * audit_messages.php
 *
 * Compares:
 *   A) Keys defined in all_app_messages.txt (every key the system uses)
 *   B) DB keys defined in $messageKeyMap in BaseApiController.php
 *       (the values on the right-hand side of the '=>' pairs)
 *
 * Reports:
 *   1. Duplicate DB keys in $messageKeyMap (different hardcoded strings → same key)
 *   2. Keys in all_app_messages.txt that are NOT mapped in $messageKeyMap at all
 *   3. DB keys in $messageKeyMap that are NOT in all_app_messages.txt
 *   4. Duplicate keys appearing more than once in all_app_messages.txt
 */

$workspace = 'c:/Users/harpreet singh/Downloads/flex/flex';

// ─────────────────────────────────────────────────────────
// A) Extract DB keys from $messageKeyMap in BaseApiController.php
// ─────────────────────────────────────────────────────────
$baseFile  = $workspace . '/app/Controllers/Api/BaseApiController.php';
$baseContent = file_get_contents($baseFile);

// Isolate just the $messageKeyMap array body
preg_match('/protected static array \$messageKeyMap = \[(.*?)\];/s', $baseContent, $arrayMatch);
$mapBody = $arrayMatch[1] ?? '';

// Extract all pairs:  'Hardcoded text'  =>  'db_key'
$mapPairs = []; // db_key => [hardcoded texts...]
preg_match_all("/['\"]([^'\"]{2,200})['\"]\s*=>\s*['\"]([a-z0-9_]{2,80})['\"]/i", $mapBody, $m, PREG_SET_ORDER);
foreach ($m as $row) {
    $text = trim($row[1]);
    $key  = trim($row[2]);
    $mapPairs[$key][] = $text;
}

// ─────────────────────────────────────────────────────────
// B) Extract all keys from all_app_messages.txt
// ─────────────────────────────────────────────────────────
$msgFile = $workspace . '/all_app_messages.txt';
$msgContent = file_get_contents($msgFile);

// Pattern:  Key:       some_key
preg_match_all('/Key:\s+([a-z0-9_]{2,80})\s/i', $msgContent, $km);
$allMsgKeys = array_unique($km[1]);
sort($allMsgKeys);

// ─────────────────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────────────────
$mapKeys = array_keys($mapPairs);
sort($mapKeys);

// 1. Duplicate DB keys in $messageKeyMap (same key mapped from multiple hardcoded strings – OK by design, flag if suspicious)
$duplicates = array_filter($mapPairs, fn($texts) => count($texts) > 1);

// 2. Keys in all_app_messages.txt NOT covered by $messageKeyMap
$missingFromMap = array_diff($allMsgKeys, $mapKeys);

// 3. DB keys in $messageKeyMap NOT in all_app_messages.txt (not seeded)
$missingFromSeed = array_diff($mapKeys, $allMsgKeys);

// 4. Duplicate keys in all_app_messages.txt
$rawKeys = $km[1]; // unfiltered, may have duplicates
$duplicatesInMsgFile = array_filter(
    array_count_values($rawKeys),
    fn($count) => $count > 1
);

echo "═══════════════════════════════════════════════════════════════\n";
echo "  APP MESSAGES AUDIT REPORT\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

echo "Total unique keys in all_app_messages.txt : " . count($allMsgKeys) . "\n";
echo "Total unique DB keys in \$messageKeyMap    : " . count($mapKeys) . "\n\n";

// ── 1. Duplicate DB keys (one key → multiple hardcoded strings, intentional alias)
echo "──────────────────────────────────────────────────────────────\n";
echo " [1] DB KEYS WITH MULTIPLE HARDCODED ALIASES (in \$messageKeyMap)\n";
echo "     (These are intentional aliases — same message shown for different source strings)\n";
echo "──────────────────────────────────────────────────────────────\n";
if (empty($duplicates)) {
    echo "     ✅ None found — all mappings are unique.\n\n";
} else {
    foreach ($duplicates as $key => $texts) {
        echo "     Key: $key\n";
        foreach ($texts as $t) {
            echo "          → \"$t\"\n";
        }
        echo "\n";
    }
}

// ── 2. Keys in all_app_messages.txt but NOT in $messageKeyMap (not intercepted by BaseApiController)
echo "──────────────────────────────────────────────────────────────\n";
echo " [2] KEYS IN all_app_messages.txt BUT NOT IN \$messageKeyMap\n";
echo "     (These keys are seeded/used but never intercepted by BaseApiController)\n";
echo "──────────────────────────────────────────────────────────────\n";
if (empty($missingFromMap)) {
    echo "     ✅ All keys in all_app_messages.txt are covered by \$messageKeyMap.\n\n";
} else {
    $i = 1;
    foreach ($missingFromMap as $key) {
        echo "     [{$i}] $key\n";
        $i++;
    }
    echo "\n     Total missing from \$messageKeyMap: " . count($missingFromMap) . "\n\n";
}

// ── 3. DB keys in $messageKeyMap but NOT in all_app_messages.txt (mapped but not seeded)
echo "──────────────────────────────────────────────────────────────\n";
echo " [3] KEYS IN \$messageKeyMap BUT NOT IN all_app_messages.txt\n";
echo "     (These are intercepted by BaseApiController but NOT seeded in app_messages table)\n";
echo "──────────────────────────────────────────────────────────────\n";
if (empty($missingFromSeed)) {
    echo "     ✅ All \$messageKeyMap keys are present in all_app_messages.txt.\n\n";
} else {
    $i = 1;
    foreach ($missingFromSeed as $key) {
        $hardcoded = implode(" / ", array_map(fn($t) => "\"$t\"", $mapPairs[$key]));
        echo "     [{$i}] $key  ← mapped from $hardcoded\n";
        $i++;
    }
    echo "\n     Total missing from seeder: " . count($missingFromSeed) . "\n\n";
}

// ── 4. Duplicate keys in all_app_messages.txt
echo "──────────────────────────────────────────────────────────────\n";
echo " [4] DUPLICATE KEYS IN all_app_messages.txt\n";
echo "──────────────────────────────────────────────────────────────\n";
if (empty($duplicatesInMsgFile)) {
    echo "     ✅ No duplicate keys in all_app_messages.txt.\n\n";
} else {
    foreach ($duplicatesInMsgFile as $key => $count) {
        echo "     $key — appears $count times\n";
    }
    echo "\n";
}

echo "═══════════════════════════════════════════════════════════════\n";
echo "  AUDIT COMPLETE\n";
echo "═══════════════════════════════════════════════════════════════\n";
