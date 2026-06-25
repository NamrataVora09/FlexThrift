<?php

/**
 * Clear Pending Approvals from Database
 * This script deletes all pending products and pending edit requests
 * Run this from the project root: php scratch/clear_pending_approvals.php
 */

$host = '127.0.0.1';
$user = 'root';
$pass = '';
$db   = 'flex';

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "=== Clearing Pending Approvals ===\n\n";

try {
    // Count pending products
    $result = $conn->query("SELECT COUNT(*) as count FROM products WHERE status = 'pending'");
    $row = $result->fetch_assoc();
    $pendingProducts = $row['count'];
    echo "Found {$pendingProducts} pending products\n";

    // Count pending edit requests
    $result = $conn->query("SELECT COUNT(*) as count FROM product_edit_requests WHERE status = 'pending'");
    $row = $result->fetch_assoc();
    $pendingEditRequests = $row['count'];
    echo "Found {$pendingEditRequests} pending edit requests\n\n";

    if ($pendingProducts == 0 && $pendingEditRequests == 0) {
        echo "No pending approvals to clear. Exiting.\n";
        $conn->close();
        exit(0);
    }

    // Confirm before proceeding
    echo "This will DELETE all pending products and edit requests.\n";
    echo "Type 'yes' to confirm: ";
    $handle = fopen("php://stdin", "r");
    $line = fgets($handle);
    fclose($handle);

    if (trim($line) !== 'yes') {
        echo "Operation cancelled.\n";
        $conn->close();
        exit(0);
    }

    echo "\nStarting deletion...\n";

    // Delete pending edit requests first (foreign key dependency)
    if ($pendingEditRequests > 0) {
        $conn->query("DELETE FROM product_edit_requests WHERE status = 'pending'");
        echo "✓ Deleted {$pendingEditRequests} pending edit requests\n";
    }

    // Delete pending products
    if ($pendingProducts > 0) {
        // First, get all pending products to delete their images
        $result = $conn->query("SELECT id FROM products WHERE status = 'pending'");
        $productIds = [];
        while ($row = $result->fetch_assoc()) {
            $productIds[] = $row['id'];
        }

        // Delete associated images from filesystem and database
        foreach ($productIds as $productId) {
            // Get image paths
            $imgResult = $conn->query("SELECT image_path FROM product_images WHERE product_id = $productId");
            while ($imgRow = $imgResult->fetch_assoc()) {
                $imagePath = __DIR__ . '/../public/' . $imgRow['image_path'];
                if (file_exists($imagePath)) {
                    unlink($imagePath);
                }
            }
            // Delete image records
            $conn->query("DELETE FROM product_images WHERE product_id = $productId");
        }

        // Delete the products
        $conn->query("DELETE FROM products WHERE status = 'pending'");
        echo "✓ Deleted {$pendingProducts} pending products (and associated images)\n";
    }

    echo "\n=== Success! All pending approvals have been cleared ===\n";
    $conn->close();

} catch (Exception $e) {
    echo "\n=== Error ===\n";
    echo "Message: " . $e->getMessage() . "\n";
    $conn->close();
    exit(1);
}
