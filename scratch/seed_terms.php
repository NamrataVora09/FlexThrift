<?php
$mysqli = new mysqli("127.0.0.1", "root", "", "flex");
if ($mysqli->connect_error) {
    die("Connection failed: " . $mysqli->connect_error);
}

$key = 'registration_terms';
$value = "Welcome to Flex Market!

By creating an account on our platform, you agree to comply with and be bound by the following terms and conditions:

1. ACCOUNT REGISTRATION & SECURITY
- You must provide accurate, complete, and updated information during the registration process.
- You are solely responsible for safeguarding your password and account credentials.
- Any activity performed under your account is your sole responsibility.

2. USER ELIGIBILITY & RESPONSIBILITIES
- You agree to act in good faith and follow the platform's guidelines.
- Sellers must ensure all listing details, product quality descriptions, and original brand claims are honest and accurate.
- Buyers agree to honor all submitted offers once accepted by the seller.

3. TRANSACTION POLICIES & FEES
- All accepted offer prices are subject to the applicable platform commissions and delivery fees.
- Subscriptions, service fees, and platform charges are billed in accordance with the pricing rules set by the SuperAdmin.

4. CONTENT & PRIVACY
- We respect your privacy and protect your registration data in compliance with standard security protocols.
- We reserve the right to review, moderate, and remove any listing or account that violates these terms.

If you have any questions or require support, please contact our support team at support@flexmarket.com.";

// Check if registration_terms already exists
$stmt = $mysqli->prepare("SELECT COUNT(*) FROM system_settings WHERE setting_key = ?");
$stmt->bind_param("s", $key);
$stmt->execute();
$res = $stmt->get_result();
$count = $res->fetch_row()[0];
$stmt->close();

if ($count === 0) {
    $stmt = $mysqli->prepare("INSERT INTO system_settings (setting_key, setting_value, updated_at) VALUES (?, ?, NOW())");
    $stmt->bind_param("ss", $key, $value);
    $stmt->execute();
    echo "Default Terms & Conditions successfully seeded into system_settings!\n";
    $stmt->close();
} else {
    echo "Terms & Conditions key already exists in system_settings. Skipping seeding to prevent overwriting.\n";
}

$mysqli->close();
