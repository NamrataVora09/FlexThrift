<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddRejectedAtToOffers extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();
        $existingColumns = $db->getFieldNames('offers');
        
        if (!in_array('rejected_at', $existingColumns)) {
            $fields = [
                'rejected_at' => [
                    'type' => 'DATETIME',
                    'null' => true,
                    'after' => 'accepted_at',
                ],
            ];
            $this->forge->addColumn('offers', $fields);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('offers', 'rejected_at');
    }
}
