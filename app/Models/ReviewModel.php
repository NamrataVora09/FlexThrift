<?php

namespace App\Models;

use CodeIgniter\Model;

class ReviewModel extends Model
{
    protected $table = 'reviews';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'order_id',
        'reviewer_id',
        'reviewed_id',
        'product_id',
        'reviewer_type',
        'rating',
        'comment',
        'review_type'
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = '';

    protected $validationRules = [
        'reviewer_id' => 'required|integer',
        'reviewed_id' => 'required|integer',
        'reviewer_type' => 'required|in_list[buyer,seller]',
        'rating' => 'required|integer|greater_than[0]|less_than[6]',
    ];

    protected $afterInsert = ['updateUserReliability'];

    protected function updateUserReliability(array $data)
    {
        if (isset($data['id'])) {
            $review = $this->find($data['id']);
            if ($review) {
                $userModel = new \App\Models\UserModel();
                $avgRating = $this->getAverageRating($review['reviewed_id']);
                $reviewCount = $this->where('reviewed_id', $review['reviewed_id'])->countAllResults();

                // Calculate reliability score (average rating * review count)
                $reliabilityScore = round($avgRating * $reviewCount);

                $userModel->update($review['reviewed_id'], [
                    'reliability_score' => $reliabilityScore
                ]);
            }
        }
        return $data;
    }

    public function getAverageRating($userId)
    {
        $result = $this->selectAvg('rating')
            ->where('reviewed_id', $userId)
            ->first();
        return $result ? round($result['rating'], 2) : 0;
    }

    public function canReview($orderId, $userId)
    {
        $orderModel = new \App\Models\OrderModel();
        $order = $orderModel->find($orderId);

        if (!$order || $order['status'] !== 'delivered') {
            return false;
        }

        // Check if already reviewed
        $existing = $this->where([
            'order_id' => $orderId,
            'reviewer_id' => $userId
        ])->first();

        return !$existing;
    }
}
