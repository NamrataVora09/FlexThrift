<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class UpdatePriceColumnConstraints extends Migration
{
    public function up()
    {
        // Update original_price from DECIMAL(10,2) to DECIMAL(12,2) to support up to 999,999,999.99 (approx 100 crore)
        $this->forge->modifyColumn('products', [
            'original_price' => [
                'type' => 'DECIMAL',
                'constraint' => '12,2',
                'null' => true,
            ],
        ]);

        // Update price from DECIMAL(10,2) to DECIMAL(12,2) to support up to 999,999,999.99 (approx 100 crore)
        $this->forge->modifyColumn('products', [
            'price' => [
                'type' => 'DECIMAL',
                'constraint' => '12,2',
                'null' => true,
            ],
        ]);

        // Update rental_cost from DECIMAL(10,2) to DECIMAL(12,2) to support up to 999,999,999.99 (approx 100 crore)
        $this->forge->modifyColumn('products', [
            'rental_cost' => [
                'type' => 'DECIMAL',
                'constraint' => '12,2',
                'null' => true,
            ],
        ]);

        // Update rental_deposit from DECIMAL(10,2) to DECIMAL(12,2) to support up to 999,999,999.99 (approx 100 crore)
        $this->forge->modifyColumn('products', [
            'rental_deposit' => [
                'type' => 'DECIMAL',
                'constraint' => '12,2',
                'null' => true,
            ],
        ]);

        // Update suggested_sale_price from DECIMAL(10,2) to DECIMAL(12,2) to support up to 999,999,999.99 (approx 100 crore)
        $this->forge->modifyColumn('products', [
            'suggested_sale_price' => [
                'type' => 'DECIMAL',
                'constraint' => '12,2',
                'null' => true,
            ],
        ]);

        // Update suggested_rental_cost from DECIMAL(10,2) to DECIMAL(12,2) to support up to 999,999,999.99 (approx 100 crore)
        $this->forge->modifyColumn('products', [
            'suggested_rental_cost' => [
                'type' => 'DECIMAL',
                'constraint' => '12,2',
                'null' => true,
            ],
        ]);
    }

    public function down()
    {
        // Revert back to DECIMAL(10,2)
        $this->forge->modifyColumn('products', [
            'original_price' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'null' => true,
            ],
        ]);

        $this->forge->modifyColumn('products', [
            'price' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'null' => true,
            ],
        ]);

        $this->forge->modifyColumn('products', [
            'rental_cost' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'null' => true,
            ],
        ]);

        $this->forge->modifyColumn('products', [
            'rental_deposit' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'null' => true,
            ],
        ]);

        $this->forge->modifyColumn('products', [
            'suggested_sale_price' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'null' => true,
            ],
        ]);

        $this->forge->modifyColumn('products', [
            'suggested_rental_cost' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'null' => true,
            ],
        ]);
    }
}
