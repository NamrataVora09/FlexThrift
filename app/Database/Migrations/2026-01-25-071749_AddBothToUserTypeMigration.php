<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddBothToUserTypeMigration extends Migration
{
    public function up()
    {
        $this->forge->modifyColumn('users', [
            'user_type' => [
                'type' => 'ENUM',
                'constraint' => ['seller', 'buyer', 'both'],
                'default' => 'buyer',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->modifyColumn('users', [
            'user_type' => [
                'type' => 'ENUM',
                'constraint' => ['seller', 'buyer'],
                'default' => 'buyer',
            ],
        ]);
    }
}
