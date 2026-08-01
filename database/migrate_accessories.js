const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mobile_repair_system',
    multipleStatements: true
  });

  console.log('⏳ Creating accessories store database tables...');

  const schemaSql = `
    -- 1. ACCESSORY PRODUCTS
    CREATE TABLE IF NOT EXISTS accessory_products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      brand VARCHAR(100),
      category VARCHAR(100) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      discount_price DECIMAL(10,2) DEFAULT NULL,
      stock INT DEFAULT 0,
      status ENUM('enabled','disabled') DEFAULT 'enabled',
      rating DECIMAL(3,2) DEFAULT 4.00,
      image_url VARCHAR(500) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    -- 2. ACCESSORY CART
    CREATE TABLE IF NOT EXISTS accessory_cart (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES accessory_products(id) ON DELETE CASCADE,
      UNIQUE KEY unique_cart_item (customer_id, product_id)
    );

    -- 3. ACCESSORY ORDERS
    CREATE TABLE IF NOT EXISTS accessory_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      tracking_number VARCHAR(100) UNIQUE NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'manual',
      payment_status ENUM('pending','completed','failed') DEFAULT 'pending',
      order_status ENUM('placed','confirmed','packed','shipped','in_transit','local_hub','out_delivery','delivered','cancelled') DEFAULT 'placed',
      shipping_address TEXT NOT NULL,
      shipping_mobile VARCHAR(20) NOT NULL,
      estimated_delivery_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    -- 4. ACCESSORY ORDER ITEMS
    CREATE TABLE IF NOT EXISTS accessory_order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT DEFAULT 1,
      price DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES accessory_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES accessory_products(id) ON DELETE CASCADE
    );

    -- 5. ACCESSORY TRACKING HISTORY
    CREATE TABLE IF NOT EXISTS accessory_tracking_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      status VARCHAR(100) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES accessory_orders(id) ON DELETE CASCADE
    );
  `;

  try {
    await connection.query(schemaSql);
    console.log('✅ Tables created successfully!');

    // Check if we already seeded products
    const [existing] = await connection.query('SELECT COUNT(*) as count FROM accessory_products');
    if (existing[0].count === 0) {
      console.log('🌱 Seeding sample accessories products...');
      const sampleProducts = [
        ['Spigen Liquid Air Mobile Cover', 'Spigen', 'Mobile Covers', 'Ultra slim and sleek premium TPU case for iPhone & Samsung.', 499.00, 399.00, 50, 4.5],
        ['Gorilla 9H Tempered Glass', 'Gorilla', 'Tempered Glass', '9H hardness scratch-resistant tempered glass screen protector.', 299.00, 199.00, 100, 4.2],
        ['Samsung 25W Type-C Super Fast Charger', 'Samsung', 'Fast Chargers', 'Super fast charging wall adapter with USB PD 3.0 support.', 1299.00, 999.00, 30, 4.7],
        ['Boat Rugged USB-C Cable', 'Boat', 'Charging Cables', 'Indestructible nylon braided 1.5m USB-C fast charging cable.', 249.00, 199.00, 75, 4.3],
        ['Noise ColorFit Smart Watch', 'Noise', 'Smart Watches', '1.8-inch display, SPO2 tracking, 7-day battery life.', 2999.00, 1999.00, 20, 4.4],
        ['OnePlus Nord Buds 2 TWS', 'OnePlus', 'TWS Buds', 'Active Noise Cancelling, deep bass, 36 hours total playback.', 2499.00, 2199.00, 15, 4.6],
        ['Mi Boost 10000mAh Power Bank', 'Xiaomi', 'Power Banks', 'Dual output port, 18W fast charging power bank.', 1199.00, 999.00, 25, 4.5]
      ];

      for (const p of sampleProducts) {
        await connection.query(
          'INSERT INTO accessory_products (name, brand, category, description, price, discount_price, stock, rating) VALUES (?,?,?,?,?,?,?,?)',
          p
        );
      }
      console.log('✅ Seeding complete!');
    } else {
      console.log('ℹ️ Products already seeded, skipping seeding.');
    }

  } catch (err) {
    console.error('❌ Migration Error:', err.message);
  } finally {
    await connection.end();
    process.exit();
  }
}

run();
