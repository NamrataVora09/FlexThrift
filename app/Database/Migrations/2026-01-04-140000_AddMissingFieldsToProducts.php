<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddMissingFieldsToProducts extends Migration
{
    public function up()
    {
        $fields = [
            'gender' => [
                'type' => 'ENUM',
                'constraint' => ['Male', 'Female', 'Unisex', 'Kids'],
                'null' => true,
                'after' => 'listing_type',
            ],
            'product_type' => [
                'type' => 'VARCHAR',
                'constraint' => 100,
                'null' => true,
                'after' => 'gender',
            ],
            'sub_category' => [
                'type' => 'VARCHAR',
                'constraint' => 100,
                'null' => true,
                'after' => 'category',
            ],
            'used_times' => [
                'type' => 'INT',
                'default' => 0,
                'after' => 'color',
            ],
            'original_price' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'null' => true,
                'after' => 'used_times',
            ],
            'suggested_sale_price' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'null' => true,
                'after' => 'original_price',
            ],
            'suggested_rental_cost' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'null' => true,
                'after' => 'suggested_sale_price',
            ],
            'allow_alter_fitting' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 0,
                'after' => 'fitting_charge',
            ],
            'dispatch_address' => [
                'type' => 'TEXT',
                'null' => true,
                'after' => 'bill_image',
            ],
            'dispatch_pin_code' => [
                'type' => 'VARCHAR',
                'constraint' => 10,
                'null' => true,
                'after' => 'dispatch_address',
            ],
            'rental_start_date' => [
                'type' => 'DATE',
                'null' => true,
                'after' => 'dispatch_pin_code',
            ],
            'rental_end_date' => [
                'type' => 'DATE',
                'null' => true,
                'after' => 'rental_start_date',
            ],
        ];

        $this->forge->addColumn('products', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('products', [
            'gender', 'product_type', 'sub_category', 'used_times', 'original_price',
            'suggested_sale_price', 'suggested_rental_cost', 'allow_alter_fitting',
            'dispatch_address', 'dispatch_pin_code', 'rental_start_date', 'rental_end_date'
        ]);
    }
}
