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
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
            'https://flex-three-zeta.vercel.app',
        ];

        // Allow Vercel & Render subdomains
        if ($origin && (str_contains($origin, '.vercel.app') || str_contains($origin, '.onrender.com'))) {
            $allowed[] = $origin;
        }

        $isAllowed = in_array($origin, $allowed, true);
        $finalOrigin = $isAllowed ? $origin : 'https://flex-three-zeta.vercel.app';
        
        header("Access-Control-Allow-Origin: $finalOrigin");

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
