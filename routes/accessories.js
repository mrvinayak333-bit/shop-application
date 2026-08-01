const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadAccessory } = require('../middleware/upload');
const { creditCommission } = require('./commission_helper');

// ======================================================================
// PUBLIC ENDPOINTS
// ======================================================================

// 1. Browse Products (Filter by Category and Search query)
router.get('/products', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = "SELECT * FROM accessory_products WHERE status = 'enabled'";
    const params = [];

    if (category) {
      query += " AND category = ?";
      params.push(category);
    }
    if (search) {
      query += " AND (name LIKE ? OR brand LIKE ? OR description LIKE ?)";
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    query += " ORDER BY created_at DESC";
    const [rows] = await pool.query(query, params);
    res.json({ success: true, products: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 2. Product Details
router.get('/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM accessory_products WHERE id = ?", [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 3. Live Tracking Lookup (Public)
router.get('/track/:lookup', async (req, res) => {
  try {
    const lookup = req.params.lookup;
    
    // Find order by tracking number OR order ID
    const [orders] = await pool.query(
      `SELECT o.*, c.name as customer_name 
       FROM accessory_orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.tracking_number = ? OR o.id = ?`,
      [lookup, lookup]
    );

    if (!orders.length) {
      return res.status(404).json({ success: false, message: 'Order or tracking code not found' });
    }

    const order = orders[0];

    // Get order items
    const [items] = await pool.query(
      `SELECT oi.*, p.name as product_name, p.brand, p.image_url 
       FROM accessory_order_items oi
       JOIN accessory_products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [order.id]
    );

    // Get tracking timeline
    const [history] = await pool.query(
      "SELECT * FROM accessory_tracking_history WHERE order_id = ? ORDER BY created_at ASC",
      [order.id]
    );

    res.json({
      success: true,
      order: {
        id: order.id,
        tracking_number: order.tracking_number,
        total_amount: order.total_amount,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        order_status: order.order_status,
        shipping_address: order.shipping_address,
        estimated_delivery_date: order.estimated_delivery_date,
        created_at: order.created_at,
        customer_name: order.customer_name
      },
      items,
      history
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// ======================================================================
// CUSTOMER AUTHENTICATED ENDPOINTS
// ======================================================================

router.use(authenticateToken);

// 4. Fetch Cart
router.get('/cart', authorize('customer'), async (req, res) => {
  try {
    const customerId = req.user.id;
    const [rows] = await pool.query(
      `SELECT c.id, c.product_id, c.quantity, 
              p.name, p.brand, p.category, p.price, p.discount_price, p.image_url, p.stock
       FROM accessory_cart c
       JOIN accessory_products p ON c.product_id = p.id
       WHERE c.customer_id = ?`,
      [customerId]
    );
    res.json({ success: true, cart: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 5. Add to Cart / Update Quantity
router.post('/cart', authorize('customer'), async (req, res) => {
  try {
    const customerId = req.user.id;
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    // Verify stock
    const [products] = await pool.query("SELECT stock, status FROM accessory_products WHERE id = ?", [product_id]);
    if (!products.length || products[0].status === 'disabled') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const product = products[0];

    // Check if item already in cart
    const [existing] = await pool.query(
      "SELECT id, quantity FROM accessory_cart WHERE customer_id = ? AND product_id = ?",
      [customerId, product_id]
    );

    if (existing.length) {
      const newQty = existing[0].quantity + parseInt(quantity);
      if (newQty > product.stock) {
        return res.status(400).json({ success: false, message: `Only ${product.stock} items available in stock.` });
      }
      await pool.query(
        "UPDATE accessory_cart SET quantity = ? WHERE id = ?",
        [newQty, existing[0].id]
      );
    } else {
      if (quantity > product.stock) {
        return res.status(400).json({ success: false, message: `Only ${product.stock} items available in stock.` });
      }
      await pool.query(
        "INSERT INTO accessory_cart (customer_id, product_id, quantity) VALUES (?, ?, ?)",
        [customerId, product_id, quantity]
      );
    }

    res.json({ success: true, message: 'Item added to cart' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 6. Update Cart Item Quantity
router.put('/cart/:id', authorize('customer'), async (req, res) => {
  try {
    const customerId = req.user.id;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Invalid quantity' });
    }

    // Get product stock
    const [cartItem] = await pool.query(
      `SELECT c.id, c.product_id, p.stock 
       FROM accessory_cart c
       JOIN accessory_products p ON c.product_id = p.id
       WHERE c.id = ? AND c.customer_id = ?`,
      [req.params.id, customerId]
    );

    if (!cartItem.length) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    if (quantity > cartItem[0].stock) {
      return res.status(400).json({ success: false, message: `Only ${cartItem[0].stock} items available in stock.` });
    }

    await pool.query(
      "UPDATE accessory_cart SET quantity = ? WHERE id = ?",
      [quantity, req.params.id]
    );

    res.json({ success: true, message: 'Cart updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 7. Remove Cart Item
router.delete('/cart/:id', authorize('customer'), async (req, res) => {
  try {
    const customerId = req.user.id;
    const [result] = await pool.query(
      "DELETE FROM accessory_cart WHERE id = ? AND customer_id = ?",
      [req.params.id, customerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 8. Checkout Order
router.post('/checkout', authorize('customer'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const customerId = req.user.id;
    const { shipping_address, shipping_mobile, payment_method = 'manual' } = req.body;

    if (!shipping_address || !shipping_mobile) {
      return res.status(400).json({ success: false, message: 'Address and Mobile are required.' });
    }

    // Get cart items and product info
    const [cartItems] = await connection.query(
      `SELECT c.id, c.product_id, c.quantity, p.price, p.discount_price, p.stock, p.name
       FROM accessory_cart c
       JOIN accessory_products p ON c.product_id = p.id
       WHERE c.customer_id = ?`,
      [customerId]
    );

    if (!cartItems.length) {
      return res.status(400).json({ success: false, message: 'Your cart is empty' });
    }

    let totalAmount = 0;

    // Validate stock and count totals
    for (const item of cartItems) {
      if (item.quantity > item.stock) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: `Out of stock: ${item.name} has only ${item.stock} left.` });
      }
      const activePrice = item.discount_price !== null ? item.discount_price : item.price;
      totalAmount += parseFloat(activePrice) * item.quantity;
    }

    // Generate Unique Tracking Code
    const [[countRow]] = await connection.query("SELECT COUNT(*) as count FROM accessory_orders");
    const orderIndex = countRow.count + 1;
    const trackingNumber = `SRM-TRK-${String(orderIndex).padStart(6, '0')}`;

    // Estimated delivery (7 days from now)
    const estDelivery = new Date();
    estDelivery.setDate(estDelivery.getDate() + 7);

    // Create Order Record
    const [orderResult] = await connection.query(
      `INSERT INTO accessory_orders 
       (customer_id, tracking_number, total_amount, payment_method, payment_status, order_status, shipping_address, shipping_mobile, estimated_delivery_date) 
       VALUES (?, ?, ?, ?, ?, 'placed', ?, ?, ?)`,
      [customerId, trackingNumber, totalAmount, payment_method, 'completed', shipping_address, shipping_mobile, estDelivery]
    );

    const orderId = orderResult.insertId;

    // Create Order Items and Deduct Stock
    for (const item of cartItems) {
      const activePrice = item.discount_price !== null ? item.discount_price : item.price;
      
      // Insert item
      await connection.query(
        "INSERT INTO accessory_order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
        [orderId, item.product_id, item.quantity, activePrice]
      );

      // Deduct stock
      await connection.query(
        "UPDATE accessory_products SET stock = stock - ? WHERE id = ?",
        [item.quantity, item.product_id]
      );
    }

    // Insert Initial Tracking event
    await connection.query(
      "INSERT INTO accessory_tracking_history (order_id, status, notes) VALUES (?, 'placed', 'Order placed successfully and payment confirmed.')",
      [orderId]
    );

    // Insert Notification for Customer
    await connection.query(
      `INSERT INTO notifications (user_id, user_role, title, message, type) 
       VALUES (?, 'customer', 'Order Placed', ?, 'order_update')`,
      [customerId, `Your accessories order has been placed! Tracking number: ${trackingNumber}`]
    );

    // Clear cart
    await connection.query("DELETE FROM accessory_cart WHERE customer_id = ?", [customerId]);

    await connection.commit();
    res.json({ success: true, message: 'Order placed successfully', orderId, trackingNumber });

  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Checkout failed due to server error' });
  } finally {
    connection.release();
  }
});

// 9. Fetch Customer Orders
router.get('/orders', authorize('customer'), async (req, res) => {
  try {
    const customerId = req.user.id;
    
    const [orders] = await pool.query(
      `SELECT o.*, 
              (SELECT p.image_url FROM accessory_order_items oi 
               JOIN accessory_products p ON oi.product_id = p.id 
               WHERE oi.order_id = o.id LIMIT 1) as product_image,
              (SELECT p.name FROM accessory_order_items oi 
               JOIN accessory_products p ON oi.product_id = p.id 
               WHERE oi.order_id = o.id LIMIT 1) as product_name,
              (SELECT COUNT(*) FROM accessory_order_items WHERE order_id = o.id) as item_count
       FROM accessory_orders o
       WHERE o.customer_id = ?
       ORDER BY o.created_at DESC`,
      [customerId]
    );

    res.json({ success: true, orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// ======================================================================
// ADMIN / MASTER INVENTORY & ORDERS MANAGEMENT
// ======================================================================

router.use(authorize('admin', 'master'));

// 9.5 Upload product image
router.post('/admin/upload', uploadAccessory.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const fileUrl = `/uploads/accessories/${req.file.filename}`;
    res.json({ success: true, fileUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// 10. Fetch all Products (Inventory Mode)
router.get('/admin/products', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM accessory_products ORDER BY created_at DESC");
    res.json({ success: true, products: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 11. Create Product
router.post('/admin/products', async (req, res) => {
  try {
    const { name, brand, category, description, price, discount_price = null, stock = 0, status = 'enabled', image_url } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({ success: false, message: 'Name, Category, and Price are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO accessory_products 
       (name, brand, category, description, price, discount_price, stock, status, image_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, brand, category, description, price, discount_price || null, stock, status, image_url || null]
    );

    res.status(201).json({ success: true, message: 'Product added successfully', productId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 12. Edit Product
router.put('/admin/products/:id', async (req, res) => {
  try {
    const { name, brand, category, description, price, discount_price = null, stock = 0, status = 'enabled', image_url } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({ success: false, message: 'Name, Category, and Price are required' });
    }

    const [result] = await pool.query(
      `UPDATE accessory_products 
       SET name = ?, brand = ?, category = ?, description = ?, price = ?, discount_price = ?, stock = ?, status = ?, image_url = ? 
       WHERE id = ?`,
      [name, brand, category, description, price, discount_price || null, stock, status, image_url || null, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 13. Delete Product
router.delete('/admin/products/:id', async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM accessory_products WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 14. Fetch all Customer Orders (Admin View)
router.get('/admin/orders', async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, c.name as customer_name, c.mobile as customer_mobile
       FROM accessory_orders o
       JOIN customers c ON o.customer_id = c.id
       ORDER BY o.created_at DESC`
    );

    const result = [];
    for (const order of orders) {
      const [items] = await pool.query(
        `SELECT oi.*, p.name as product_name, p.brand 
         FROM accessory_order_items oi
         JOIN accessory_products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      result.push({ ...order, items });
    }

    res.json({ success: true, orders: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 15. Update Order Status (Live Tracking Control)
router.put('/admin/orders/:id/status', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const orderId = req.params.id;
    const { order_status, notes } = req.body;

    const validStatuses = ['placed', 'confirmed', 'packed', 'shipped', 'in_transit', 'local_hub', 'out_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(order_status)) {
      return res.status(400).json({ success: false, message: 'Invalid status phase.' });
    }

    // Get order details
    const [orders] = await connection.query(
      "SELECT customer_id, tracking_number FROM accessory_orders WHERE id = ?",
      [orderId]
    );

    if (!orders.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const { customer_id, tracking_number } = orders[0];

    // Update status in orders table
    await connection.query(
      "UPDATE accessory_orders SET order_status = ? WHERE id = ?",
      [order_status, orderId]
    );

    // Create history event entry
    const trackingNotes = notes || `Shipment status updated to ${order_status.replace('_', ' ')}.`;
    await connection.query(
      "INSERT INTO accessory_tracking_history (order_id, status, notes) VALUES (?, ?, ?)",
      [orderId, order_status, trackingNotes]
    );

    // Notify Customer (Format readable label)
    const readableStatus = order_status.charAt(0).toUpperCase() + order_status.slice(1).replace('_', ' ');
    await connection.query(
      `INSERT INTO notifications (user_id, user_role, title, message, type) 
       VALUES (?, 'customer', ?, ?, 'order_update')`,
      [
        customer_id, 
        `Order ${readableStatus}`, 
        `Your accessories order (${tracking_number}) has been updated to: ${readableStatus}.`
      ]
    );

    await connection.commit();

    if (order_status === 'delivered') {
      try {
        await creditCommission(req.user.id, req.user.role, 'accessories', orderId);
      } catch (commErr) {
        console.error('Error auto-crediting accessories commission:', commErr);
      }
    }

    res.json({ success: true, message: 'Order status updated successfully' });

  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error updating status' });
  } finally {
    connection.release();
  }
});

module.exports = router;
