const fs = require('fs');
const path = require('path');

const backendData = JSON.parse(fs.readFileSync('scratch/extracted_backend_messages.json', 'utf8'));
const frontendData = JSON.parse(fs.readFileSync('scratch/extracted_frontend_messages.json', 'utf8'));

const combinedMap = new Map();

// 1. Add backend messages
backendData.keys.forEach(item => {
  combinedMap.set(item.key, {
    key: item.key,
    value: item.fallback || item.key,
    category: 'info'
  });
});

// 2. Add frontend messages
frontendData.messages.forEach(item => {
  if (!combinedMap.has(item.key)) {
    combinedMap.set(item.key, {
      key: item.key,
      value: item.value || item.key,
      category: item.category || 'info'
    });
  } else {
    const existing = combinedMap.get(item.key);
    if ((!existing.value || existing.value === existing.key) && item.value) {
      existing.value = item.value;
    }
    if (item.category && item.category !== 'info') {
      existing.category = item.category;
    }
  }
});

function escapePhpString(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const arrayEntries = [];
for (const [key, data] of combinedMap.entries()) {
  const phpVal = escapePhpString(data.value);
  arrayEntries.push(`            ['message_key' => '${key}', 'message_value' => '${phpVal}', 'category' => '${data.category}'],`);
}

const migrationContent = `<?php

namespace App\\Database\\Migrations;

use CodeIgniter\\Database\\Migration;

class SeedAllExtractedAppMessages extends Migration
{
    public function up()
    {
        $db = \\Config\\Database::connect();

        $messages = [
${arrayEntries.join('\n')}
        ];

        $now = date('Y-m-d H:i:s');
        foreach ($messages as $m) {
            $existing = $db->table('app_messages')->where('message_key', $m['message_key'])->get()->getRowArray();
            if (!$existing) {
                $db->table('app_messages')->insert(array_merge($m, [
                    'created_at' => $now,
                    'updated_at' => $now
                ]));
            }
        }
    }

    public function down()
    {
        // Safe down migration — retain user customized app_messages
    }
}
`;

fs.writeFileSync('app/Database/Migrations/2026-09-04-180000_SeedAllExtractedAppMessages.php', migrationContent);
console.log('CodeIgniter Migration 2026-09-04-180000_SeedAllExtractedAppMessages.php successfully created!');
