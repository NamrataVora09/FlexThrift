<?php

namespace App\Filters;

use App\Libraries\JWT;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class JwtFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $authHeader = $request->getHeaderLine('Authorization');

        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            log_message('error', 'JwtFilter: No valid Bearer token provided');
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['success' => false, 'message' => 'No token provided']);
        }

        $token = substr($authHeader, 7);
        $payload = JWT::decode($token);

        if (!$payload) {
            log_message('error', 'JwtFilter: Invalid or expired token');
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['success' => false, 'message' => 'Invalid or expired token']);
        }

        // Store user data in request for controllers
        $request->jwt_user = $payload;

        // Verify if user is blocked in DB
        $db = \Config\Database::connect();
        $user = $db->table('users')->where('id', $payload['user_id'])->select('is_blocked')->get()->getRowArray();
        if ($user && (int)$user['is_blocked'] === 1) {
            return service('response')
                ->setStatusCode(403)
                ->setJSON(['success' => false, 'message' => 'Your account has been blocked']);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }
}
