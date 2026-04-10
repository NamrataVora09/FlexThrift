<?php

namespace App\Filters;

use App\Libraries\JWT;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class AuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $session = session();
        $isLoggedIn = $session->get('logged_in') || $session->get('isLoggedIn');

        // If session auth fails, try JWT auth
        if (!$isLoggedIn) {
            $authHeader = $request->getHeaderLine('Authorization');

            if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
                $token = substr($authHeader, 7);
                $payload = JWT::decode($token);

                if ($payload) {
                    // Store user data in request for controllers
                    $request->jwt_user = $payload;
                    return; // JWT auth successful
                }
            }

            // Both session and JWT auth failed
            // Check if it's an AJAX/fetch request
            $isAjax = $request->getHeaderLine('X-Requested-With') === 'XMLHttpRequest' ||
                strpos($request->getHeaderLine('accept'), 'application/json') !== false;

            if ($isAjax) {
                return service('response')
                    ->setJSON(['success' => false, 'logged_in' => false, 'message' => 'Session expired. Please login again.'])
                    ->setStatusCode(401);
            }
            return redirect()->to('/login')->with('error', 'Please login first');
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Do nothing
    }
}
