<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class UpdateAdvertisementsTable extends Migration
{
    public function up()
    {
        $fields = [
            'short_description' => [
                'type' => 'TEXT',
                'null' => true,
                'after' => 'title'
            ],
            'ad_type' => [
                'type' => 'ENUM',
                'constraint' => ['image', 'video'],
                'default' => 'image',
                'after' => 'media_type'
            ],
            'start_date' => [
                'type' => 'DATE',
                'null' => true,
                'after' => 'position'
            ],
            'end_date' => [
                'type' => 'DATE',
                'null' => true,
                'after' => 'start_date'
            ],
            'payment_date' => [
                'type' => 'DATE',
                'null' => true,
                'after' => 'end_date'
            ],
        ];
        $this->forge->addColumn('advertisements', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('advertisements', ['short_description', 'ad_type', 'start_date', 'end_date', 'payment_date']);
    }
}
