<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateValidationRules extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'field_name' => [
                'type' => 'VARCHAR',
                'constraint' => 100,
            ],
            'field_label' => [
                'type' => 'VARCHAR',
                'constraint' => 200,
            ],
            'is_required' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 0,
            ],
            'min_length' => [
                'type' => 'INT',
                'constraint' => 11,
                'null' => true,
            ],
            'max_length' => [
                'type' => 'INT',
                'constraint' => 11,
                'null' => true,
            ],
            'min_value' => [
                'type' => 'DECIMAL',
                'constraint' => '15,2',
                'null' => true,
            ],
            'max_value' => [
                'type' => 'DECIMAL',
                'constraint' => '15,2',
                'null' => true,
            ],
            'pattern' => [
                'type' => 'VARCHAR',
                'constraint' => 500,
                'null' => true,
                'comment' => 'Regex pattern for validation',
            ],
            'error_message' => [
                'type' => 'VARCHAR',
                'constraint' => 500,
                'null' => true,
            ],
            'is_active' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 1,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('field_name');
        $this->forge->createTable('validation_rules');

        // Insert default validation rules
        $db = \Config\Database::connect();
        $defaultRules = [
            [
                'field_name' => 'title',
                'field_label' => 'Product Title',
                'is_required' => 1,
                'min_length' => 3,
                'max_length' => 200,
                'error_message' => 'Title must be between 3 and 200 characters',
            ],
            [
                'field_name' => 'description',
                'field_label' => 'Description',
                'is_required' => 1,
                'min_length' => 10,
                'max_length' => 5000,
                'error_message' => 'Description must be at least 10 characters',
            ],
            [
                'field_name' => 'original_price',
                'field_label' => 'Original Price',
                'is_required' => 1,
                'min_value' => 1,
                'error_message' => 'Original price must be greater than 0',
            ],
            [
                'field_name' => 'used_times',
                'field_label' => 'Times Used',
                'is_required' => 1,
                'min_value' => 0,
                'error_message' => 'Times used must be 0 or greater',
            ],
            [
                'field_name' => 'color',
                'field_label' => 'Color',
                'is_required' => 1,
                'error_message' => 'Color is required',
            ],
            [
                'field_name' => 'listing_type_category',
                'field_label' => 'Listing Type',
                'is_required' => 1,
                'error_message' => 'Listing type is required',
            ],
        ];

        foreach ($defaultRules as $rule) {
            $rule['created_at'] = date('Y-m-d H:i:s');
            $rule['updated_at'] = date('Y-m-d H:i:s');
            $db->table('validation_rules')->insert($rule);
        }
    }

    public function down()
    {
        $this->forge->dropTable('validation_rules');
    }
}
