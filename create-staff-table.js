const pool = require('./config/db');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    console.log('Creating staff_members table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        staff_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(150) UNIQUE NULL,
        mobile VARCHAR(20) NULL,
        role VARCHAR(20) DEFAULT 'staff',
        status ENUM('active','inactive') DEFAULT 'active',
        created_by INT,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    console.log('staff_members table created successfully.');
    
    // Check if default staff member exists
    const [rows] = await pool.query('SELECT id FROM staff_members WHERE staff_id = ?', ['STF-2026-0001']);
    
    if (rows.length === 0) {
      console.log('Inserting default staff member...');
      const hashedPassword = await bcrypt.hash('staff123', 10);
      await pool.query(
        'INSERT INTO staff_members (staff_id, name, password, email, mobile, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['STF-2026-0001', 'Default Staff', hashedPassword, 'staff@repairsystem.com', '7777777777', 'staff', 'active']
      );
      console.log('Default staff member inserted successfully (staff_id: STF-2026-0001, password: staff123)');
    } else {
      console.log('Default staff member already exists.');
    }
    
    console.log('Done!');
  } catch (err) {
    console.error('Error creating staff_members table:', err);
  } finally {
    process.exit();
  }
})();
