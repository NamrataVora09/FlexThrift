<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddAdminPermissionsToUsers extends Migration
{
    public function up()
    {
        $fields = [
            'blocked_from_user_management' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 0,
                'after' => 'is_blocked'
            ],
        ];
        $this->forge->addColumn('users', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('users', 'blocked_from_user_management');
    }
}
