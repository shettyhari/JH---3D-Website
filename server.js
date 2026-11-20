import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '10mb' }));

// Cross-Origin Resource Sharing for dev
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// In-Memory / File-based Database Persistence
const DB_FILE = path.join(__dirname, 'store-db.json');

function readDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading DB file:', err);
  }
  return { products: [], orders: [] };
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving DB file:', err);
  }
}

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    store: 'Jhonty Hub 3D Luxury Studio',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 2. Orders API
app.get('/api/orders', (req, res) => {
  const db = readDb();
  res.json({ orders: db.orders || [] });
});

app.post('/api/orders', (req, res) => {
  const order = req.body;
  if (!order || !order.items || order.items.length === 0) {
    return res.status(400).json({ error: 'Order must contain items' });
  }

  const db = readDb();
  const newOrder = {
    ...order,
    id: order.id || `JH-ORD-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString(),
    status: order.status || 'processing',
  };

  db.orders = [newOrder, ...(db.orders || [])];
  writeDb(db);

  res.status(201).json({ success: true, order: newOrder });
});

// 3. Simulated Payment Gateway (Razorpay / UPI Integration)
app.post('/api/checkout/simulate-payment', (req, res) => {
  const { amountInr, email, items } = req.body;

  if (!amountInr || amountInr <= 0) {
    return res.status(400).json({ error: 'Invalid amount for payment' });
  }

  const paymentId = `pay_jh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const orderId = `order_jh_${Date.now()}`;

  res.json({
    success: true,
    paymentId,
    orderId,
    amount: amountInr,
    currency: 'INR',
    method: 'UPI / NetBanking',
    status: 'captured',
    receipt: `JH-REC-${Date.now().toString().slice(-6)}`,
    customer: { email },
    timestamp: new Date().toISOString(),
  });
});

// 4. Production Static File Serving
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`JH 3D Studio Server running on http://localhost:${PORT}`);
});
