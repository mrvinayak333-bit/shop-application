const pool = require('./config/db');
(async () => {
  try {
    const [summary] = await pool.query(`
      SELECT 
        user_id, user_role,
        CASE WHEN user_role = 'admin' THEN a.name ELSE t.name END as user_name,
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN cl.status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN cl.status = 'paid' THEN commission_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(commission_amount), 0) as total_amount,
        MAX(payment_date) as last_payment_date
      FROM commission_ledger cl
      LEFT JOIN admins a ON cl.user_id = a.id AND cl.user_role = 'admin'
      LEFT JOIN technicians t ON cl.user_id = t.id AND cl.user_role = 'technician'
      GROUP BY user_id, user_role
      ORDER BY total_amount DESC
    `);
    console.log('Summary query succeeded:', summary);
  } catch (err) {
    console.error('Summary query failed:', err);
  }
  process.exit();
})();
