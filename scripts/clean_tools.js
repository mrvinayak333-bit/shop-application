const pool = require('../config/db');
async function clean() {
  const [r1] = await pool.query("DELETE FROM accessory_products WHERE category='Repairing Tools'");
  const [r2] = await pool.query("DELETE FROM accessory_products WHERE category='Mobile Displays & Glass'");
  const [r3] = await pool.query("DELETE FROM accessory_products WHERE category='Batteries & Spare ICs'");
  console.log('Deleted', (r1.affectedRows + r2.affectedRows + r3.affectedRows), 'tool/spare rows');
  process.exit();
}
clean();
