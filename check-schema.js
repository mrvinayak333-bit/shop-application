const pool = require('./config/db');

(async () => {
  try {
    console.log('Checking database schema...\n');

    // Check for laptop_repairs table
    const [tables] = await pool.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'mobile_repair_system'");
    
    const tableNames = tables.map(t => t.TABLE_NAME);
    console.log('📊 Database Tables:');
    console.log('='.repeat(40));
    
    const systemTables = [
      'master', 'admin', 'technician', 'customer', 'student',
      'mobile_repairs', 'laptop_repairs', 'repair_status', 'quotation',
      'invoices', 'courses', 'course_materials', 'course_purchases',
      'commission_ledger', 'commission_payments', 'commission_settings'
    ];

    for (const table of systemTables) {
      const exists = tableNames.includes(table);
      console.log(`${exists ? '✓' : '✗'} ${table}`);
    }

    console.log('\n📋 GST Columns Check (should be empty):');
    const [invoiceColumns] = await pool.query("DESCRIBE invoices");
    const gstColumns = invoiceColumns.filter(col => 
      col.Field.toLowerCase().includes('gst') || 
      col.Field.toLowerCase().includes('cgst') || 
      col.Field.toLowerCase().includes('sgst') || 
      col.Field.toLowerCase().includes('igst')
    );
    console.log(`GST columns found: ${gstColumns.length}`);
    if (gstColumns.length > 0) {
      console.log('Warning: GST columns still exist:', gstColumns.map(c => c.Field).join(', '));
    } else {
      console.log('✓ All GST columns successfully removed');
    }

    console.log('\n✅ Schema verification complete!\n');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
})();
