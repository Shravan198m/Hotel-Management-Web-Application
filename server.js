import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// DB Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'hotel_mgmt',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Health
app.get('/api/ping', (req, res) => res.send('pong'));

/* ----------------------- ROOMS ----------------------- */
app.get('/api/rooms', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM rooms ORDER BY room_number');
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'DB error' }); }
});

app.get('/api/rooms/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM rooms WHERE room_id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Room not found' });
    res.json(rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'DB error' }); }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const { room_number, type, price, status, description } = req.body;
    const [result] = await pool.query(
      'INSERT INTO rooms (room_number, type, price, status, description) VALUES (?, ?, ?, ?, ?)',
      [room_number, type, price, status || 'available', description || null]
    );
    const [rows] = await pool.query('SELECT * FROM rooms WHERE room_id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'DB error' }); }
});

app.put('/api/rooms/:id', async (req, res) => {
  try {
    const { room_number, type, price, status, description } = req.body;
    await pool.query(
      'UPDATE rooms SET room_number=?, type=?, price=?, status=?, description=? WHERE room_id=?',
      [room_number, type, price, status, description, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM rooms WHERE room_id=?', [req.params.id]);
    res.json(rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'DB error' }); }
});

app.delete('/api/rooms/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM rooms WHERE room_id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'DB error' }); }
});

/* --------------------- CUSTOMERS --------------------- */
app.get('/api/customers', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'DB error' }); }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { name, email, phone, city } = req.body;
    if (email) {
      const [exist] = await pool.query('SELECT * FROM customers WHERE email=?', [email]);
      if (exist.length) return res.json(exist[0]);
    }
    const [result] = await pool.query(
      'INSERT INTO customers (name, email, phone, city) VALUES (?, ?, ?, ?)',
      [name, email || null, phone || null, city || null]
    );
    const [rows] = await pool.query('SELECT * FROM customers WHERE customer_id=?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'DB error' }); }
});

/* ---------------------- BOOKINGS --------------------- */
// Availability check helper
async function isRoomAvailable(room_id, check_in, check_out, ignoreBookingId = null) {
  const params = [room_id, check_out, check_in];
  let sql = `
    SELECT 1 FROM bookings
    WHERE room_id = ?
      AND status <> 'cancelled'
      AND NOT (check_out <= ? OR check_in >= ?)
  `;
  if (ignoreBookingId) {
    sql += ' AND booking_id <> ?';
    params.push(ignoreBookingId);
  }
  const [rows] = await pool.query(sql, params);
  return rows.length === 0;
}

app.get('/api/bookings', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.*, c.name AS customer_name, r.room_number, r.type AS room_type
      FROM bookings b
      JOIN customers c ON b.customer_id = c.customer_id
      JOIN rooms r ON b.room_id = r.room_id
      ORDER BY b.created_at DESC
    `);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'DB error' }); }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { customer_id, room_id, check_in, check_out, total_amount } = req.body;

    if (!(await isRoomAvailable(room_id, check_in, check_out))) {
      return res.status(400).json({ error: 'Room is not available for those dates' });
    }

    const [result] = await pool.query(
      `INSERT INTO bookings (customer_id, room_id, check_in, check_out, total_amount, status)
       VALUES (?, ?, ?, ?, ?, 'booked')`,
      [customer_id, room_id, check_in, check_out, total_amount]
    );

    // fetch joined booking
    const [rows] = await pool.query(`
      SELECT b.*, c.name AS customer_name, r.room_number, r.type AS room_type
      FROM bookings b
      JOIN customers c ON b.customer_id = c.customer_id
      JOIN rooms r ON b.room_id = r.room_id
      WHERE b.booking_id = ?
    `, [result.insertId]);

    res.status(201).json(rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'DB error' }); }
});

app.put('/api/bookings/:id/status', async (req, res) => {
  try {
    const { status } = req.body; // 'booked','checked_in','checked_out','cancelled'
    await pool.query('UPDATE bookings SET status=? WHERE booking_id=?', [status, req.params.id]);

    // sync room status
    const [[booking]] = await pool.query('SELECT * FROM bookings WHERE booking_id=?', [req.params.id]);
    if (booking) {
      if (status === 'checked_in') {
        await pool.query('UPDATE rooms SET status=? WHERE room_id=?', ['occupied', booking.room_id]);
      } else if (status === 'checked_out' || status === 'cancelled') {
        await pool.query('UPDATE rooms SET status=? WHERE room_id=?', ['available', booking.room_id]);
      }
    }

    const [[updated]] = await pool.query('SELECT * FROM bookings WHERE booking_id=?', [req.params.id]);
    res.json(updated);
  } catch (e) { console.error(e); res.status(500).json({ error: 'DB error' }); }
});

/* --------------- Payments (optional CRUD) --------------- */
app.get('/api/payments/:bookingId', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM payments WHERE booking_id=?', [req.params.bookingId]);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'DB error' }); }
});

app.post('/api/payments', async (req, res) => {
  try {
    const { booking_id, amount, method, payment_date } = req.body;
    const [result] = await pool.query(
      'INSERT INTO payments (booking_id, amount, method, payment_date) VALUES (?, ?, ?, ?)',
      [booking_id, amount, method, payment_date]
    );
    const [[row]] = await pool.query('SELECT * FROM payments WHERE payment_id=?', [result.insertId]);
    res.status(201).json(row);
  } catch (e) { console.error(e); res.status(500).json({ error: 'DB error' }); }
});

/* ----------------------- START ----------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
