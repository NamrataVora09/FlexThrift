<?php

/**
 * The goal of this file is to allow developers a location
 * where they can overwrite core procedural functions and
 * replace them with their own. This file is loaded during
 * the bootstrap process and is called during the framework's
 * execution.
 *
 * This can be looked at as a `master helper` file that is
 * loaded early on, and may also contain additional functions
 * that you'd like to use throughout your entire application
 *
 * @see: https://codeigniter.com/user_guide/extending/common.html
 */

if (!function_exists('getAppMessage')) {
    /**
     * Retrieve a dynamic message from the database.
     * 
     * @param string $key The message key
     * @param string|null $default Default message if key not found
     * @param array $params Key => Value pairs for placeholder substitution (e.g. ['min' => 3])
     * @return string
     */
    function getAppMessage(string $key, ?string $default = null, array $params = []): string
    {
        try {
            $db = \Config\Database::connect();
            $message = $db->table('app_messages')
                ->where('message_key', $key)
                ->get()
                ->getRowArray();

            $output = $message ? $message['message_value'] : ($default ?? $key);

            if (!empty($params)) {
                $pairs = [];
                foreach ($params as $k => $v) {
                    $pairs["{{$k}}"] = $v;
                    $pairs["{$k}"] = $v;
                }
                $output = strtr($output, $pairs);
            }

            return $output;
        } catch (\Exception $e) {
            return $default ?? $key;
        }
    }
}
if (!function_exists('getSystemSetting')) {
    /**
     * Retrieve a system setting from the database.
     * 
     * @param string $key The setting key
     * @param mixed $default Default value if key not found
     * @return mixed
     */
    function getSystemSetting(string $key, $default = null)
    {
        try {
            $db = \Config\Database::connect();
            $setting = $db->table('system_settings')
                ->where('setting_key', $key)
                ->get()
                ->getRowArray();

            return $setting ? $setting['setting_value'] : $default;
        } catch (\Exception $e) {
            return $default;
        }
    }
}

if (!function_exists('getErrorMessage')) {
    /**
     * Retrieve an error message from app_messages table.
     * This is an alias for getAppMessage with better naming.
     * 
     * @param string $key The message key (e.g., 'auth_login_required')
     * @param string|null $default Default message if key not found
     * @param array $params Placeholder values for dynamic substitution
     * @return string The error message
     * 
     * @example
     * // Basic usage
     * $msg = getErrorMessage('auth_login_required', 'Please login');
     * 
     * // With placeholders
     * $msg = getErrorMessage('min_rental_duration', 'Minimum duration is X days', ['min' => 3]);
     * // Returns: "Minimum rental duration is 3 days"
     */
    function getErrorMessage(string $key, ?string $default = null, array $params = []): string
    {
        return getAppMessage($key, $default, $params);
    }
}

if (!function_exists('getErrorMessageByCategory')) {
    /**
     * Get all error messages by category
     * 
     * @param string $category The category (error, success, warning, info, general)
     * @return array Array of messages
     */
    function getErrorMessageByCategory(string $category = 'error'): array
    {
        try {
            $db = \Config\Database::connect();
            $messages = $db->table('app_messages')
                ->where('category', $category)
                ->orderBy('message_key', 'ASC')
                ->get()
                ->getResultArray();
            
            return $messages ?: [];
        } catch (\Exception $e) {
            return [];
        }
    }
}

if (!function_exists('getAllErrorMessages')) {
    /**
     * Get all error messages from database
     * 
     * @return array Array of all messages
     */
    function getAllErrorMessages(): array
    {
        try {
            $db = \Config\Database::connect();
            $messages = $db->table('app_messages')
                ->orderBy('category', 'ASC')
                ->orderBy('message_key', 'ASC')
                ->get()
                ->getResultArray();
            
            return $messages ?: [];
        } catch (\Exception $e) {
            return [];
        }
    }
}
