<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateSeoSettingsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'page_key' => [
                'type' => 'VARCHAR',
                'constraint' => 100,
                'unique' => true,
            ],
            'page_name' => [
                'type' => 'VARCHAR',
                'constraint' => 255,
            ],
            'route' => [
                'type' => 'VARCHAR',
                'constraint' => 255,
            ],
            'title' => [
                'type' => 'VARCHAR',
                'constraint' => 255,
                'null' => true,
            ],
            'meta_description' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'meta_keywords' => [
                'type' => 'VARCHAR',
                'constraint' => 255,
                'null' => true,
            ],
            'og_title' => [
                'type' => 'VARCHAR',
                'constraint' => 255,
                'null' => true,
            ],
            'og_description' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('seo_settings');

        // Seeding initial data
        $data = [
            [
                'page_key' => 'home',
                'page_name' => 'Home',
                'route' => '/',
                'title' => 'FlexMarket — Rent or Buy Premium Fashion',
                'meta_description' => 'FlexMarket is India\'s premier platform for renting and buying premium fashion. Discover luxury clothing, accessories, and more at affordable prices.',
                'meta_keywords' => 'flexmarket, rent fashion, buy fashion, luxury clothing, rental platform',
                'og_title' => 'FlexMarket — Rent or Buy Premium Fashion',
                'og_description' => 'India\'s premier platform for renting and buying premium fashion.',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ],
            [
                'page_key' => 'browse',
                'page_name' => 'Browse Products',
                'route' => '/browse',
                'title' => 'Browse Products — FlexMarket',
                'meta_description' => 'Browse through our extensive collection of premium fashion items available for rent or purchase.',
                'meta_keywords' => 'browse, products, fashion, rental, purchase',
                'og_title' => 'Browse Products — FlexMarket',
                'og_description' => 'Browse through our extensive collection of premium fashion items.',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ],
            [
                'page_key' => 'about',
                'page_name' => 'About Us',
                'route' => '/about',
                'title' => 'About Us — FlexMarket',
                'meta_description' => 'Learn about FlexMarket\'s mission to make premium fashion accessible to everyone through affordable rentals and purchases.',
                'meta_keywords' => 'about, flexmarket, mission, fashion rental',
                'og_title' => 'About Us — FlexMarket',
                'og_description' => 'Learn about FlexMarket\'s mission to make premium fashion accessible.',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ],
        ];

        $this->db->table('seo_settings')->insertBatch($data);
    }

    public function down()
    {
        $this->forge->dropTable('seo_settings');
    }
}
