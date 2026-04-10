<?php

namespace App\Models;

use CodeIgniter\Model;

class TransactionModel extends Model
{
    protected $table = 'transactions';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'order_id', 'user_id', 'amount', 'transaction_type', 
        'payment_method', 'payment_status', 'transaction_id',
        'payment_gateway_response', 'refund_amount', 'refund_status'
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'order_id' => 'required|integer',
        'user_id' => 'required|integer',
        'amount' => 'required|decimal',
        'transaction_type' => 'required',
    ];

    public function getUserTransactions($userId)
    {
        return $this->where('user_id', $userId)
                    ->orderBy('created_at', 'DESC')
                    ->findAll();
    }

    public function getOrderTransaction($orderId)
    {
        return $this->where('order_id', $orderId)->first();
    }

    public function createPayment($orderData)
    {
        return $this->insert([
            'order_id' => $orderData['order_id'],
            'user_id' => $orderData['user_id'],
            'amount' => $orderData['amount'],
            'transaction_type' => 'payment',
            'payment_method' => $orderData['payment_method'] ?? 'cod',
            'payment_status' => 'pending',
        ]);
    }

    public function markPaid($transactionId, $paymentDetails = [])
    {
        $updateData = [
            'payment_status' => 'completed',
            'transaction_id' => $paymentDetails['transaction_id'] ?? null,
            'payment_gateway_response' => $paymentDetails['response'] ?? null,
        ];

        return $this->update($transactionId, $updateData);
    }

    public function initiateRefund($transactionId, $refundAmount, $reason = '')
    {
        $transaction = $this->find($transactionId);
        
        if (!$transaction) {
            return false;
        }

        return $this->update($transactionId, [
            'refund_amount' => $refundAmount,
            'refund_status' => 'initiated',
        ]);
    }
}
