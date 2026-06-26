<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddOriginalImagesSnapshotToEditRequests extends Migration
{
    public function up()
    {
        $this->forge->addColumn('product_edit_requests', [
            'original_images_snapshot' => [
                'type' => 'TEXT',
                'null' => true,
                'after' => 'deleted_images_ids',
                'comment' => 'Snapshot of original product images at time of first edit request',
            ]
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('product_edit_requests', 'original_images_snapshot');
    }
}
