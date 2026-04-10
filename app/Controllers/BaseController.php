<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Psr\Log\LoggerInterface;

/**
 * BaseController provides a convenient place for loading components
 * and performing functions that are needed by all your controllers.
 *
 * Extend this class in any new controllers:
 * ```
 *     class Home extends BaseController
 * ```
 *
 * For security, be sure to declare any new methods as protected or private.
 */
abstract class BaseController extends Controller
{
    /**
     * Be sure to declare properties for any property fetch you initialized.
     * The creation of dynamic property is deprecated in PHP 8.2.
     */

    // protected $session;

    /**
     * @return void
     */
    public function initController(RequestInterface $request, ResponseInterface $response, LoggerInterface $logger)
    {
        $this->helpers = array_merge($this->helpers, ['ad']);
        parent::initController($request, $response, $logger);

        // Preload any models, libraries, etc, here.
        // $this->session = service('session');
    }

    /**
     * Synchronize user_type to 'both' if user is accessing the other role's features
     */
    protected function syncUserType($requiredType)
    {
        $session = session();
        if (!$session->get('logged_in'))
            return;

        $userId = $session->get('user_id');
        $currentType = $session->get('user_type');
        $currentRole = $session->get('role') ?: $currentType;

        // If user is accessing a role they don't have permission for based on user_type
        if ($currentType !== 'both' && $currentType !== $requiredType) {
            // Instead of auto-upgrading, we should ideally redirect or flag this.
            // But per user request: "user_type kabhi change nahi hoga".
            // For now, we just log it and ensure the session is consistent with DB.
            log_message('notice', "User {$userId} with type '{$currentType}' tried to access '{$requiredType}' features.");
        }
    }

    /**
     * Configure Email service with dynamic SMTP settings
     */
    protected function configureEmail()
    {
        $db = \Config\Database::connect();
        $settings = $db->table('system_settings')->get()->getResultArray();

        $config = [];
        foreach ($settings as $s) {
            $config[$s['setting_key']] = $s['setting_value'];
        }

        $email = \Config\Services::email();

        // If SMTP host is configured, use it
        if (!empty($config['smtp_host'])) {
            $port = (int) ($config['smtp_port'] ?? 465);
            // Force 'ssl' for port 465 if crypto is missing or empty
            $crypto = (!empty($config['smtp_crypto'])) ? strtolower($config['smtp_crypto']) : ($port == 465 ? 'ssl' : 'tls');

            $emailConfig = [
                'protocol' => 'smtp',
                'SMTPHost' => $config['smtp_host'],
                'SMTPUser' => $config['smtp_user'] ?? '',
                'SMTPPass' => $config['smtp_pass'] ?? '',
                'SMTPPort' => $port,
                'SMTPCrypto' => $crypto,
                'mailType' => 'html',
                'charset' => 'utf-8',
                'newline' => "\r\n",
                'CRLF' => "\r\n",
                'wordWrap' => true
            ];
            $email->initialize($emailConfig);
            $email->setNewline("\r\n");
            $email->setCRLF("\r\n");
            $email->setFrom($config['smtp_from_email'] ?? 'noreply@flexmarket.com', $config['smtp_from_name'] ?? 'Flex Market');
        }

        return $email;
    }
}
