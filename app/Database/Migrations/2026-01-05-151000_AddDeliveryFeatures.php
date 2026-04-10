<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddDeliveryFeatures extends Migration
{
    public function up()
    {
        // Add KYC fields to delivery_persons table
        if ($this->db->tableExists('delivery_persons')) {
            if (!$this->db->fieldExists('pan_card', 'delivery_persons')) {
                $this->forge->addColumn('delivery_persons', [
                    'pan_card' => [
                        'type' => 'VARCHAR',
                        'constraint' => 20,
                        'null' => true,
                    ],
                ]);
            }
            if (!$this->db->fieldExists('aadhar_card', 'delivery_persons')) {
                $this->forge->addColumn('delivery_persons', [
                    'aadhar_card' => [
                        'type' => 'VARCHAR',
                        'constraint' => 20,
                        'null' => true,
                    ],
                ]);
            }
            if (!$this->db->fieldExists('kyc_verified', 'delivery_persons')) {
                $this->forge->addColumn('delivery_persons', [
                    'kyc_verified' => [
                        'type' => 'TINYINT',
                        'constraint' => 1,
                        'default' => 0,
                    ],
                ]);
            }
            if (!$this->db->fieldExists('badges', 'delivery_persons')) {
                $this->forge->addColumn('delivery_persons', [
                    'badges' => [
                        'type' => 'INT',
                        'constraint' => 11,
                        'default' => 0,
                    ],
                ]);
            }
            if (!$this->db->fieldExists('rental_reliability_score', 'delivery_persons')) {
                $this->forge->addColumn('delivery_persons', [
                    'rental_reliability_score' => [
                        'type' => 'INT',
                        'constraint' => 11,
                        'default' => 0,
                    ],
                ]);
            }
            if (!$this->db->fieldExists('sale_reliability_score', 'delivery_persons')) {
                $this->forge->addColumn('delivery_persons', [
                    'sale_reliability_score' => [
                        'type' => 'INT',
                        'constraint' => 11,
                        'default' => 0,
                    ],
                ]);
            }
        }

        // Add delivery time fields to orders table
        if ($this->db->tableExists('orders')) {
            if (!$this->db->fieldExists('pickup_time_start', 'orders')) {
                $this->forge->addColumn('orders', [
                    'pickup_time_start' => [
                        'type' => 'DATETIME',
                        'null' => true,
                    ],
                ]);
            }
            if (!$this->db->fieldExists('pickup_time_end', 'orders')) {
                $this->forge->addColumn('orders', [
                    'pickup_time_end' => [
                        'type' => 'DATETIME',
                        'null' => true,
                    ],
                ]);
            }
            if (!$this->db->fieldExists('drop_time_start', 'orders')) {
                $this->forge->addColumn('orders', [
                    'drop_time_start' => [
                        'type' => 'DATETIME',
                        'null' => true,
                    ],
                ]);
            }
            if (!$this->db->fieldExists('drop_time_end', 'orders')) {
                $this->forge->addColumn('orders', [
                    'drop_time_end' => [
                        'type' => 'DATETIME',
                        'null' => true,
                    ],
                ]);
            }
            if (!$this->db->fieldExists('delivery_accepted_at', 'orders')) {
                $this->forge->addColumn('orders', [
                    'delivery_accepted_at' => [
                        'type' => 'DATETIME',
                        'null' => true,
                    ],
                ]);
            }
            if (!$this->db->fieldExists('delivery_charge', 'orders')) {
                $this->forge->addColumn('orders', [
                    'delivery_charge' => [
                        'type' => 'DECIMAL',
                        'constraint' => '10,2',
                        'default' => 50.00,
                    ],
                ]);
            }
            if (!$this->db->fieldExists('max_delivery_date', 'orders')) {
                $this->forge->addColumn('orders', [
                    'max_delivery_date' => [
                        'type' => 'DATETIME',
                        'null' => true,
                    ],
                ]);
            }
            if (!$this->db->fieldExists('status_updated_at', 'orders')) {
                $this->forge->addColumn('orders', [
                    'status_updated_at' => [
                        'type' => 'DATETIME',
                        'null' => true,
                    ],
                ]);
            }
        }

        // Add price category and required badges to products table
        if ($this->db->tableExists('products')) {
            if (!$this->db->fieldExists('price_category', 'products')) {
                $this->forge->addColumn('products', [
                    'price_category' => [
                        'type' => 'VARCHAR',
                        'constraint' => 50,
                        'default' => 'standard',
                        'comment' => 'standard, high_end, ultra_luxury',
                    ],
                ]);
            }
            if (!$this->db->fieldExists('required_badges', 'products')) {
                $this->forge->addColumn('products', [
                    'required_badges' => [
                        'type' => 'INT',
                        'constraint' => 11,
                        'default' => 0,
                        'comment' => 'Minimum badges required for delivery person',
                    ],
                ]);
            }
        }

        // Add seller_pin_code and buyer_pin_code to orders for distance calculation
        if ($this->db->tableExists('orders')) {
            if (!$this->db->fieldExists('seller_pin_code', 'orders')) {
                $this->forge->addColumn('orders', [
                    'seller_pin_code' => [
                        'type' => 'VARCHAR',
                        'constraint' => 10,
                        'null' => true,
                    ],
                ]);
            }
            if (!$this->db->fieldExists('buyer_pin_code', 'orders')) {
                $this->forge->addColumn('orders', [
                    'buyer_pin_code' => [
                        'type' => 'VARCHAR',
                        'constraint' => 10,
                        'null' => true,
                    ],
                ]);
            }
        }
    }

    public function down()
    {
        // Remove delivery_persons fields
        if ($this->db->tableExists('delivery_persons')) {
            $fields = ['pan_card', 'aadhar_card', 'kyc_verified', 'badges', 'rental_reliability_score', 'sale_reliability_score'];
            foreach ($fields as $field) {
                if ($this->db->fieldExists($field, 'delivery_persons')) {
                    $this->forge->dropColumn('delivery_persons', $field);
                }
            }
        }

        // Remove orders fields
        if ($this->db->tableExists('orders')) {
            $fields = [
                'pickup_time_start', 'pickup_time_end', 'drop_time_start', 'drop_time_end',
                'delivery_accepted_at', 'delivery_charge', 'max_delivery_date', 'status_updated_at',
                'seller_pin_code', 'buyer_pin_code'
            ];
            foreach ($fields as $field) {
                if ($this->db->fieldExists($field, 'orders')) {
                    $this->forge->dropColumn('orders', $field);
                }
            }
        }

        // Remove products fields
        if ($this->db->tableExists('products')) {
            $fields = ['price_category', 'required_badges'];
            foreach ($fields as $field) {
                if ($this->db->fieldExists($field, 'products')) {
                    $this->forge->dropColumn('products', $field);
                }
            }
        }
    }
}
