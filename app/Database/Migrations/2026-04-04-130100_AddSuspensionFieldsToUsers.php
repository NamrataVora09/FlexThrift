<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddSuspensionFieldsToUsers extends Migration
{
    public function up()
    {
        $this->forge->addColumn('users', [
            'is_suspended' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'default'    => 0,
                'null'       => false,
                'after'      => 'is_blocked',
            ],
            'suspended_at' => [
                'type'  => 'DATETIME',
                'null'  => true,
                'after' => 'is_suspended',
            ],
            'suspension_reason' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
                'null'       => true,
                'after'      => 'suspended_at',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('users', ['is_suspended', 'suspended_at', 'suspension_reason']);
    }
}
