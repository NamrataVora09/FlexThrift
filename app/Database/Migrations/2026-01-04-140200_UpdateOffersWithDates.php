<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class UpdateOffersWithDates extends Migration
{
    public function up()
    {
        $fields = [
            'rental_start_date' => [
                'type' => 'DATE',
                'null' => true,
                'after' => 'offer_price',
            ],
            'rental_end_date' => [
                'type' => 'DATE',
                'null' => true,
                'after' => 'rental_start_date',
            ],
            'accepted_at' => [
                'type' => 'DATETIME',
                'null' => true,
                'after' => 'status',
            ],
        ];

        $this->forge->addColumn('offers', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('offers', ['rental_start_date', 'rental_end_date', 'accepted_at']);
    }
}
