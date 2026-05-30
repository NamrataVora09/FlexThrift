<?php

namespace App\Controllers\Api;

use App\Libraries\JWT;
use App\Models\UserModel;
use CodeIgniter\RESTful\ResourceController;

class AuthApi extends ResourceController
{
    protected $format = 'json';
    private UserModel $userModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
    }

    /**
     * POST /api/v1/auth/login
     * Password-based login
     */
    public function login()
    {
        $email = $this->request->getJsonVar('email');
        $password = $this->request->getJsonVar('password');

        if (!$email || !$password) {
            return $this->respond([
                'success' => false,
                'message' => 'Email and password are required',
            ], 400);
        }

        $user = $this->userModel->getUserByEmail($email);

        if (!$user) {
            return $this->respond([
                'success' => false,
                'message' => 'Invalid email or password',
            ], 401);
        }

        if (!empty($user['is_blocked'])) {
            return $this->respond([
                'success' => false,
                'message' => 'Your account has been blocked by admin',
            ], 403);
        }

        if (!password_verify($password, $user['password'])) {
            log_message('warning', 'Failed login attempt for: ' . $email);
            return $this->respond([
                'success' => false,
                'message' => 'Invalid email or password',
            ], 401);
        }

        $role = $user['role'] ?? (($user['user_type'] === 'both') ? 'buyer' : $user['user_type']);

        log_message('info', 'API Login successful for: ' . $email . ', Role: ' . $role);

        $token = JWT::encode([
            'user_id' => $user['id'],
            'email'   => $user['email'],
            'role'    => $role,
            'blocked_from_approvals' => $user['blocked_from_approvals'] ?? 0,
        ]);

        return $this->respond([
            'success' => true,
            'message' => 'Login successful',
            'data'    => [
                'user'  => $this->sanitizeUser($user, $role),
                'token' => $token,
            ],
        ]);
    }

    /**
     * POST /api/v1/auth/send-otp
     */
    public function sendOtp()
    {
        $email = $this->request->getJsonVar('email');

        if (!$email) {
            return $this->respond(['success' => false, 'message' => 'Email is required'], 400);
        }

        $user = $this->userModel->getUserByEmail($email);

        if (!$user) {
            return $this->respond(['success' => false, 'message' => 'No account found with this email'], 404);
        }

        if (!empty($user['is_blocked'])) {
            return $this->respond(['success' => false, 'message' => 'Your account has been blocked'], 403);
        }

        $otp = $this->userModel->generateOTP($user['id']);

        if ($otp) {
            $this->sendOTPEmail($email, $user['name'], $otp);
        }

        return $this->respond([
            'success' => true,
            'message' => 'OTP sent to your email',
        ]);
    }

    /**
     * POST /api/v1/auth/verify-otp
     */
    public function verifyOtp()
    {
        $email = $this->request->getJsonVar('email');
        $otp   = $this->request->getJsonVar('otp');

        if (!$email || !$otp) {
            return $this->respond(['success' => false, 'message' => 'Email and OTP are required'], 400);
        }

        $user = $this->userModel->verifyOTP($email, $otp);

        if (!$user) {
            return $this->respond(['success' => false, 'message' => 'Invalid or expired OTP'], 401);
        }

        if (!empty($user['is_blocked'])) {
            return $this->respond(['success' => false, 'message' => 'Your account has been blocked'], 403);
        }

        $role = $user['role'] ?? (($user['user_type'] === 'both') ? 'buyer' : $user['user_type']);

        $token = JWT::encode([
            'user_id' => $user['id'],
            'email'   => $user['email'],
            'role'    => $role,
        ]);

        return $this->respond([
            'success' => true,
            'message' => 'OTP verified successfully',
            'data'    => [
                'user'  => $this->sanitizeUser($user, $role),
                'token' => $token,
            ],
        ]);
    }

    /**
     * POST /api/v1/auth/forgot-password
     */
    public function forgotPassword()
    {
        $email = $this->request->getJsonVar('email');

        if (!$email) {
            return $this->respond(['success' => false, 'message' => 'Email is required'], 400);
        }

        $user = $this->userModel->getUserByEmail($email);

        if (!$user) {
            return $this->respond(['success' => false, 'message' => 'No account found with this email'], 404);
        }

        if (!empty($user['is_blocked'])) {
            return $this->respond(['success' => false, 'message' => 'Your account has been blocked'], 403);
        }

        $otp = $this->userModel->generateOTP($user['id']);

        if ($otp) {
            $this->sendPasswordResetEmail($email, $user['name'], $otp);
        }

        return $this->respond([
            'success' => true,
            'message' => 'Password reset OTP sent to your email',
        ]);
    }

    /**
     * POST /api/v1/auth/reset-password
     */
    public function resetPassword()
    {
        $email    = $this->request->getJsonVar('email');
        $otp      = $this->request->getJsonVar('otp');
        $password = $this->request->getJsonVar('password');

        if (!$email || !$otp || !$password) {
            return $this->respond([
                'success' => false,
                'message' => 'Email, OTP, and new password are required'
            ], 400);
        }

        if (strlen($password) < 6) {
            return $this->respond([
                'success' => false,
                'message' => 'Password must be at least 6 characters long'
            ], 400);
        }

        $user = $this->userModel->getUserByEmail($email);

        if (!$user) {
            return $this->respond(['success' => false, 'message' => 'No account found with this email'], 404);
        }

        if (!empty($user['is_blocked'])) {
            return $this->respond(['success' => false, 'message' => 'Your account has been blocked'], 403);
        }

        // Verify OTP matches and is not expired
        if ($user['otp'] == $otp && strtotime($user['otp_expires_at']) > time()) {
            // Update password, clear OTP, and mark user as verified
            $updateSuccess = $this->userModel->update($user['id'], [
                'password'       => password_hash($password, PASSWORD_DEFAULT),
                'otp'            => null,
                'otp_expires_at' => null,
                'is_verified'    => 1
            ]);

            if ($updateSuccess) {
                return $this->respond([
                    'success' => true,
                    'message' => 'Password reset successfully. You can now login with your new password.',
                ]);
            }

            return $this->respond(['success' => false, 'message' => 'Failed to update password. Please try again.'], 500);
        }

        return $this->respond(['success' => false, 'message' => 'Invalid or expired OTP'], 401);
    }

    /**
     * Send password reset email
     */
    private function sendPasswordResetEmail(string $to, string $name, string $otp): void
    {
        $db = \Config\Database::connect();
        $rows = $db->table('system_settings')->get()->getResultArray();
        $cfg = [];
        foreach ($rows as $s) {
            $cfg[$s['setting_key']] = $s['setting_value'];
        }

        $emailConfig = [
            'protocol'    => 'smtp',
            'SMTPHost'    => !empty($cfg['smtp_host']) ? $cfg['smtp_host'] : 'smtp.gmail.com',
            'SMTPPort'    => !empty($cfg['smtp_port']) ? (int)$cfg['smtp_port'] : 587,
            'SMTPUser'    => $cfg['smtp_username'] ?? '',
            'SMTPPass'    => $cfg['smtp_password'] ?? '',
            'SMTPCrypto'  => !empty($cfg['smtp_encryption']) ? $cfg['smtp_encryption'] : 'tls',
            'mailType'    => 'html',
            'charset'     => 'utf-8',
            'newline'     => "\r\n",
            'CRLF'        => "\r\n",
            'SMTPTimeout' => 30,
        ];

        $email = \Config\Services::email();
        $email->initialize($emailConfig);
        $email->setFrom($cfg['smtp_from_email'] ?? 'info@flexmarket.com', $cfg['smtp_from_name'] ?? 'Flex Market');
        $email->setTo($to);
        $email->setSubject('Reset Your Flex Market Password');
        $email->setMessage("
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;'>
                <h2 style='color: #000; font-weight: 600;'>Hello {$name},</h2>
                <p style='font-size: 16px; color: #333;'>You have requested to reset your password on Flex Market. Please use the verification code below to complete the process:</p>
                <div style='background: #fffbeb; border: 1px solid #fef3c7; padding: 15px 25px; border-radius: 12px; display: inline-block; margin: 20px 0;'>
                    <strong style='font-size: 28px; color: #ffc63a; letter-spacing: 2px;'>{$otp}</strong>
                </div>
                <p style='font-size: 14px; color: #666;'>This OTP is valid for 10 minutes. If you did not request this password reset, please ignore this email or contact support.</p>
                <hr style='border: 0; border-top: 1px solid #eee; margin: 30px 0;'>
                <p style='font-size: 12px; color: #999; text-align: center;'>— Flex Market Team</p>
            </div>
        ");

        if (!$email->send(false)) {
            log_message('error', 'Password reset email failed to send to: ' . $to);
            log_message('error', 'Email Debugger: ' . $email->printDebugger(['headers', 'subject', 'body']));
        }
    }

    /**
     * POST /api/v1/auth/register
     */
    public function register()
    {
        $data = $this->request->getJSON(true);

        $rules = [
            'name'      => 'required|min_length[2]|max_length[100]',
            'email'     => 'required|valid_email',
            'mobile'    => 'required|min_length[10]|max_length[15]',
            'password'  => 'required|min_length[6]',
            'address'   => 'required',
            'pin_code'  => 'required',
            'state'     => 'required',
            'city'      => 'required',
            'user_type' => 'required|in_list[seller,buyer,both]',
        ];

        if (!$this->validateData($data, $rules)) {
            return $this->respond([
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $this->validator->getErrors(),
            ], 422);
        }

        // Zone restriction check — state-based
        helper(['geolocation', 'utilityClass']);
        $enableZones = getSystemSetting('enable_zone_restriction', '0');

        $ip = getUserIP();
        $loc = getLocationFromIP($ip);
        
        $clientLat = $data['user_latitude'] ?? null;
        $clientLng = $data['user_longitude'] ?? null;
        $clientState = $data['state'] ?? $data['user_state'] ?? null;

        $zoneMatch = false;
        $detectedZone = null;
        $detectedState = $clientState ?: ($loc['state'] ?? null);

        // 3. Last Fallback: Check PIN code (Especially for Localhost/Blocked GPS)
        if (empty($detectedState) && !empty($data['pin_code'])) {
            $detectedState = getStateFromPinCode($data['pin_code']);
        }

        if ($enableZones === '1') {
            // 1. Priority: Check GPS coordinates against Polygon zones (Highest accuracy)
            if (!empty($clientLat) && !empty($clientLng)) {
                $detectedZone = isLocationAllowed((float)$clientLat, (float)$clientLng);
                if ($detectedZone) {
                    $zoneMatch = true;
                }
            }

            // 2. Fallback: Check state name (from IP or client)
            if (!$zoneMatch && !empty($detectedState)) {
                $detectedZone = isStateAllowed($detectedState);
                if ($detectedZone) {
                    $zoneMatch = true;
                }
            }

            if (!$zoneMatch) {
                // Log the blocked attempt
                logRegistrationAttempt([
                    'name'       => $data['name'],
                    'email'      => $data['email'],
                    'mobile'     => $data['mobile'],
                    'address'    => $data['address'],
                    'pin_code'   => $data['pin_code'],
                    'user_type'  => $data['user_type'],
                    'ip'         => $ip,
                    'country'    => $loc['country'] ?? null,
                    'state'      => $clientState,
                    'city'       => $loc['city'] ?? null,
                    'latitude'   => $clientLat ?: ($loc['latitude'] ?? null),
                    'longitude'  => $clientLng ?: ($loc['longitude'] ?? null),
                    'is_allowed' => 0,
                ]);

                return $this->respond([
                    'success' => false,
                    'message' => 'Sorry, our services are not yet available in ' . ($detectedState ? "\"{$detectedState}\"" : 'your area') . '. Registration is restricted to authorised zones only.',
                    'state_detected' => $detectedState,
                    'is_outside_zone' => true
                ], 403);
            }
        }

        // Add detected location to user data for storage if missing
        $data['state'] = $data['state'] ?? $detectedState;
        $data['city'] = $data['city'] ?? ($loc['city'] ?? null);
        $data['latitude'] = $clientLat ?: ($loc['latitude'] ?? null);
        $data['longitude'] = $clientLng ?: ($loc['longitude'] ?? null);

        // Log successful registration attempt
        logRegistrationAttempt([
            'name'       => $data['name'],
            'email'      => $data['email'],
            'mobile'     => $data['mobile'],
            'address'    => $data['address'],
            'pin_code'   => $data['pin_code'],
            'user_type'  => $data['user_type'],
            'ip'         => $ip,
            'country'    => $loc['country'] ?? null,
            'state'      => $data['state'],
            'city'       => $data['city'],
            'latitude'   => $data['latitude'],
            'longitude'  => $data['longitude'],
            'is_allowed' => 1,
            'zone_id'    => $detectedZone['id'] ?? null,
        ]);
        // Check existing email
        $existingUser = $this->userModel->getUserByEmail($data['email']);
        if ($existingUser) {
            $requestedType = $data['user_type'] ?? 'buyer';
            $currentType   = $existingUser['user_type'];

            // Logic: Give error only if user already has this role or is 'both'
            $alreadyHasRole = false;
            if ($currentType === 'both') {
                $alreadyHasRole = true;
            } elseif ($currentType === $requestedType) {
                $alreadyHasRole = true;
            } elseif ($requestedType === 'both' && $currentType !== 'both') {
                $alreadyHasRole = false; // upgrading from one role to both
            }

            if ($alreadyHasRole) {
                return $this->respond([
                    'success' => false,
                    'message' => 'This email is already registered with the selected role.',
                ], 409);
            }

            // Upgrade existing user to 'both'
            $this->userModel->update($existingUser['id'], [
                'user_type'  => 'both',
                'role'       => ($requestedType === 'both') ? 'buyer' : $requestedType,
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            // Process referral for existing user if they haven't been referred yet
            if (empty($existingUser['referred_by']) && !empty($data['referred_by'])) {
                $this->applyReferral($existingUser['id'], $data['referred_by']);
            }

            $otp = $this->userModel->generateOTP($existingUser['id']);
            if ($otp) $this->sendOTPEmail($existingUser['email'], $existingUser['name'], $otp);

            return $this->respond([
                'success' => true,
                'message' => 'Account upgraded successfully. OTP sent to your email.',
            ], 200);
        }

        // Check existing mobile
        $existingMobile = $this->userModel->where('mobile', $data['mobile'])->first();
        if ($existingMobile) {
            return $this->respond([
                'success' => false,
                'message' => 'Mobile number already registered',
            ], 409);
        }

        $referralCode = strtoupper(substr(md5(uniqid()), 0, 8));

        $userData = [
            'name'             => $data['name'],
            'email'            => $data['email'],
            'mobile'           => $data['mobile'],
            'password'         => password_hash($data['password'], PASSWORD_DEFAULT),
            'address'          => $data['address'],
            'pin_code'         => $data['pin_code'],
            'state'            => $data['state'],
            'city'             => $data['city'],
            'user_type'        => $data['user_type'],
            'role'             => ($data['user_type'] === 'both') ? 'buyer' : $data['user_type'],
            'referral_code'    => $referralCode,
            'reliability_score' => 0,
            'is_verified'      => 0,
        ];

        $userId = $this->userModel->insert($userData);

        if (!$userId) {
            return $this->respond(['success' => false, 'message' => 'Registration failed'], 500);
        }

        // Process referral code
        if (!empty($data['referred_by'])) {
            $this->applyReferral($userId, $data['referred_by']);
        }

        // Generate and send OTP
        $otp = $this->userModel->generateOTP($userId);
        if ($otp) {
            $this->sendOTPEmail($data['email'], $data['name'], $otp);
        }

        return $this->respond([
            'success' => true,
            'message' => 'Registration successful. OTP sent to your email.',
        ], 201);
    }

    /**
     * POST /api/v1/auth/switch-role/{role}
     */
    public function switchRole(string $newRole)
    {
        $jwtUser = $this->request->jwt_user ?? null;

        if (!$jwtUser) {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        if (!in_array($newRole, ['seller', 'buyer'])) {
            return $this->respond(['success' => false, 'message' => 'Invalid role'], 400);
        }

        $user = $this->userModel->find($jwtUser['user_id']);

        if (!$user || $user['user_type'] !== 'both') {
            return $this->respond(['success' => false, 'message' => 'Role switching not allowed'], 403);
        }

        $this->userModel->update($user['id'], ['role' => $newRole]);

        $token = JWT::encode([
            'user_id' => $user['id'],
            'email'   => $user['email'],
            'role'    => $newRole,
        ]);

        $user['role'] = $newRole;

        return $this->respond([
            'success' => true,
            'message' => "Switched to $newRole",
            'data'    => [
                'user'  => $this->sanitizeUser($user, $newRole),
                'token' => $token,
            ],
        ]);
    }

    /**
     * GET /api/v1/auth/referral-stats
     */
    public function referralStats()
    {
        $jwtUser = $this->request->jwt_user ?? null;
        if (!$jwtUser) {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $user = $this->userModel->find($jwtUser['user_id']);
        if (!$user) {
            return $this->respond(['success' => false, 'message' => 'User not found'], 404);
        }

        // Generate referral code if missing (for legacy users)
        if (empty($user['referral_code'])) {
            $user['referral_code'] = strtoupper(substr(md5(uniqid((string)$user['id'], true)), 0, 8));
            $this->userModel->update($user['id'], ['referral_code' => $user['referral_code']]);
        }

        $db = \Config\Database::connect();

        // Fetch referral settings
        $rows = $db->table('system_settings')
            ->whereIn('setting_key', ['referral_enabled', 'referral_referrer_reward', 'referral_reward_amount', 'referral_expiry_days', 'referral_how_it_works', 'referral_terms'])
            ->get()->getResultArray();
        $cfg = [];
        foreach ($rows as $r) {
            $cfg[$r['setting_key']] = $r['setting_value'];
        }

        $rewardAmount = (float) (
            (isset($cfg['referral_referrer_reward']) && $cfg['referral_referrer_reward'] !== '') 
            ? $cfg['referral_referrer_reward'] 
            : (isset($cfg['referral_reward_amount']) && $cfg['referral_reward_amount'] !== '' ? $cfg['referral_reward_amount'] : 50)
        );
        $referralEnabled = ($cfg['referral_enabled'] ?? '1') === '1';
        $howItWorks = json_decode($cfg['referral_how_it_works'] ?? '[]', true);
        $terms = json_decode($cfg['referral_terms'] ?? '[]', true);

        // Get users referred by this user's code
        $referredUsers = [];
        if (!empty($user['referral_code'])) {
            $referred = $db->table('users')
                ->select('id, name, created_at, has_used_referral')
                ->where('referred_by', $user['referral_code'])
                ->orderBy('created_at', 'DESC')
                ->get()->getResultArray();

            foreach ($referred as $r) {
                $nameParts = explode(' ', trim($r['name']));
                $initials = strtoupper(substr($nameParts[0], 0, 1) . (isset($nameParts[1]) ? substr($nameParts[1], 0, 1) : ''));
                $referredUsers[] = [
                    'initials'        => $initials,
                    'name'            => substr($r['name'], 0, 3) . str_repeat('*', max(0, strlen($r['name']) - 3)),
                    'joined_at'       => $r['created_at'],
                    'reward_used'     => (int) $r['has_used_referral'],
                    'reward_earned'   => (int) $r['has_used_referral'] ? $rewardAmount : 0,
                ];
            }
        }

        // Total ever earned = current balance remaining + amount already spent as referral discounts
        $discountUsed = (float) ($db->table('user_subscriptions')
            ->selectSum('referral_discount_applied')
            ->where('user_id', $user['id'])
            ->get()->getRowArray()['referral_discount_applied'] ?? 0);
        $totalEarned = (float) ($user['referral_balance'] ?? 0) + $discountUsed;

        return $this->respond([
            'success' => true,
            'data'    => [
                'referral_code'     => $user['referral_code'] ?? '',
                'referral_balance'  => (float) ($user['referral_balance'] ?? 0),
                'has_used_referral' => (int) ($user['has_used_referral'] ?? 0),
                'referral_expires_at' => $user['referral_expires_at'] ?? null,
                'referred_by'       => $user['referred_by'] ?? null,
                'total_referrals'   => count($referredUsers),
                'total_earned'      => $totalEarned,
                'reward_amount'     => $rewardAmount,
                'referral_enabled'  => $referralEnabled,
                'how_it_works'      => $howItWorks,
                'terms'             => $terms,
                'referred_users'    => $referredUsers,
            ],
        ]);
    }

    /**
     * GET /api/v1/auth/me
     */
    public function me()
    {
        $jwtUser = $this->request->jwt_user ?? null;

        if (!$jwtUser) {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $user = $this->userModel->find($jwtUser['user_id']);

        if (!$user) {
            return $this->respond(['success' => false, 'message' => 'User not found'], 404);
        }

        return $this->respond([
            'success' => true,
            'data'    => $this->sanitizeUser($user, $jwtUser['role']),
        ]);
    }

    // ── Helpers ──────────────────────────────────────

    public function googleLogin()
    {
        $data = $this->request->getJSON(true);
        $googleToken = $data['credential'] ?? '';
        if (!$googleToken) {
            return $this->respond(['success' => false, 'message' => 'Google credential is required'], 400);
        }

        // Decode Google JWT (id_token) without verification for now
        $parts = explode('.', $googleToken);
        if (count($parts) !== 3) {
            return $this->respond(['success' => false, 'message' => 'Invalid Google token'], 400);
        }
        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
        if (!$payload || empty($payload['email'])) {
            return $this->respond(['success' => false, 'message' => 'Failed to parse Google token'], 400);
        }

        $email = $payload['email'];
        $name = $payload['name'] ?? $payload['given_name'] ?? 'User';

        $user = $this->userModel->getUserByEmail($email);

        if ($user) {
            // Existing user — login
            if (!empty($user['is_blocked'])) {
                return $this->respond(['success' => false, 'message' => 'Your account has been blocked'], 403);
            }
            $role = $user['role'] ?? (($user['user_type'] === 'both') ? 'buyer' : $user['user_type']);
        } else {
            // New user — auto-register as buyer
            $db = \Config\Database::connect();
            $referralCode = strtoupper(substr(md5(uniqid()), 0, 8));
            $db->table('users')->insert([
                'name' => $name,
                'email' => $email,
                'password' => password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT),
                'user_type' => 'buyer',
                'role' => 'buyer',
                'referral_code' => $referralCode,
                'is_verified' => 1,
                'reliability_score' => 0,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
            $user = $this->userModel->getUserByEmail($email);
            $role = 'buyer';
        }

        $token = JWT::encode([
            'user_id' => $user['id'],
            'email'   => $user['email'],
            'role'    => $role,
            'blocked_from_approvals' => $user['blocked_from_approvals'] ?? 0,
        ]);

        return $this->respond([
            'success' => true,
            'message' => 'Login successful',
            'data'    => [
                'user'  => $this->sanitizeUser($user, $role),
                'token' => $token,
            ],
        ]);
    }

    private function applyReferral($userId, $referredBy)
    {
        $referredBy = strtoupper(trim($referredBy));
        if (!$referredBy) return;

        $db = \Config\Database::connect();
        $referrer = $db->table('users')->where('referral_code', $referredBy)->get()->getRowArray();

        if ($referrer && (int)$referrer['id'] !== (int)$userId) {
            $settingsRows = $db->table('system_settings')
                ->whereIn('setting_key', ['referral_enabled', 'referral_receiver_reward', 'referral_expiry_days'])
                ->get()->getResultArray();
            $cfg = [];
            foreach ($settingsRows as $s) $cfg[$s['setting_key']] = $s['setting_value'];

            if (($cfg['referral_enabled'] ?? '1') === '1') {
                $receiverReward = (float) ((isset($cfg['referral_receiver_reward']) && $cfg['referral_receiver_reward'] !== '') ? $cfg['referral_receiver_reward'] : 50);
                $expiryDays     = (int)   ((isset($cfg['referral_expiry_days']) && $cfg['referral_expiry_days'] !== '') ? $cfg['referral_expiry_days'] : 30);
                $expiresAt      = date('Y-m-d H:i:s', strtotime("+{$expiryDays} days"));

                // Credit the receiver immediately
                $db->table('users')->where('id', $userId)->update([
                    'referred_by'         => $referredBy,
                    'referral_balance'    => $receiverReward,
                    'referral_expires_at' => $expiresAt,
                    'has_used_referral'   => 0, 
                    'updated_at'          => date('Y-m-d H:i:s'),
                ]);
            }
        }
    }

    private function sanitizeUser(array $user, string $role): array
    {
        return [
            'id'                => (int) $user['id'],
            'name'              => $user['name'],
            'email'             => $user['email'],
            'mobile'            => $user['mobile'] ?? '',
            'alternate_mobile'  => $user['alternate_mobile'] ?? '',
            'gender'            => $user['gender'] ?? '',
            'address'           => $user['address'] ?? '',
            'pin_code'          => $user['pin_code'] ?? '',
            'city'              => $user['city'] ?? '',
            'state'             => $user['state'] ?? '',
            'profile_image'     => $user['profile_image'] ?? '',
            'user_type'         => $user['user_type'],
            'role'              => $role,
            'reliability_score'          => (int) ($user['reliability_score'] ?? 100),
            'seller_reliability_score'   => (int) ($user['seller_reliability_score'] ?? 0),
            'buyer_rating_avg'           => (float) ($user['buyer_rating_avg'] ?? 0),
            'buyer_rating_count'         => (int) ($user['buyer_rating_count'] ?? 0),
            'seller_rating_avg'          => (float) ($user['seller_rating_avg'] ?? 0),
            'seller_rating_count'        => (int) ($user['seller_rating_count'] ?? 0),
            'products_uploaded_count'    => (int) ($user['products_uploaded_count'] ?? 0),
            'referral_code'              => $user['referral_code'] ?? '',
            'is_verified'                => (int) ($user['is_verified'] ?? 0),
            'bgv_cleared'                => (int) ($user['bgv_cleared'] ?? 0),
            'blocked_buyer'              => (int) ($user['blocked_buyer'] ?? 0),
            'blocked_seller'             => (int) ($user['blocked_seller'] ?? 0),
            'created_at'                 => $user['created_at'] ?? '',
        ];
    }

    private function sendOTPEmail(string $to, string $name, string $otp): void
    {
        $db = \Config\Database::connect();
        $rows = $db->table('system_settings')->get()->getResultArray();
        $cfg = [];
        foreach ($rows as $s) {
            $cfg[$s['setting_key']] = $s['setting_value'];
        }

        $emailConfig = [
            'protocol'    => 'smtp',
            'SMTPHost'    => !empty($cfg['smtp_host']) ? $cfg['smtp_host'] : 'smtp.gmail.com',
            'SMTPPort'    => !empty($cfg['smtp_port']) ? (int)$cfg['smtp_port'] : 587,
            'SMTPUser'    => $cfg['smtp_username'] ?? '',
            'SMTPPass'    => $cfg['smtp_password'] ?? '',
            'SMTPCrypto'  => !empty($cfg['smtp_encryption']) ? $cfg['smtp_encryption'] : 'tls',
            'mailType'    => 'html',
            'charset'     => 'utf-8',
            'newline'     => "\r\n",
            'CRLF'        => "\r\n",
            'SMTPTimeout' => 30,
        ];

        $email = \Config\Services::email();
        $email->initialize($emailConfig);
        $email->setFrom($cfg['smtp_from_email'] ?? 'info@flexmarket.com', $cfg['smtp_from_name'] ?? 'Flex Market');
        $email->setTo($to);
        $email->setSubject('Your Flex Market OTP');
        $email->setMessage("
            <h2>Hello {$name},</h2>
            <p>Your OTP is: <strong style='font-size:24px;color:#ffc63a;'>{$otp}</strong></p>
            <p>This OTP expires in 10 minutes.</p>
            <br><p>— Flex Market</p>
        ");

        if (!$email->send(false)) {
            log_message('error', 'Email failed to send to: ' . $to);
            log_message('error', 'Email Debugger: ' . $email->printDebugger(['headers', 'subject', 'body']));
        }
    }
}
