const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(bodyParser.json());

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'uploads');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS menu (id INTEGER PRIMARY KEY, name TEXT, price REAL, description TEXT, category TEXT, image TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS tables (id INTEGER PRIMARY KEY, floor INTEGER, number INTEGER, status TEXT, order_id INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, table_id INTEGER, floor INTEGER, items TEXT, total REAL, type TEXT, status TEXT DEFAULT 'pending', time TEXT DEFAULT CURRENT_TIMESTAMP, date TEXT DEFAULT (date('now')), payment_method TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY, order_id INTEGER, type TEXT, isTakeaway BOOLEAN)`);
  db.run(`CREATE TABLE IF NOT EXISTS cashflow (id INTEGER PRIMARY KEY, amount REAL, type TEXT, time TEXT DEFAULT CURRENT_TIMESTAMP, date TEXT DEFAULT (date('now')))`);
  db.run(`CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT)`);

  // Verify and migrate orders table to include payment_method
  db.all(`PRAGMA table_info(orders)`, (err, rows) => {
    if (err) {
      console.error('Error checking table schema:', err);
      return;
    }
    const hasPaymentMethod = rows.some(row => row.name === 'payment_method');
    if (!hasPaymentMethod) {
      console.log('Migrating orders table to add payment_method column...');
      // Attempt to add column
      db.run(`ALTER TABLE orders ADD COLUMN payment_method TEXT`, (err) => {
        if (err) {
          console.error('ALTER TABLE failed, performing full migration:', err);
          // Fallback: Create a new table, copy data, and replace
          db.serialize(() => {
            db.run(`CREATE TABLE orders_temp AS SELECT id, table_id, floor, items, total, type, status, time, date FROM orders`);
            db.run(`DROP TABLE orders`);
            db.run(`CREATE TABLE orders (id INTEGER PRIMARY KEY, table_id INTEGER, floor INTEGER, items TEXT, total REAL, type TEXT, status TEXT DEFAULT 'pending', time TEXT DEFAULT CURRENT_TIMESTAMP, date TEXT DEFAULT (date('now')), payment_method TEXT)`);
            db.run(`INSERT INTO orders (id, table_id, floor, items, total, type, status, time, date) SELECT id, table_id, floor, items, total, type, status, time, date FROM orders_temp`);
            db.run(`DROP TABLE orders_temp`);
            console.log('Orders table migration completed.');
          });
        } else {
          console.log('payment_method column added successfully.');
        }
      });
    }
  });

  db.run(`INSERT OR IGNORE INTO admin (username, password, role) VALUES (?, ?, ?)`, ['admin', 'admin123', 'admin']);
  db.run(`INSERT OR IGNORE INTO admin (username, password, role) VALUES (?, ?, ?)`, ['blackspicy1', 'blackspicy1234', 'chief']);
  db.run(`INSERT OR IGNORE INTO admin (username, password, role) VALUES (?, ?, ?)`, ['waiter1', 'waiter123', 'waiter']);
  db.run(`INSERT OR IGNORE INTO tables (floor, number, status) VALUES (?, ?, ?)`, [1, 1, 'free']);
  db.run(`INSERT OR IGNORE INTO tables (floor, number, status) VALUES (?, ?, ?)`, [1, 2, 'free']);
});

// Payment endpoint to update order with payment method and free table
app.post('/api/orders/pay/:id', (req, res) => {
  const { id } = req.params;
  const { paymentMethod, tableId } = req.body;
  if (!paymentMethod || !tableId) {
    console.error('Missing paymentMethod or tableId:', req.body);
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  db.run(`UPDATE orders SET payment_method = ?, status = 'resolved' WHERE id = ?`, [paymentMethod, id], (err) => {
    if (err) {
      console.error('Database error updating order:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
    db.run(`UPDATE tables SET status = 'free', order_id = NULL WHERE id = ?`, [tableId], (err) => {
      if (err) {
        console.error('Database error updating table:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
      io.emit('resolve-order');
      res.json({ success: true });
    });
  });
});

app.get('/api/menu', (req, res) => {
  db.all(`SELECT * FROM menu`, [], (err, rows) => res.json(rows || []));
});

app.post('/api/menu/add', upload.single('image'), (req, res) => {
  const { name, price, description, category } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;
  db.run(`INSERT INTO menu (name, price, description, category, image) VALUES (?, ?, ?, ?, ?)`, [name, price, description, category, image], function (err) {
    if (err) {
      res.status(500).json({ success: false, error: err.message });
      return;
    }
    res.json({ id: this.lastID, name, price, description, category, image });
  });
});

app.delete('/api/menu/:id', (req, res) => {
  db.run(`DELETE FROM menu WHERE id = ?`, [req.params.id], (err) => {
    res.json({ success: !err });
  });
});

app.get('/api/tables', (req, res) => {
  db.all(`SELECT * FROM tables`, [], (err, rows) => res.json(rows || []));
});

app.post('/api/tables/add', (req, res) => {
  const { floor } = req.body;
  db.get(`SELECT MAX(number) as maxNum FROM tables WHERE floor = ?`, [floor], (err, row) => {
    const number = (row && row.maxNum) ? row.maxNum + 1 : 1;
    db.run(`INSERT INTO tables (floor, number, status) VALUES (?, ?, 'free')`, [floor, number], function (err) {
      if (err) {
        res.status(500).json({ success: false, error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    });
  });
});

app.delete('/api/tables/:id', (req, res) => {
  db.run(`DELETE FROM tables WHERE id = ?`, [req.params.id], (err) => {
    res.json({ success: !err });
  });
});

app.post('/api/tables/:id', (req, res) => {
  const { status } = req.body;
  db.run(`UPDATE tables SET status = ? WHERE id = ?`, [status, req.params.id], (err) => {
    res.json({ success: !err });
  });
});

app.post('/api/orders', (req, res) => {
  const { table_id, items, total, type } = req.body;
  db.get(`SELECT floor FROM tables WHERE id = ?`, [table_id], (err, row) => {
    const floor = row ? row.floor : null;
    db.run(`INSERT INTO orders (table_id, floor, items, total, type) VALUES (?, ?, ?, ?, ?)`, [table_id || null, floor, JSON.stringify(items || []), total || 0, type], function (err) {
      if (err) {
        res.status(500).json({ success: false, error: err.message });
        return;
      }
      const orderId = this.lastID;
      if (table_id) {
        db.run(`UPDATE tables SET status = 'booked', order_id = ? WHERE id = ?`, [orderId, table_id], (err) => {
          if (err) console.error(err);
        });
      }
      db.run(`INSERT INTO notifications (order_id, type, isTakeaway) VALUES (?, 'new', ?)`, [orderId, type === 'takeaway' ? 1 : 0], (err) => {
        if (err) console.error(err);
      });
      io.emit('new-order');
      res.json({ success: true });
    });
  });
});

app.get('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  db.get(`SELECT * FROM orders WHERE id = ?`, [id], (err, row) => {
    res.json(row || { items: '[]', total: 0, type: 'N/A', floor: 'N/A', table_id: 'N/A', time: new Date().toLocaleTimeString() });
  });
});

app.get('/api/orders', (req, res) => {
  db.all(`SELECT * FROM orders WHERE status = 'resolved'`, [], (err, rows) => res.json(rows || []));
});

app.get('/api/orders/recent', (req, res) => {
  db.all(`SELECT * FROM orders WHERE date = date('now') AND status = 'resolved'`, [], (err, rows) => res.json(rows || []));
});

app.get('/api/orders/today', (req, res) => {
  db.all(`SELECT * FROM orders WHERE date = date('now') AND status = 'pending'`, [], (err, rows) => res.json(rows || []));
});

app.get('/api/notifications', (req, res) => {
  db.all(`SELECT notifications.id AS notif_id, orders.* FROM notifications JOIN orders ON notifications.order_id = orders.id`, [], (err, rows) => res.json(rows || []));
});

app.post('/api/orders/resolve/:id', (req, res) => {
  db.run(`UPDATE orders SET status = 'resolved' WHERE id = ?`, [req.params.id], (err) => {
    if (err) {
      res.status(500).json({ success: false, error: err.message });
      return;
    }
    db.get(`SELECT table_id FROM orders WHERE id = ?`, [req.params.id], (err, row) => {
      if (row && row.table_id) {
        db.run(`UPDATE tables SET status = 'free', order_id = NULL WHERE id = ?`, [row.table_id], (err) => {
          if (err) console.error(err);
        });
      }
      db.run(`UPDATE notifications SET type = 'resolved' WHERE order_id = ?`, [req.params.id], (err) => {
        if (err) console.error(err);
      });
      io.emit('resolve-order');
      res.json({ success: true });
    });
  });
});

app.post('/api/cashflow', (req, res) => {
  const { amount, type } = req.body;
  db.run(`INSERT INTO cashflow (amount, type) VALUES (?, ?)`, [amount || 0, type], (err) => {
    res.json({ success: !err });
  });
});

app.get('/api/cashflow', (req, res) => {
  db.get(`SELECT SUM(amount) as todayIncome FROM cashflow WHERE date = date('now')`, [], (err, today) => {
    db.get(`SELECT COUNT(*) as ordersCount FROM cashflow WHERE date = date('now')`, [], (err, count) => {
      db.get(`SELECT SUM(amount) as dineInAmount FROM cashflow WHERE date = date('now') AND type = 'dine-in'`, [], (err, dineIn) => {
        db.get(`SELECT SUM(amount) as takeawayAmount FROM cashflow WHERE date = date('now') AND type = 'takeaway'`, [], (err, takeaway) => {
          db.get(`SELECT SUM(amount) as monthlyIncome FROM cashflow WHERE date >= date('now', 'start of month')`, [], (err, monthly) => {
            db.get(`SELECT SUM(amount) as yesterdayIncome FROM cashflow WHERE date = date('now', '-1 day')`, [], (err, yesterday) => {
              res.json({
                todayIncome: today?.todayIncome || 0,
                ordersCount: count?.ordersCount || 0,
                dineInAmount: dineIn?.dineInAmount || 0,
                takeawayAmount: takeaway?.takeawayAmount || 0,
                monthlyIncome: monthly?.monthlyIncome || 0,
                yesterdayIncome: yesterday?.yesterdayIncome || 0
              });
            });
          });
        });
      });
    });
  });
});

app.post('/api/admin/login', (req, res) => {
  const { username, role } = req.body;
  // Simplified login: Accept any username and role without password check
  if (username && role) {
    res.json({ success: true, message: 'Login successful', role: role });
  } else {
    res.status(401).json({ success: false, message: 'Username and role are required' });
  }
});

server.listen(5000, '0.0.0.0', () => console.log('Backend on http://0.0.0.0:5000'));