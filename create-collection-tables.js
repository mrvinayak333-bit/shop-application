const pool = require('./config/db');

(async () => {
  try {
    console.log('Starting migration for SRM Payment Collection & Salary modules...');

    // 1. Payment Collections
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_collections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(100) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        mobile_number VARCHAR(20) NOT NULL,
        order_type ENUM('mobile_repair', 'accessories_store') NOT NULL,
        payment_method ENUM('cash', 'upi', 'card') NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        cash_denominations TEXT NULL,
        collected_by INT NOT NULL,
        assigned_admin_id INT NOT NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        receipt_number VARCHAR(100) NULL,
        approved_by INT NULL,
        approved_at TIMESTAMP NULL,
        rejected_by INT NULL,
        rejected_reason TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ payment_collections table verified');

    // 2. Bank Deposits
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bank_deposits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        bank_name VARCHAR(255) NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        deposit_slip_number VARCHAR(100) NOT NULL,
        deposit_date DATE NOT NULL,
        deposit_amount DECIMAL(10,2) NOT NULL,
        deposit_slip_image VARCHAR(500) NULL,
        screenshot VARCHAR(500) NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        approved_by INT NULL,
        approved_at TIMESTAMP NULL,
        rejected_by INT NULL,
        rejected_reason TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ bank_deposits table verified');

    // 3. Salary Wallets
    await pool.query(`
      CREATE TABLE IF NOT EXISTS salary_wallets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        user_role ENUM('staff', 'admin', 'technician') NOT NULL,
        balance DECIMAL(10,2) DEFAULT 0.00,
        pending_salary DECIMAL(10,2) DEFAULT 0.00,
        paid_salary DECIMAL(10,2) DEFAULT 0.00,
        status ENUM('active', 'locked', 'frozen') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY user_role_id (user_id, user_role)
      )
    `);
    console.log('✅ salary_wallets table verified');

    // 4. Salary Withdrawals
    await pool.query(`
      CREATE TABLE IF NOT EXISTS salary_withdrawals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        user_role ENUM('staff', 'admin', 'technician') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        bank_account TEXT NULL,
        upi_id VARCHAR(255) NULL,
        reason TEXT NULL,
        status ENUM('pending', 'approved', 'rejected', 'processing', 'paid') DEFAULT 'pending',
        approved_by INT NULL,
        approved_at TIMESTAMP NULL,
        paid_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ salary_withdrawals table verified');

    // 5. Commission Settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS commission_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        user_role ENUM('staff', 'admin', 'technician') NOT NULL,
        repair_commission DECIMAL(10,2) DEFAULT 0.00,
        accessories_commission DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY user_role_id (user_id, user_role)
      )
    `);
    console.log('✅ commission_settings table verified');

    // 6. Wallet Ledger
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallet_ledger (
        id INT AUTO_INCREMENT PRIMARY KEY,
        wallet_id INT NOT NULL,
        type ENUM('credit', 'debit') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT NOT NULL,
        reference_type ENUM('commission', 'withdrawal', 'bonus', 'incentive', 'fine', 'advance', 'manual') NOT NULL,
        reference_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ wallet_ledger table verified');

    console.log('🎉 SRM Collection & Salary Schema upgraded successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    process.exit();
  }
})();
