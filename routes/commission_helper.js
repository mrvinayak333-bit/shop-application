const pool = require('../config/db');

async function creditCommission(userId, userRole, type, referenceId) {
  if (!['staff', 'admin', 'technician'].includes(userRole)) return;
  try {
    // 1. Fetch commission settings
    const [settings] = await pool.query(
      'SELECT repair_commission, accessories_commission FROM commission_settings WHERE user_id = ? AND user_role = ?',
      [userId, userRole]
    );

    let commAmount = 0;
    if (settings.length > 0) {
      commAmount = type === 'repair' ? settings[0].repair_commission : settings[0].accessories_commission;
    } else {
      // Default fallback
      commAmount = type === 'repair' ? 80.00 : 40.00;
    }

    if (commAmount <= 0) return;

    // 2. Ensure salary wallet exists
    await pool.query(
      `INSERT INTO salary_wallets (user_id, user_role, balance, pending_salary, paid_salary) 
       VALUES (?, ?, 0.00, 0.00, 0.00) 
       ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
      [userId, userRole]
    );

    const [wallets] = await pool.query('SELECT id FROM salary_wallets WHERE user_id = ? AND user_role = ?', [userId, userRole]);
    const walletId = wallets[0].id;

    // 3. Credit wallet balance
    await pool.query('UPDATE salary_wallets SET balance = balance + ? WHERE id = ?', [commAmount, walletId]);

    // 4. Log in ledger
    const description = `Commission auto credited for ${type} id #${referenceId}`;
    await pool.query(
      `INSERT INTO wallet_ledger (wallet_id, type, amount, description, reference_type, reference_id) 
       VALUES (?, 'credit', ?, ?, 'commission', ?)`,
      [walletId, commAmount, description, type, referenceId]
    );

    // 5. Send notification
    await pool.query(
      `INSERT INTO notifications (user_id, user_role, title, message, type) 
       VALUES (?, ?, 'Commission Added', ?, 'salary')`,
      [userId, userRole, `Commission of ₹${commAmount} credited to your salary wallet for ${type} #${referenceId}`]
    );

    console.log(`✅ Credited commission of ₹${commAmount} to ${userRole} id ${userId} for ${type} reference ${referenceId}`);
  } catch (err) {
    console.error('Error crediting commission:', err);
  }
}

module.exports = { creditCommission };
