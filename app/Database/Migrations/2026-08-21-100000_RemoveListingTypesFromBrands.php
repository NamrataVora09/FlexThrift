<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class RemoveListingTypesFromBrands extends Migration
{
    public function up()
    {
        $db = $this->db;
        
        $columns = $db->getFieldData('brands');
        $columnNames = array_map(function($col) { return $col->name; }, $columns);
        
        // Drop foreign key if it exists
        if (in_array('listing_type_id', $columnNames)) {
            $foreignKeys = $db->query("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'brands' AND CONSTRAINT_NAME LIKE 'fk_brands_listing_type_id'")->getResultArray();
            if (!empty($foreignKeys)) {
                $this->forge->dropForeignKey('brands', 'fk_brands_listing_type_id');
            }
            $this->forge->dropColumn('brands', 'listing_type_id');
        }

        if (in_array('listing_type_ids', $columnNames)) {
            $this->forge->dropColumn('brands', 'listing_type_ids');
        }
    }

    public function down()
    {
        $db = $this->db;
        $columns = $db->getFieldData('brands');
        $columnNames = array_map(function($col) { return $col->name; }, $columns);

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

        if (!in_array('listing_type_ids', $columnNames)) {
            $this->forge->addColumn('brands', [
                'listing_type_ids' => [
                    'type'       => 'JSON',
                    'null'       => true,
                    'after'      => 'listing_type_id',
                ],
            ]);
        }
    }
}
