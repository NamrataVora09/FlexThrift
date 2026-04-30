<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddProfileFieldsToUsers extends Migration
{
    private function addIfMissing(string $table, string $col, array $def): void
    {
        if (!$this->db->fieldExists($col, $table)) {
            $this->forge->addColumn($table, [$col => $def]);
        }
    }

    public function up()
    {
        $this->addIfMissing('users', 'city',             ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true]);
        $this->addIfMissing('users', 'state',            ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true]);
        $this->addIfMissing('users', 'alternate_mobile', ['type' => 'VARCHAR', 'constraint' => 20,  'null' => true]);
        $this->addIfMissing('users', 'gender',           ['type' => 'VARCHAR', 'constraint' => 20,  'null' => true]);
        $this->addIfMissing('users', 'profile_image',    ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true]);
    }

    public function down()
    {
        foreach (['city', 'state', 'alternate_mobile', 'gender', 'profile_image'] as $col) {
            if ($this->db->fieldExists($col, 'users')) {
                $this->forge->dropColumn('users', $col);
            }
        }
    }
}
