<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class ProductCategorySeeder extends Seeder
{
    public function run()
    {
        $now = date('Y-m-d H:i:s');
        $db = $this->db;

        // Insert categories
        $categories = [
            ['category_name' => 'Clothing',     'category_type' => 'clothing',     'applies_to' => 'sell,rent', 'created_at' => $now],
            ['category_name' => 'Electronics',  'category_type' => 'electronics',  'applies_to' => 'sell',      'created_at' => $now],
            ['category_name' => 'Furniture',    'category_type' => 'furniture',    'applies_to' => 'sell,rent', 'created_at' => $now],
            ['category_name' => 'Books',        'category_type' => 'books',        'applies_to' => 'sell',      'created_at' => $now],
            ['category_name' => 'Sports',       'category_type' => 'sports',       'applies_to' => 'sell,rent', 'created_at' => $now],
        ];

        foreach ($categories as $cat) {
            $db->table('categories')->insert($cat);
        }
        echo "Categories inserted\n";

        // Get seller id
        $seller = $db->table('users')->where('email', 'seller@example.com')->get()->getRowArray();
        if (!$seller) {
            echo "Seller not found — run DummyUsersSeeder first\n";
            return;
        }
        $sellerId = $seller['id'];

        // Insert dummy approved products
        $products = [
            [
                'seller_id'             => $sellerId,
                'title'                 => 'Blue Denim Jacket',
                'description'           => 'Good condition blue denim jacket, barely worn.',
                'category'              => 'Clothing',
                'listing_type'          => 'sell',
                'listing_type_category' => 'clothing',
                'price'                 => 499.00,
                'size'                  => 'M',
                'color'                 => 'Blue',
                'status'                => 'approved',
                'has_bill'              => 0,
                'created_at'            => $now,
                'updated_at'            => $now,
            ],
            [
                'seller_id'             => $sellerId,
                'title'                 => 'Floral Summer Dress',
                'description'           => 'Beautiful floral dress, worn once.',
                'category'              => 'Clothing',
                'listing_type'          => 'sell',
                'listing_type_category' => 'clothing',
                'price'                 => 350.00,
                'size'                  => 'S',
                'color'                 => 'Pink',
                'status'                => 'approved',
                'has_bill'              => 0,
                'created_at'            => $now,
                'updated_at'            => $now,
            ],
            [
                'seller_id'             => $sellerId,
                'title'                 => 'Black Formal Shirt',
                'description'           => 'Classic black shirt for formal occasions.',
                'category'              => 'Clothing',
                'listing_type'          => 'sell',
                'listing_type_category' => 'clothing',
                'price'                 => 299.00,
                'size'                  => 'L',
                'color'                 => 'Black',
                'status'                => 'approved',
                'has_bill'              => 0,
                'created_at'            => $now,
                'updated_at'            => $now,
            ],
            [
                'seller_id'             => $sellerId,
                'title'                 => 'Red Kurta',
                'description'           => 'Traditional red kurta in great condition.',
                'category'              => 'Clothing',
                'listing_type'          => 'rent',
                'listing_type_category' => 'clothing',
                'price'                 => 150.00,
                'rental_cost'           => 150.00,
                'size'                  => 'M',
                'color'                 => 'Red',
                'status'                => 'approved',
                'has_bill'              => 0,
                'created_at'            => $now,
                'updated_at'            => $now,
            ],
            [
                'seller_id'             => $sellerId,
                'title'                 => 'Woolen Sweater',
                'description'           => 'Warm woolen sweater, perfect for winters.',
                'category'              => 'Clothing',
                'listing_type'          => 'sell',
                'listing_type_category' => 'clothing',
                'price'                 => 399.00,
                'size'                  => 'XL',
                'color'                 => 'Grey',
                'status'                => 'approved',
                'has_bill'              => 0,
                'created_at'            => $now,
                'updated_at'            => $now,
            ],
        ];

        foreach ($products as $product) {
            $db->table('products')->insert($product);
        }
        echo "Products inserted\n";
    }
}
