<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddBgvFieldsToDeliveryPersons extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();
        $existingColumns = $db->getFieldNames('delivery_persons');
        
        $fields = [
            'rental_deliveries_count' => [
                'type' => 'INT',
                'constraint' => 11,
                'default' => 0,
                'after' => 'total_deliveries',
                'comment' => 'Count of rental deliveries only',
            ],
            'sale_deliveries_count' => [
                'type' => 'INT',
                'constraint' => 11,
                'default' => 0,
                'after' => 'rental_deliveries_count',
                'comment' => 'Count of sale deliveries only',
            ],
        ];

        $fieldsToAdd = [];
        foreach ($fields as $fieldName => $fieldConfig) {
            if (!in_array($fieldName, $existingColumns)) {
                $fieldsToAdd[$fieldName] = $fieldConfig;
            }
        }

        if (!empty($fieldsToAdd)) {
            $this->forge->addColumn('delivery_persons', $fieldsToAdd);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('delivery_persons', [
            'rental_deliveries_count',
            'sale_deliveries_count',
        ]);
    }
}
