<?php

namespace App\Models;

use CodeIgniter\Model;

class NotificationModel extends Model
{
    protected $table = 'notifications';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = ['user_id', 'title', 'message', 'type', 'is_read', 'related_id'];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = '';

    public function getUserNotifications($userId, $unreadOnly = false)
    {
        $builder = $this->where('user_id', $userId);
        
        if ($unreadOnly) {
            $builder->where('is_read', 0);
        }
        
        return $builder->orderBy('created_at', 'DESC')->findAll();
    }

    public function markAsRead($notificationId)
    {
        return $this->update($notificationId, ['is_read' => 1]);
    }

    public function markAllAsRead($userId)
    {
        return $this->where('user_id', $userId)->set(['is_read' => 1])->update();
    }

    public function getUnreadCount($userId)
    {
        return $this->where(['user_id' => $userId, 'is_read' => 0])->countAllResults();
    }
}
