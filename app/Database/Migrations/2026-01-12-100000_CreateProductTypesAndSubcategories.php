<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateProductTypesAndSubcategories extends Migration
{
    public function up()
    {
        // product_types
        $this->forge->addField([
            'id' => [ 'type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true ],
            'listing_type_id' => [ 'type' => 'INT', 'constraint' => 11, 'null' => true ],
            'name' => [ 'type' => 'VARCHAR', 'constraint' => 191 ],
            'created_at' => [ 'type' => 'DATETIME', 'null' => true ],
            'updated_at' => [ 'type' => 'DATETIME', 'null' => true ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('product_types', true);

        // sub_categories
        $this->forge->addField([
            'id' => [ 'type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true ],
            'category_id' => [ 'type' => 'INT', 'constraint' => 11, 'null' => true ],
            'name' => [ 'type' => 'VARCHAR', 'constraint' => 191 ],
            'created_at' => [ 'type' => 'DATETIME', 'null' => true ],
            'updated_at' => [ 'type' => 'DATETIME', 'null' => true ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('sub_categories', true);
    }

    public function down()
    {
        $this->forge->dropTable('product_types', true);
        $this->forge->dropTable('sub_categories', true);
    }
}
