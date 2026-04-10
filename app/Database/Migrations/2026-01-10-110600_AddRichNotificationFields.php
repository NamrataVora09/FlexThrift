<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddRichNotificationFields extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();
        $existingColumns = $db->getFieldNames('notifications');
        
        $fields = [
            'action_url' => [
                'type' => 'VARCHAR',
                'constraint' => 255,
                'null' => true,
                'after' => 'related_id',
                'comment' => 'Link to related page when notification clicked',
            ],
            'icon' => [
                'type' => 'VARCHAR',
                'constraint' => 50,
                'null' => true,
                'after' => 'action_url',
                'comment' => 'Icon class or image path',
            ],
        ];

        $fieldsToAdd = [];
        foreach ($fields as $fieldName => $fieldConfig) {
            if (!in_array($fieldName, $existingColumns)) {
                $fieldsToAdd[$fieldName] = $fieldConfig;
            }
        }

        if (!empty($fieldsToAdd)) {
            $this->forge->addColumn('notifications', $fieldsToAdd);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('notifications', [
            'action_url',
            'icon',
        ]);
    }
}
