<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class SystemLockFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        // PERFORMANCE: Cache the lock value as a static property so the DB is
        // only queried once per PHP process (per worker on PHP-FPM / Apache).
        // getSystemSetting() itself also uses a bulk in-memory cache within a request.
        static $isLockedCache = null;

        if ($isLockedCache === null) {
            $lockValue     = getSystemSetting('global_system_lock', '0');
            $isLockedCache = ($lockValue === '1' || $lockValue === 'true' || $lockValue === true);
        }

        $isLocked = $isLockedCache;

        if (!$isLocked) {
            return;
        }

        // System is locked. Allow only super_admin.
        $jwtUser = null;
        $authHeader = $request->getHeaderLine('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
            $jwtUser = \App\Libraries\JWT::decode($token);
        }
        
        // If not logged in yet, we don't know the role. 
        // We must allow login/otp routes so superadmin can log in.
        $uri = $request->getUri()->getPath();
        $allowedPublicPaths = [
            'api/v1/auth/login',
            'api/v1/auth/verify-otp',
            'api/v1/auth/send-otp',
            'api/v1/auth/forgot-password',
            'api/v1/auth/reset-password',
            'api/v1/landing-content',
            'api/auth/login',
            'api/auth/verify-otp',
            'api/auth/send-otp',
            'api/auth/forgot-password',
            'api/auth/reset-password',
            'api/landing-content'
        ];

        // Check if current path is allowed
        foreach ($allowedPublicPaths as $path) {
            if (strpos($uri, $path) !== false) {
                return;
            }
        }

        // If logged in, check role
        if ($jwtUser && in_array($jwtUser['role'], ['super_admin', 'superadmin'])) {
            return;
        }

        // Otherwise, block everything else
        return service('response')
            ->setStatusCode(403)
            ->setJSON([
                'success' => false,
                'message' => getAppMessage('system_locked_error', 'System is currently locked by administration. Only Superadmin access is permitted.'),
                'system_locked' => true
            ]);
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }
}
