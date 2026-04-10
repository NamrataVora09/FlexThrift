<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class CorsFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        $allowed = [
            // Local development
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
        ];

        // Allow Vercel production & preview deployments
        if (preg_match('/^https:\/\/[\w-]+\.vercel\.app$/', $origin)) {
            $allowed[] = $origin;
        }

        // Allow Railway domains
        if (preg_match('/^https:\/\/[\w-]+\.railway\.app$/', $origin)) {
            $allowed[] = $origin;
        }

        // Allow custom frontend URL from environment variable (e.g., https://flexmarket.in)
        $frontendUrl = getenv('FRONTEND_URL');
        if ($frontendUrl) {
            $allowed[] = rtrim($frontendUrl, '/');
        }

        if (in_array($origin, $allowed, true)) {
            header("Access-Control-Allow-Origin: $origin");
        } else {
            // Default fallback for unknown origins (restrict in production)
            $default = getenv('FRONTEND_URL') ?: 'http://localhost:3000';
            header("Access-Control-Allow-Origin: $default");
        }

        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Allow-Credentials: true');

        if (strtolower($request->getMethod()) === 'options') {
            return service('response')->setStatusCode(200);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }
}
