<?php
// Standalone script to create and seed seo_settings table

$envFile = __DIR__ . '/../.env';
if (!file_exists($envFile)) {
    die(".env file not found!\n");
}

$env = parse_ini_file($envFile);
if (!$env) {
    // If parse_ini_file fails, read lines manually
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $env = [];
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $env[trim($parts[0])] = trim($parts[1], " '\"");
        }
    }
}

$host = $env['database.default.hostname'] ?? '127.0.0.1';
$dbName = $env['database.default.database'] ?? 'flex';
$user = $env['database.default.username'] ?? 'root';
$pass = $env['database.default.password'] ?? '';
$port = $env['database.default.port'] ?? '3306';

echo "Connecting to DB: $dbName on $host:$port as $user...\n";

$conn = new mysqli($host, $user, $pass, $dbName, (int)$port);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error . "\n");
}

echo "Connected successfully!\nCreating seo_settings table...\n";

$createTableQuery = "
CREATE TABLE IF NOT EXISTS seo_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_key VARCHAR(100) UNIQUE NOT NULL,
    page_name VARCHAR(100) NOT NULL,
    route VARCHAR(255) NOT NULL,
    title VARCHAR(255) DEFAULT NULL,
    meta_description TEXT DEFAULT NULL,
    meta_keywords TEXT DEFAULT NULL,
    og_title VARCHAR(255) DEFAULT NULL,
    og_description TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";

if ($conn->query($createTableQuery) === TRUE) {
    echo "Table seo_settings created successfully or already exists.\n";
} else {
    die("Error creating table: " . $conn->error . "\n");
}

echo "Seeding default SEO page settings...\n";

$seeds = [
    [
        'home', 'Home Page', '/', 
        'Buy & Sell Quality Pre-owned Apparel - FlexMarket', 
        'Discover amazing deals on gently used second-hand and thrift clothing, footwear, and accessories on FlexMarket. Quality fashion, sustainable pricing.', 
        'thrift, second hand, vintage, clothes, marketplace, sustainable fashion', 
        'Sustainable Second-Hand Fashion - FlexMarket', 
        'Shop & sell quality pre-owned apparel, shoes, and gear on FlexMarket!'
    ],
    [
        'browse', 'Browse Products', '/buyer/browse', 
        'Browse Sustainable Fashion & Apparel - FlexMarket', 
        'Explore our wide catalogue of pre-owned, vintage, and branded thrift products. Filters by brand, category, condition, and price.', 
        'browse clothing, vintage marketplace, brand thrift, second hand apparel', 
        'Shop Sustainable Thrift Catalogs - FlexMarket', 
        'Explore vintage and branded second-hand apparel from trusted sellers.'
    ],
    [
        'login', 'Login Page', '/login', 
        'Login to Your Account - FlexMarket', 
        'Sign in to FlexMarket to manage your listings, submit offers, or purchase quality second-hand apparel.', 
        'login, sign in, flex market account', 
        'Sign In - FlexMarket', 
        'Sign in to access your dashboard, listings, and offers.'
    ],
    [
        'register', 'Register Page', '/register', 
        'Create an Account - FlexMarket', 
        'Join FlexMarket today! Start buying and selling quality pre-owned fashion products with ease.', 
        'register, create account, sell clothing', 
        'Join FlexMarket Today', 
        'Create a buyer or seller account to buy/sell quality pre-owned fashion.'
    ],
    [
        'cart', 'Shopping Cart', '/cart', 
        'Your Shopping Cart - FlexMarket', 
        'View the items in your shopping cart, update quantities, and proceed to secure checkout on FlexMarket.', 
        'shopping cart, checkout, thrift shop', 
        'My Cart - FlexMarket', 
        'Review your selected second-hand fashion items and check out securely.'
    ],
    [
        'wishlist', 'My Wishlist', '/wishlist', 
        'Your Wishlist - FlexMarket', 
        'View and manage your saved pre-owned items and vintage listings on FlexMarket.', 
        'wishlist, saved clothes, favorite listings', 
        'My Wishlist - FlexMarket', 
        'Keep track of second-hand listings you love.'
    ],
    [
        'verify_otp', 'Verify OTP', '/verify-otp', 
        'Verify One-Time Password - FlexMarket', 
        'Verify your login/registration securely with OTP code sent to your phone or email.', 
        'otp verification, secure login', 
        'Verify OTP - FlexMarket', 
        'Complete your verification step securely.'
    ],
    [
        'buyer_dashboard', 'Buyer Dashboard', '/buyer', 
        'Buyer Dashboard - FlexMarket', 
        'Manage your profile, active offers, purchased items, referrals, and subscriptions on FlexMarket.', 
        'buyer portal, purchase history, user settings', 
        'Buyer Portal - FlexMarket', 
        'Manage your purchases and profile settings on FlexMarket.'
    ],
    [
        'seller_dashboard', 'Seller Dashboard', '/seller', 
        'Seller Dashboard - FlexMarket', 
        'Manage your storefront, upload new products, view product analytics, track offers, and adjust subscription plans.', 
        'seller portal, shop manager, product uploads', 
        'Seller Storefront - FlexMarket', 
        'Manage your listings and track sales analytics on FlexMarket.'
    ]
];

$stmt = $conn->prepare("
    INSERT INTO seo_settings (page_key, page_name, route, title, meta_description, meta_keywords, og_title, og_description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
        page_name = VALUES(page_name),
        route = VALUES(route)
");

if (!$stmt) {
    die("Statement preparation failed: " . $conn->error . "\n");
}

foreach ($seeds as $row) {
    $stmt->bind_param("ssssssss", $row[0], $row[1], $row[2], $row[3], $row[4], $row[5], $row[6], $row[7]);
    if ($stmt->execute()) {
        echo "Seeded page key: {$row[0]}\n";
    } else {
        echo "Error seeding key {$row[0]}: " . $stmt->error . "\n";
    }
}

$stmt->close();
$conn->close();
echo "Database setup finished successfully!\n";
