<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class UpdateDeletedImagesIdsFormat extends Migration
{
    public function up()
    {
        // This migration is informational - the column type remains TEXT
        // The change is in the data format stored in the column
        // Old format: ["75", "76"] (array of IDs)
        // New format: [{"id": "75", "image_path": "uploads/products/..."}, ...] (array of objects)
        
        // No schema changes needed, just data format change
        // The backend API will handle the new format when saving
    }

    public function down()
    {
        // No schema changes to revert
        // Data format changes are handled by the API
    }
}
