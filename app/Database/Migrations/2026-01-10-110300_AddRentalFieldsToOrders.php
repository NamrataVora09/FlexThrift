<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddRentalFieldsToOrders extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();
        $existingColumns = $db->getFieldNames('orders');
        
        $fields = [
            'rental_start_date' => [
                'type' => 'DATE',
                'null' => true,
                'after' => 'deposit_amount',
                'comment' => 'Rental start date for rent orders',
            ],
            'rental_end_date' => [
                'type' => 'DATE',
                'null' => true,
                'after' => 'rental_start_date',
                'comment' => 'Rental end date for rent orders',
            ],
            'original_rental_end_date' => [
                'type' => 'DATE',
                'null' => true,
                'after' => 'rental_end_date',
                'comment' => 'Original end date before extension',
            ],
            'is_extended' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 0,
                'after' => 'original_rental_end_date',
                'comment' => 'Has rental been extended',
            ],
            'extension_days' => [
                'type' => 'INT',
                'constraint' => 11,
                'default' => 0,
                'after' => 'is_extended',
                'comment' => 'Number of days extended',
            ],
            'pickup_date' => [
                'type' => 'DATETIME',
                'null' => true,
                'after' => 'extension_days',
                'comment' => 'Scheduled pickup date by delivery person',
            ],
            'drop_date' => [
                'type' => 'DATETIME',
                'null' => true,
                'after' => 'pickup_date',
                'comment' => 'Scheduled drop date by delivery person',
            ],
            'self_delivery' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 0,
                'after' => 'drop_date',
                'comment' => 'Is this a self-delivery order',
            ],
            'delivery_type' => [
                'type' => 'ENUM',
                'constraint' => ['self', 'platform', 'co_delivery'],
                'default' => 'platform',
                'after' => 'self_delivery',
                'comment' => 'Type of delivery method',
            ],
        ];

        $fieldsToAdd = [];
        foreach ($fields as $fieldName => $fieldConfig) {
            if (!in_array($fieldName, $existingColumns)) {
                $fieldsToAdd[$fieldName] = $fieldConfig;
            }
        }

        if (!empty($fieldsToAdd)) {
            $this->forge->addColumn('orders', $fieldsToAdd);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('orders', [
            'rental_start_date',
            'rental_end_date',
            'original_rental_end_date',
            'is_extended',
            'extension_days',
            'pickup_date',
            'drop_date',
            'self_delivery',
            'delivery_type',
        ]);
    }
}
