<?php
$host   = 'localhost';
$dbName = 'flex-pro';
$user   = 'flexadmin';
$pass   = 'gZLYbwsS7a7im2vAqfNi';
$port   = 3306;

$envFiles = [__DIR__ . '/.env', getcwd() . '/.env'];
foreach ($envFiles as $envFile) {
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (str_starts_with($line, '#')) continue;
            if (preg_match('/^database\.default\.hostname\s*=\s*(.*)$/i', $line, $m)) $host = trim($m[1], "\"'\r\n ");
            if (preg_match('/^database\.default\.database\s*=\s*(.*)$/i', $line, $m)) $dbName = trim($m[1], "\"'\r\n ");
            if (preg_match('/^database\.default\.username\s*=\s*(.*)$/i', $line, $m)) $user = trim($m[1], "\"'\r\n ");
            if (preg_match('/^database\.default\.password\s*=\s*(.*)$/i', $line, $m)) $pass = trim($m[1], "\"'\r\n ");
            if (preg_match('/^database\.default\.port\s*=\s*(.*)$/i', $line, $m)) $port = (int)trim($m[1], "\"'\r\n ");
        }
    }
}

try {
    $pdo = new PDO("mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `seo_settings` (
            `id` INT(11) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `page_key` VARCHAR(100) UNIQUE NOT NULL,
            `page_name` VARCHAR(255) NOT NULL,
            `route` VARCHAR(255) NOT NULL,
            `title` VARCHAR(255) NULL,
            `meta_description` TEXT NULL,
            `meta_keywords` VARCHAR(255) NULL,
            `og_title` VARCHAR(255) NULL,
            `og_description` TEXT NULL,
            `created_at` DATETIME NULL,
            `updated_at` DATETIME NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pages = [
        ['home', 'Home', '/', 'FlexMarket — Rent or Buy Premium Fashion', 'India\'s premier platform for pre-owned fashion.'],
        ['register', 'Register', '/register', 'Create Your Account — FlexMarket', 'Sign up to FlexMarket and start buying or selling.'],
        ['forgot-password', 'Forgot Password', '/forgot-password', 'Forgot Password — FlexMarket', 'Reset your password securely.'],
        ['verify-otp', 'Verify OTP', '/verify-otp', 'Verify OTP — FlexMarket', 'Verify your account OTP.'],
        ['cart', 'Cart', '/cart', 'Your Cart — FlexMarket', 'Review items in your shopping cart.'],
        ['wishlist', 'Wishlist', '/wishlist', 'My Wishlist — FlexMarket', 'View your saved wishlist products.'],
        ['buyer', 'Buyer Home', '/buyer', 'Buyer Dashboard — FlexMarket', 'Manage buyer orders and offers.'],
        ['buyer-browse', 'Browse Products', '/buyer/browse', 'Browse Products — FlexMarket', 'Explore premium fashion.'],
        ['buyer-products', 'Buyer Products', '/buyer/products', 'Products — FlexMarket', 'Explore all available products.'],
        ['buyer-product-detail', 'Product Detail', '/buyer/product/[id]', 'Product Details — FlexMarket', 'View product details and terms.'],
        ['buyer-dashboard', 'Buyer Dashboard', '/buyer/dashboard', 'My Dashboard — FlexMarket Buyer', 'Track your buyer activity.'],
        ['buyer-my-offers', 'My Offers', '/buyer/my-offers', 'My Offers — FlexMarket', 'Manage submitted offers.'],
        ['buyer-contacts', 'My Contacts', '/buyer/contacts', 'My Contacts — FlexMarket', 'View contacted sellers.'],
        ['buyer-subscriptions', 'Buyer Subscriptions', '/buyer/subscriptions', 'My Subscriptions — FlexMarket Buyer', 'Manage buyer plans.'],
        ['buyer-checkout-plan', 'Checkout Plan', '/buyer/checkout-plan/[id]', 'Checkout — FlexMarket', 'Checkout subscription plan.'],
        ['buyer-payment-callback', 'Payment Processing', '/buyer/payment-callback', 'Payment Processing — FlexMarket', 'Processing payment.'],
        ['buyer-notifications', 'Notifications', '/buyer/notifications', 'Notifications — FlexMarket Buyer', 'View notifications.'],
        ['buyer-profile', 'Buyer Profile', '/buyer/profile', 'My Profile — FlexMarket Buyer', 'Manage buyer profile.'],
        ['buyer-referral', 'Referral', '/buyer/referral', 'Referral — FlexMarket', 'Invite friends and earn rewards.'],
        ['buyer-transactions', 'Buyer Transactions', '/buyer/transactions', 'Transactions — FlexMarket Buyer', 'View payment transactions.'],
        ['buyer-help', 'Help & Support', '/buyer/help', 'Help & Support — FlexMarket', 'Find support answers.'],
        ['seller', 'Seller Home', '/seller', 'Seller Dashboard — FlexMarket', 'Manage seller account.'],
        ['seller-upload-product', 'Upload Product', '/seller/upload-product', 'Upload Product — FlexMarket Seller', 'List new items for sale or rent.'],
        ['seller-my-products', 'My Products', '/seller/my-products', 'My Products — FlexMarket Seller', 'Manage product listings.'],
        ['seller-offers', 'Seller Offers', '/seller/offers', 'Offers Received — FlexMarket Seller', 'View buyer offers.'],
        ['seller-subscriptions', 'Seller Subscriptions', '/seller/subscriptions', 'My Subscriptions — FlexMarket Seller', 'Manage seller plans.'],
        ['seller-checkout-plan', 'Seller Checkout Plan', '/seller/checkout-plan/[id]', 'Checkout — FlexMarket Seller', 'Checkout seller plan.'],
        ['seller-payment-callback', 'Seller Payment Callback', '/seller/payment-callback', 'Payment Processing — FlexMarket', 'Processing seller payment.'],
        ['seller-notifications', 'Seller Notifications', '/seller/notifications', 'Notifications — FlexMarket Seller', 'Seller notifications.'],
        ['seller-profile', 'Seller Profile', '/seller/profile', 'My Profile — FlexMarket Seller', 'Manage seller profile.'],
        ['seller-referral', 'Seller Referral', '/seller/referral', 'Referral — FlexMarket Seller', 'Invite sellers.'],
        ['seller-transactions', 'Seller Transactions', '/seller/transactions', 'Transactions — FlexMarket Seller', 'Seller transactions.'],
        ['seller-analytics', 'Seller Analytics', '/seller/analytics', 'Analytics — FlexMarket Seller', 'View sales analytics.'],
        ['seller-chat', 'Seller Chat', '/seller/chat', 'Chat — FlexMarket Seller', 'Chat with buyers.'],
        ['seller-help', 'Seller Help', '/seller/help', 'Help & Support — FlexMarket Seller', 'Seller help center.'],
        ['admin', 'Admin Dashboard', '/admin', 'Admin Dashboard — FlexMarket', 'Admin control panel.'],
        ['admin-upload-product', 'Admin Upload Product', '/admin/upload-product', 'Upload Product — FlexMarket Admin', 'Upload products.'],
        ['admin-my-products', 'Admin My Products', '/admin/my-products', 'My Products — FlexMarket Admin', 'Manage admin products.'],
        ['admin-pending-products', 'Pending Products', '/admin/pending-products', 'Pending Approval — FlexMarket Admin', 'Review pending products.'],
        ['admin-moderation-history', 'Moderation History', '/admin/moderation-history', 'Moderation History — FlexMarket Admin', 'View moderation history.'],
        ['admin-offers', 'Admin Offers', '/admin/offers', 'Offers — FlexMarket Admin', 'Manage admin offers.'],
        ['admin-users', 'Users', '/admin/users', 'Users — FlexMarket Admin', 'Manage platform users.'],
        ['admin-subscriptions', 'Admin Subscriptions', '/admin/subscriptions', 'Subscriptions — FlexMarket Admin', 'Manage admin subscriptions.'],
        ['admin-subscription-plans', 'Subscription Plans', '/admin/subscription-plans', 'Subscription Plans — FlexMarket Admin', 'View plans.'],
        ['admin-payment-callback', 'Admin Payment Callback', '/admin/payment-callback', 'Payment Processing — FlexMarket Admin', 'Processing payment.'],
        ['admin-profile', 'Admin Profile', '/admin/profile', 'My Profile — FlexMarket Admin', 'Admin profile.'],
        ['admin-referral', 'Admin Referral', '/admin/referral', 'Referral — FlexMarket Admin', 'Admin referrals.'],
        ['admin-transactions', 'Admin Transactions', '/admin/transactions', 'Transactions — FlexMarket Admin', 'Admin transactions.'],
        ['admin-analytics', 'Admin Analytics', '/admin/analytics', 'Analytics — FlexMarket Admin', 'Admin analytics.'],
        ['superadmin', 'SuperAdmin Dashboard', '/superadmin', 'SuperAdmin Dashboard — FlexMarket', 'Full platform management.'],
        ['superadmin-users', 'SuperAdmin Users', '/superadmin/users', 'Manage Users — FlexMarket SuperAdmin', 'Manage platform users.'],
        ['superadmin-admins', 'Manage Admins', '/superadmin/admins', 'Manage Admins — FlexMarket SuperAdmin', 'Manage admin accounts.'],
        ['superadmin-brands', 'Manage Brands', '/superadmin/brands', 'Manage Brands — FlexMarket SuperAdmin', 'Manage brand catalog.'],
        ['superadmin-original-brands', 'Original Brands', '/superadmin/original-brands', 'Original Brands — FlexMarket SuperAdmin', 'Manage original brands.'],
        ['superadmin-pending', 'Pending Products', '/superadmin/pending-products', 'Pending Products — FlexMarket SuperAdmin', 'Approve pending products.'],
        ['superadmin-my-products', 'SuperAdmin My Products', '/superadmin/my-products', 'My Products — FlexMarket SuperAdmin', 'Manage superadmin products.'],
        ['superadmin-upload', 'SuperAdmin Upload Product', '/superadmin/upload-product', 'Upload Product — FlexMarket SuperAdmin', 'Upload via superadmin panel.'],
        ['superadmin-product-mgmt', 'Product Management', '/superadmin/product-management', 'Product Management — FlexMarket SuperAdmin', 'Manage all product listings.'],
        ['superadmin-offers', 'SuperAdmin Offers', '/superadmin/offers', 'All Offers — FlexMarket SuperAdmin', 'Monitor platform offers.'],
        ['superadmin-personal-offers', 'Personal Offers', '/superadmin/personal-offers', 'Personal Offers — FlexMarket SuperAdmin', 'Personal offers.'],
        ['superadmin-moderation', 'Moderation History', '/superadmin/moderation-history', 'Moderation History — FlexMarket SuperAdmin', 'Full moderation history.'],
        ['superadmin-ads', 'Advertisements', '/superadmin/advertisements', 'Advertisements — FlexMarket SuperAdmin', 'Manage ad banners.'],
        ['superadmin-ad-settings', 'Ad Settings', '/superadmin/ad-settings', 'Ad Settings — FlexMarket SuperAdmin', 'Configure ad settings.'],
        ['superadmin-taxonomy', 'Taxonomy', '/superadmin/taxonomy', 'Taxonomy — FlexMarket SuperAdmin', 'Manage taxonomy.'],
        ['superadmin-settings', 'Business Settings', '/superadmin/settings', 'Business Settings — FlexMarket SuperAdmin', 'Global platform settings.'],
        ['superadmin-biz-settings', 'Advanced Business Settings', '/superadmin/business-settings', 'Advanced Settings — FlexMarket SuperAdmin', 'Advanced config.'],
        ['superadmin-seo', 'SEO Settings', '/superadmin/seo', 'SEO Settings — FlexMarket SuperAdmin', 'Manage page SEO.'],
        ['superadmin-cms', 'CMS Pages', '/superadmin/cms', 'CMS Pages — FlexMarket SuperAdmin', 'Manage content pages.'],
        ['superadmin-coupons', 'Coupons', '/superadmin/coupons', 'Coupons — FlexMarket SuperAdmin', 'Manage coupons.'],
        ['superadmin-fee-mgmt', 'Fee Management', '/superadmin/fee-management', 'Fee Management — FlexMarket SuperAdmin', 'Manage platform fees.'],
        ['superadmin-subscription-plans', 'Subscription Plans', '/superadmin/subscription-plans', 'Subscription Plans — FlexMarket SuperAdmin', 'Manage subscription plans.'],
        ['superadmin-user-subs', 'User Subscriptions', '/superadmin/user-subscriptions', 'User Subscriptions — FlexMarket SuperAdmin', 'Manage user subscriptions.'],
        ['superadmin-reports', 'Reports', '/superadmin/reports', 'Reports — FlexMarket SuperAdmin', 'Platform reports.'],
        ['superadmin-heatmap', 'Heatmap', '/superadmin/heatmap', 'Heatmap — FlexMarket SuperAdmin', 'Geographic user heatmap.'],
        ['superadmin-analytics', 'SuperAdmin Analytics', '/superadmin/analytics', 'Analytics — FlexMarket SuperAdmin', 'Full platform analytics.'],
        ['superadmin-app-messages', 'App Messages', '/superadmin/app-messages', 'App Messages — FlexMarket SuperAdmin', 'Customize messages.'],
        ['superadmin-browse', 'Browse Products', '/superadmin/browse', 'Browse — FlexMarket SuperAdmin', 'Browse all products.'],
        ['superadmin-browse-detail', 'Browse Product Detail', '/superadmin/browse/[id]', 'Product Detail — FlexMarket SuperAdmin', 'View product details.'],
        ['superadmin-profile', 'SuperAdmin Profile', '/superadmin/profile', 'My Profile — FlexMarket SuperAdmin', 'Manage superadmin profile.'],
        ['superadmin-referral', 'SuperAdmin Referral', '/superadmin/referral', 'Referral — FlexMarket SuperAdmin', 'Manage referrals.'],
        ['superadmin-transactions', 'SuperAdmin Transactions', '/superadmin/transactions', 'Transactions — FlexMarket SuperAdmin', 'View all transactions.']
    ];

    $stmt = $pdo->prepare("
        INSERT INTO `seo_settings` 
            (`page_key`, `page_name`, `route`, `title`, `meta_description`, `og_title`, `og_description`, `created_at`, `updated_at`)
        VALUES 
            (:page_key, :page_name, :route, :title, :meta_description, :title, :meta_description, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
            `page_name` = VALUES(`page_name`),
            `route` = VALUES(`route`),
            `title` = IF(title IS NULL OR title='', VALUES(`title`), title),
            `meta_description` = IF(meta_description IS NULL OR meta_description='', VALUES(`meta_description`), meta_description),
            `updated_at` = NOW()
    ");

    $inserted = 0;
    foreach ($pages as $p) {
        $stmt->execute([
            ':page_key' => $p[0],
            ':page_name' => $p[1],
            ':route' => $p[2],
            ':title' => $p[3],
            ':meta_description' => $p[4]
        ]);
        $inserted++;
    }

    $total = $pdo->query("SELECT COUNT(*) FROM `seo_settings`")->fetchColumn();
    echo "SUCCESS: Seeded {$inserted} routes into DB. Total active SEO records: {$total}\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
