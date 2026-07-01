<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddListingTypeIdsToBrands extends Migration
{
    public function up()
    {
        $db = $this->db;
        
        // Check if columns exist before adding them
        $columns = $db->getFieldData('brands');
        $columnNames = array_map(function($col) { return $col->name; }, $columns);
        
        // Add listing_type_id column first (for backward compatibility) - only if it doesn't exist
        if (!in_array('listing_type_id', $columnNames)) {
            $this->forge->addColumn('brands', [
                'listing_type_id' => [
                    'type'       => 'INT',
                    'constraint' => 11,
                    'unsigned'   => true,
                    'null'       => true,
                    'after'      => 'description',
                ],
            ]);
        }

        // Add JSON field to store multiple listing type IDs - only if it doesn't exist
        if (!in_array('listing_type_ids', $columnNames)) {
            $this->forge->addColumn('brands', [
                'listing_type_ids' => [
                    'type'       => 'JSON',
                    'null'       => true,
                    'after'      => 'listing_type_id',
                ],
            ]);
        }

        // Add foreign key for listing_type_id - only if column exists and foreign key doesn't exist
        if (in_array('listing_type_id', $columnNames)) {
            // Check if foreign key already exists
            $foreignKeys = $db->query("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'brands' AND CONSTRAINT_NAME LIKE 'fk_brands_listing_type_id'")->getResultArray();
            
            if (empty($foreignKeys)) {
                $this->forge->addForeignKey('listing_type_id', 'listing_types', 'id', 'SET NULL', 'CASCADE');
            }
        }
    }

    public function down()
    {
        $this->forge->dropColumn('brands', ['listing_type_ids', 'listing_type_id']);
    }
}
