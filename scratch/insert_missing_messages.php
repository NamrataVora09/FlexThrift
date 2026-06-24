<?php
/**
 * Inserts the 7 missing app_message keys into the database.
 */
$missingMessages = [
    ['message_key' => 'account_blocked',            'message_value' => 'Your account has been blocked.',                    'category' => 'error'],
    ['message_key' => 'offer_dates_required',        'message_value' => 'Rental start and end dates are required.',          'category' => 'error'],
    ['message_key' => 'product_update_success',      'message_value' => 'Product updated successfully.',                     'category' => 'success'],
    ['message_key' => 'offer_action_success',        'message_value' => 'Offer action completed successfully!',              'category' => 'success'],
    ['message_key' => 'zone_delete_success',         'message_value' => 'Zone deleted successfully.',                        'category' => 'success'],
    ['message_key' => 'edit_request_approve_success','message_value' => 'Edit request approved and merged.',                 'category' => 'success'],
    ['message_key' => 'edit_request_reject_success', 'message_value' => 'Edit request rejected.',                            'category' => 'success'],
];

try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=flex', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $now = date('Y-m-d H:i:s');
    $inserted = 0;
    $skipped = 0;

    foreach ($missingMessages as $msg) {
        $stmt = $pdo->prepare("SELECT id FROM app_messages WHERE message_key = ?");
        $stmt->execute([$msg['message_key']]);
        if ($stmt->fetch()) {
            echo "  SKIP (exists): {$msg['message_key']}" . PHP_EOL;
            $skipped++;
        } else {
            $ins = $pdo->prepare("INSERT INTO app_messages (message_key, message_value, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?)");
            $ins->execute([$msg['message_key'], $msg['message_value'], $msg['category'], $now, $now]);
            echo "  INSERTED: {$msg['message_key']}" . PHP_EOL;
            $inserted++;
        }
    }

    echo PHP_EOL . "Done. Inserted: $inserted, Skipped: $skipped" . PHP_EOL;

} catch (Exception $e) {
    echo 'ERROR: ' . $e->getMessage() . PHP_EOL;
}
