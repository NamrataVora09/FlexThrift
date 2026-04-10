<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class MakeReviewOrderIdNullable extends Migration
{
    public function up()
    {
        // 1. Drop the existing foreign key
        // In MySQL/MariaDB, we usually need to drop the constraint by name
        $this->db->query("ALTER TABLE reviews DROP FOREIGN KEY reviews_order_id_foreign");

        // 2. Modify the column to be nullable
        $this->forge->modifyColumn('reviews', [
            'order_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'null' => true,
            ],
        ]);

        // 3. Re-add the foreign key (nullable foreign keys are allowed)
        $this->db->query("ALTER TABLE reviews ADD CONSTRAINT reviews_order_id_foreign FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE");
    }

    public function down()
    {
        // Revert to NOT NULL (Note: this might fail if there are NULL entries)
        $this->db->query("ALTER TABLE reviews DROP FOREIGN KEY reviews_order_id_foreign");

        $this->forge->modifyColumn('reviews', [
            'order_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'null' => false,
            ],
        ]);

        $this->db->query("ALTER TABLE reviews ADD CONSTRAINT reviews_order_id_foreign FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE");
    }
}
