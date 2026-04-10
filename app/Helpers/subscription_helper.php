<?php 



function get_user_subscription()
{
    $db = \Config\Database::connect();
    $session = session();

    $user_id = $session->get('user_id');

    $sql = "SELECT 
                user_subscriptions.starts_at, 
                user_subscriptions.expires_at,
                user_subscriptions.usage_count,
                subscription_plans.name AS plan_name, 
                subscription_plans.plan_type, 
                subscription_plans.limit_value,
                subscription_plans.user_type,
                subscription_plans.duration_hours
            FROM user_subscriptions
            JOIN subscription_plans 
                ON subscription_plans.id = user_subscriptions.plan_id
            WHERE user_subscriptions.user_id = ?
            AND user_subscriptions.is_active = 1
            AND user_subscriptions.expires_at >= ?
            ORDER BY user_subscriptions.created_at DESC";

    $query = $db->query($sql, [$user_id, date('Y-m-d H:i:s')]);

    $results = $query->getResultArray();

    foreach($results as &$sub)
    {
        $expires = new \DateTime($sub['expires_at']);
        $now = new \DateTime(); // current time
        $interval = $expires->diff($now);

        // hours remaining (total hours)
        $sub['hours_remaining'] = ($interval->days * 24) + $interval->h + ($interval->i / 60);
        $sub['hours_remaining'] = max(0, round($sub['hours_remaining'],2)); // round 2 decimals
    }

    return $results;
}


?>