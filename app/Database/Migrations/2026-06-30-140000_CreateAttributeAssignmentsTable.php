<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateAttributeAssignmentsTable extends Migration
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
            'attribute_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'entity_type' => [
                'type' => 'VARCHAR',
                'constraint' => 50,
                'comment' => 'listing_type, category, sub_category',
            ],
            'entity_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'comment' => 'ID of the listing_type, category, or sub_category',
            ],
            'required' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 0,
                'comment' => 'Override attribute required flag for this entity',
            ],
            'sort_order' => [
                'type' => 'INT',
                'constraint' => 11,
                'default' => 0,
                'comment' => 'Display order for this attribute',
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['attribute_id', 'entity_type', 'entity_id'], 'unique_attr_entity');
        $this->forge->addForeignKey('attribute_id', 'attributes', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('attribute_assignments');
    }

    public function down()
    {
        $this->forge->dropTable('attribute_assignments');
    }
}
