<?php
// Mock CodeIgniter environment for CLI testing
define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR);
chdir(FCPATH);

require FCPATH . '../app/Config/Paths.php';
$paths = new Config\Paths();

require $paths->systemDirectory . '/Boot.php';
// Boot the framework for CLI/spark:
\CodeIgniter\Boot::bootSpark($paths);

echo "Running RecreateAppMessagesTable migration steps manually to debug...\n";

try {
    $db = \Config\Database::connect();
    $forge = \Config\Database::forge();

    $migratedData = [];
    
    // 1. If old app_messages table exists, fetch its data to preserve it
    if ($db->tableExists('app_messages')) {
        echo "Old app_messages table exists. Fetching rows...\n";
        $rows = $db->table('app_messages')->get()->getResultArray();
        echo "Fetched " . count($rows) . " rows.\n";
        foreach ($rows as $row) {
            $key = $row['key'] ?? ($row['message_key'] ?? null);
            $message = $row['message'] ?? ($row['message_value'] ?? null);
            
            if ($key !== null && $message !== null) {
                $migratedData[] = [
                    'key'                => $key,
                    'message'            => $message,
                    'position_of_params' => null,
                ];
            }
        }
        
        // 2. Drop the old app_messages table
        echo "Dropping old app_messages table...\n";
        $forge->dropTable('app_messages', true);
    }
    
    // 3. Create the new app_messages table structure
    echo "Creating new app_messages table...\n";
    $forge->addField([
        'id'                 => ['type' => 'INT', 'auto_increment' => true],
        'key'                => ['type' => 'VARCHAR', 'constraint' => 255, 'unique' => true, 'null' => false],
        'message'            => ['type' => 'TEXT', 'null' => false],
        'position_of_params' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true, 'default' => null],
        'created_at'         => ['type' => 'TIMESTAMP', 'null' => true],
        'updated_at'         => ['type' => 'TIMESTAMP', 'null' => true],
    ]);
    $forge->addKey('id', true);
    $forge->createTable('app_messages');
    echo "New app_messages table created successfully.\n";
    
    // 4. Insert the migrated data back into the new table
    if (!empty($migratedData)) {
        echo "Inserting " . count($migratedData) . " migrated rows...\n";
        $db->table('app_messages')->insertBatch($migratedData);
        echo "Data migrated successfully!\n";
    } else {
        echo "No data to migrate.\n";
    }
} catch (\Throwable $e) {
    echo "Error encountered: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
