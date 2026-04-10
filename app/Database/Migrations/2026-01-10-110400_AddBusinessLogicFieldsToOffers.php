<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddBusinessLogicFieldsToOffers extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();
        $existingColumns = $db->getFieldNames('offers');
        
        $fields = [
            'can_reject_until' => [
                'type' => 'DATETIME',
                'null' => true,
                'after' => 'seller_remarks',
                'comment' => '1 day from offer creation - rejection allowed',
            ],
            'buyer_reliability_at_offer' => [
                'type' => 'DECIMAL',
                'constraint' => '3,2',
                'null' => true,
                'after' => 'can_reject_until',
                'comment' => 'Snapshot of buyer reliability when offer was made',
            ],
        ];

        $fieldsToAdd = [];
        foreach ($fields as $fieldName => $fieldConfig) {
            if (!in_array($fieldName, $existingColumns)) {
                $fieldsToAdd[$fieldName] = $fieldConfig;
            }
        }

        if (!empty($fieldsToAdd)) {
            $this->forge->addColumn('offers', $fieldsToAdd);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('offers', [
            'can_reject_until',
            'buyer_reliability_at_offer',
        ]);
    }
}
