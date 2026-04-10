<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddSelfReviewFieldsToReviews extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();
        $existingColumns = $db->getFieldNames('reviews');
        
        $fields = [
            'can_review_until' => [
                'type' => 'DATETIME',
                'null' => true,
                'after' => 'comment',
                'comment' => '20 days from order completion for self-review',
            ],
            'is_self_review' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 0,
                'after' => 'can_review_until',
                'comment' => 'True if reviewing own product (1 star only)',
            ],
        ];

        $fieldsToAdd = [];
        foreach ($fields as $fieldName => $fieldConfig) {
            if (!in_array($fieldName, $existingColumns)) {
                $fieldsToAdd[$fieldName] = $fieldConfig;
            }
        }

        if (!empty($fieldsToAdd)) {
            $this->forge->addColumn('reviews', $fieldsToAdd);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('reviews', [
            'can_review_until',
            'is_self_review',
        ]);
    }
}
