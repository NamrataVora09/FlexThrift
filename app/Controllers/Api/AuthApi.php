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
            'user_type' => 'required|in_list[seller,buyer,both]',
        ];

        if (!$this->validateData($data, $rules)) {
            return $this->respond([
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $this->validator->getErrors(),
            ], 422);
        }

        // Zone restriction check
        helper(['geolocation', 'utilityClass']);
        $enableZones = getSystemSetting('enable_zone_restriction', '0');
        
        if ($enableZones === '1') {
            $lat = $data['user_latitude'] ?? null;
            $lng = $data['user_longitude'] ?? null;
            
            // If coordinates not provided, try to get from IP
            if (empty($lat) || empty($lng)) {
                $loc = getLocationFromIP(getUserIP());
                if ($loc) {
                    $lat = $loc['latitude'];
                    $lng = $loc['longitude'];
                }
            }

            $zone = isLocationAllowed($lat, $lng);
            if (!$zone) {
                // Log the attempt
                logRegistrationAttempt([
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'mobile' => $data['mobile'],
                    'address' => $data['address'],
                    'pin_code' => $data['pin_code'],
                    'user_type' => $data['user_type'],
                    'ip' => getUserIP(),
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'is_allowed' => 0
                ]);

                return $this->respond([
                    'success' => false,
                    'message' => 'Sorry, our services are not available in your current location yet.',
                ], 403);
            }
        }

        // Check existing email
        if ($this->userModel->getUserByEmail($data['email'])) {
            return $this->respond([
                'success' => false,
                'message' => 'Email already registered',
            ], 409);
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
            'user_type'        => $data['user_type'],
            'role'             => ($data['user_type'] === 'both') ? 'buyer' : $data['user_type'],
            'referral_code'    => $referralCode,
            'reliability_score' => 100,
            'is_verified'      => 0,
        ];

        $userId = $this->userModel->insert($userData);

        if (!$userId) {
            return $this->respond(['success' => false, 'message' => 'Registration failed'], 500);
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
            $db->table('users')->insert([
                'name' => $name,
                'email' => $email,
                'password' => password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT),
                'user_type' => 'buyer',
                'role' => 'buyer',
                'is_verified' => 1,
                'reliability_score' => 100,
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

    private function sanitizeUser(array $user, string $role): array
    {
        return [
            'id'                => (int) $user['id'],
            'name'              => $user['name'],
            'email'             => $user['email'],
            'mobile'            => $user['mobile'] ?? '',
            'address'           => $user['address'] ?? '',
            'pin_code'          => $user['pin_code'] ?? '',
            'city'              => $user['city'] ?? '',
            'state'             => $user['state'] ?? '',
            'user_type'         => $user['user_type'],
            'role'              => $role,
            'reliability_score'  => (int) ($user['reliability_score'] ?? 100),
            'buyer_rating_avg'   => (float) ($user['buyer_rating_avg'] ?? 0),
            'buyer_rating_count' => (int) ($user['buyer_rating_count'] ?? 0),
            'referral_code'      => $user['referral_code'] ?? '',
            'is_verified'        => (int) ($user['is_verified'] ?? 0),
            'blocked_buyer'      => (int) ($user['blocked_buyer'] ?? 0),
            'blocked_seller'     => (int) ($user['blocked_seller'] ?? 0),
            'created_at'         => $user['created_at'] ?? '',
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
            'protocol'  => 'smtp',
            'SMTPHost'  => $cfg['smtp_host']       ?? 'smtp.gmail.com',
            'SMTPPort'  => (int) ($cfg['smtp_port'] ?? 587),
            'SMTPUser'  => $cfg['smtp_username']   ?? '',
            'SMTPPass'  => $cfg['smtp_password']   ?? '',
            'SMTPCrypto'=> $cfg['smtp_encryption'] ?? 'tls',
            'mailType'  => 'html',
            'charset'   => 'utf-8',
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

        $email->send(false);
    }
}
