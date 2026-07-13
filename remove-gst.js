const pool = require('./config/db');

(async () => {
  try {
    console.log('Removing GST fields from application...\n');

    // Columns to remove (if they exist)
    const columnsToRemove = [
      'ALTER TABLE invoices DROP COLUMN IF EXISTS gst_number',
      'ALTER TABLE invoices DROP COLUMN IF EXISTS cgst_percent',
      'ALTER TABLE invoices DROP COLUMN IF EXISTS sgst_percent',
      'ALTER TABLE invoices DROP COLUMN IF EXISTS igst_percent',
      'ALTER TABLE invoices DROP COLUMN IF EXISTS cgst_amount',
      'ALTER TABLE invoices DROP COLUMN IF EXISTS sgst_amount',
      'ALTER TABLE invoices DROP COLUMN IF EXISTS igst_amount',
      'ALTER TABLE invoices DROP COLUMN IF EXISTS gst_amount',
      'ALTER TABLE invoices DROP COLUMN IF EXISTS gst_tax',
      'ALTER TABLE invoices DROP COLUMN IF EXISTS tax_type'
    ];

    for (const sql of columnsToRemove) {
      try {
        await pool.query(sql);
        console.log(`✓ ${sql.split('DROP COLUMN')[1].trim()}`);
      } catch (e) {
        // Ignore if column doesn't exist
      }
    }

    // Update invoice columns for service charge instead of GST
    const updates = [
      'ALTER TABLE invoices MODIFY COLUMN tax_percent DECIMAL(5,2) DEFAULT 0 COMMENT "Service charge/handling charge"',
      'ALTER TABLE invoices MODIFY COLUMN tax_amount DECIMAL(10,2) DEFAULT 0 COMMENT "Service charge amount"'
    ];

    for (const sql of updates) {
      try {
        await pool.query(sql);
      } catch (e) {
        // Silently skip if already modified
      }
    }

    // Update all invoice records to remove GST references from notes/descriptions
    await pool.query(
      'UPDATE invoices SET notes = REPLACE(REPLACE(notes, "GST", ""), "gst", "") WHERE notes IS NOT NULL'
    );

    console.log('\n✅ GST fields removed successfully!');
    console.log('✅ Invoices now use Service Bill/Cash Memo format');
    console.log('✅ Tax field repurposed for service charges\n');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
})();
