import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const ADMIN_PASSCODE = (process.env.ADMIN_PASSCODE || '').trim();
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.resolve(DATA_DIR, 'pos-store.json');
const PHP_DIR = path.resolve(process.cwd(), 'php-xampp');

interface EmployeeRecord {
  id: number;
  username: string;
  fullName: string;
  passwordHash: string;
  role: 'admin' | 'kasir';
  isActive: boolean;
  createdAt: string;
}

interface ProductRecord {
  id: number;
  sku: string;
  name: string;
  category: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  updatedAt: string;
}

interface TransactionItemRecord {
  productId: number;
  sku: string;
  productName: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

interface TransactionRecord {
  id: number;
  invoiceNo: string;
  userId: number;
  cashierName: string;
  paymentMethod: 'cash' | 'qris';
  subtotal: number;
  discount: number;
  totalAmount: number;
  cashPaid: number;
  changeAmount: number;
  qrisRef: string | null;
  items: TransactionItemRecord[];
  createdAt: string;
}

interface StoreData {
  nextIds: {
    user: number;
    product: number;
    transaction: number;
  };
  users: EmployeeRecord[];
  products: ProductRecord[];
  transactions: TransactionRecord[];
}

interface AuthenticatedUser {
  id: number;
  username: string;
  fullName: string;
  role: 'admin' | 'kasir';
}

interface AuthedRequest extends Request {
  user?: AuthenticatedUser;
}

function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createInitialStore(): StoreData {
  const now = new Date();
  const today = getLocalDateString(now);
  const ts1 = `${today}T08:42:15.000Z`;
  const ts2 = `${today}T10:18:40.000Z`;
  const ts3 = `${today}T13:05:11.000Z`;

  return {
    nextIds: { user: 1, product: 11, transaction: 4 },
    users: [],
    products: [
      { id: 1, sku: 'BRG-001', name: 'Kopi Susu Gula Aren 250ml', category: 'Minuman', buyPrice: 11000, sellPrice: 18000, stock: 28, minStock: 8, unit: 'botol', updatedAt: now.toISOString() },
      { id: 2, sku: 'BRG-002', name: 'Teh Melati Dingin 350ml', category: 'Minuman', buyPrice: 4500, sellPrice: 8000, stock: 42, minStock: 10, unit: 'botol', updatedAt: now.toISOString() },
      { id: 3, sku: 'BRG-003', name: 'Air Mineral 600ml', category: 'Minuman', buyPrice: 2200, sellPrice: 4000, stock: 65, minStock: 15, unit: 'botol', updatedAt: now.toISOString() },
      { id: 4, sku: 'BRG-004', name: 'Roti Bakar Cokelat Keju', category: 'Makanan', buyPrice: 9500, sellPrice: 15000, stock: 4, minStock: 6, unit: 'porsi', updatedAt: now.toISOString() },
      { id: 5, sku: 'BRG-005', name: 'Croissant Mentega Klasik', category: 'Makanan', buyPrice: 12000, sellPrice: 20000, stock: 14, minStock: 5, unit: 'pcs', updatedAt: now.toISOString() },
      { id: 6, sku: 'BRG-006', name: 'Keripik Singkong Balado 150g', category: 'Snack', buyPrice: 7500, sellPrice: 12500, stock: 3, minStock: 8, unit: 'bungkus', updatedAt: now.toISOString() },
      { id: 7, sku: 'BRG-007', name: 'Biskuit Gandum Cokelat', category: 'Snack', buyPrice: 6000, sellPrice: 10000, stock: 20, minStock: 6, unit: 'pack', updatedAt: now.toISOString() },
      { id: 8, sku: 'BRG-008', name: 'Beras Pandan Wangi 5kg', category: 'Sembako', buyPrice: 64000, sellPrice: 74500, stock: 9, minStock: 4, unit: 'karung', updatedAt: now.toISOString() },
      { id: 9, sku: 'BRG-009', name: 'Minyak Goreng Pouch 1L', category: 'Sembako', buyPrice: 15500, sellPrice: 19000, stock: 18, minStock: 6, unit: 'pouch', updatedAt: now.toISOString() },
      { id: 10, sku: 'BRG-010', name: 'Gula Pasir Kristal 1kg', category: 'Sembako', buyPrice: 14000, sellPrice: 17500, stock: 2, minStock: 5, unit: 'pack', updatedAt: now.toISOString() },
    ],
    transactions: [
      {
        id: 1,
        invoiceNo: `INV-${today.replace(/-/g, '')}-A104F2`,
        userId: 1,
        cashierName: 'Rina Wijaya',
        paymentMethod: 'cash',
        subtotal: 44000,
        discount: 0,
        totalAmount: 44000,
        cashPaid: 50000,
        changeAmount: 6000,
        qrisRef: null,
        items: [
          { productId: 1, sku: 'BRG-001', productName: 'Kopi Susu Gula Aren 250ml', qty: 2, unitPrice: 18000, subtotal: 36000 },
          { productId: 2, sku: 'BRG-002', productName: 'Teh Melati Dingin 350ml', qty: 1, unitPrice: 8000, subtotal: 8000 },
        ],
        createdAt: ts1,
      },
      {
        id: 2,
        invoiceNo: `INV-${today.replace(/-/g, '')}-B782C9`,
        userId: 1,
        cashierName: 'Rina Wijaya',
        paymentMethod: 'qris',
        subtotal: 93500,
        discount: 0,
        totalAmount: 93500,
        cashPaid: 93500,
        changeAmount: 0,
        qrisRef: 'QRIS-882419AD',
        items: [
          { productId: 8, sku: 'BRG-008', productName: 'Beras Pandan Wangi 5kg', qty: 1, unitPrice: 74500, subtotal: 74500 },
          { productId: 9, sku: 'BRG-009', productName: 'Minyak Goreng Pouch 1L', qty: 1, unitPrice: 19000, subtotal: 19000 },
        ],
        createdAt: ts2,
      },
      {
        id: 3,
        invoiceNo: `INV-${today.replace(/-/g, '')}-C319E0`,
        userId: 1,
        cashierName: 'Rina Wijaya',
        paymentMethod: 'qris',
        subtotal: 35000,
        discount: 0,
        totalAmount: 35000,
        cashPaid: 35000,
        changeAmount: 0,
        qrisRef: 'QRIS-419022EF',
        items: [
          { productId: 4, sku: 'BRG-004', productName: 'Roti Bakar Cokelat Keju', qty: 1, unitPrice: 15000, subtotal: 15000 },
          { productId: 5, sku: 'BRG-005', productName: 'Croissant Mentega Klasik', qty: 1, unitPrice: 20000, subtotal: 20000 },
        ],
        createdAt: ts3,
      },
    ],
  };
}

function readStore(): StoreData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial = createInitialStore();
    writeStore(initial);
    return initial;
  }
  const raw = fs.readFileSync(STORE_PATH, 'utf-8');
  return JSON.parse(raw) as StoreData;
}

function writeStore(store: StoreData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf-8');
  fs.renameSync(tmpPath, STORE_PATH);
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

function verifyPasscodeConstantTime(input: string, secret: string): boolean {
  const h1 = crypto.createHash('sha256').update(input).digest();
  const h2 = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(h1, h2);
}

function signToken(user: AuthenticatedUser): string {
  const payload = {
    uid: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    exp: Date.now() + 8 * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): AuthenticatedUser | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as {
      uid: number;
      username: string;
      fullName: string;
      role: 'admin' | 'kasir';
      exp: number;
    };
    if (!payload.exp || Date.now() > payload.exp) return null;
    if (payload.uid === 0 && ADMIN_PASSCODE) {
      return { id: 0, username: payload.username, fullName: payload.fullName, role: 'admin' };
    }
    const store = readStore();
    const found = store.users.find((u) => u.id === payload.uid && u.isActive);
    if (!found) return null;
    return { id: found.id, username: found.username, fullName: found.fullName, role: found.role };
  } catch {
    return null;
  }
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sesi login karyawan diperlukan.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: 'Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.' });
    return;
  }
  req.user = user;
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Akses khusus Admin/Supervisor toko.' });
    return;
  }
  next();
}

function collectPhpFiles(dir: string, baseDir: string): Array<{ path: string; content: string }> {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: Array<{ path: string; content: string }> = [];
  for (const entry of entries) {
    const resolved = path.resolve(dir, entry.name);
    if (!resolved.startsWith(baseDir + path.sep)) continue;
    if (entry.isDirectory()) {
      results.push(...collectPhpFiles(resolved, baseDir));
    } else if (entry.isFile()) {
      const rel = path.relative(baseDir, resolved).replace(/\\/g, '/');
      results.push({ path: rel, content: fs.readFileSync(resolved, 'utf-8') });
    }
  }
  return results.sort((a, b) => a.path.localeCompare(b.path));
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Auth status (determines if first-run employee activation is needed)
  app.get('/api/auth/status', (_req, res) => {
    const store = readStore();
    res.json({
      needsSetup: store.users.length === 0 && !ADMIN_PASSCODE,
      hasEnvAdmin: Boolean(ADMIN_PASSCODE),
    });
  });

  // One-time bootstrap route for claiming the first Admin/Supervisor employee account
  app.post('/api/auth/setup', (req, res) => {
    const store = readStore();
    if (store.users.length > 0 || ADMIN_PASSCODE) {
      res.status(403).json({ error: 'Akun karyawan awal sudah terdaftar.' });
      return;
    }

    const username = String(req.body?.username || '').trim();
    const fullName = String(req.body?.fullName || '').trim();
    const password = String(req.body?.password || '');

    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) {
      res.status(400).json({ error: 'Username harus 3–30 karakter (huruf, angka, titik, atau garis bawah).' });
      return;
    }
    if (fullName.length < 2 || fullName.length > 80) {
      res.status(400).json({ error: 'Nama lengkap minimal 2 karakter.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
      return;
    }

    const newUser: EmployeeRecord = {
      id: store.nextIds.user++,
      username,
      fullName,
      passwordHash: hashPassword(password),
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    store.users.push(newUser);
    writeStore(store);

    const authUser: AuthenticatedUser = {
      id: newUser.id,
      username: newUser.username,
      fullName: newUser.fullName,
      role: newUser.role,
    };
    res.status(201).json({ token: signToken(authUser), user: authUser });
  });

  // Employee Login
  app.post('/api/auth/login', (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    if (!username || !password) {
      res.status(400).json({ error: 'Username dan kata sandi wajib diisi.' });
      return;
    }

    if (ADMIN_PASSCODE && username === 'admin' && verifyPasscodeConstantTime(password, ADMIN_PASSCODE)) {
      const authUser: AuthenticatedUser = {
        id: 0,
        username: 'admin',
        fullName: 'Supervisor Toko',
        role: 'admin',
      };
      res.json({ token: signToken(authUser), user: authUser });
      return;
    }

    const store = readStore();
    const user = store.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Username atau kata sandi karyawan salah, atau akun dinonaktifkan.' });
      return;
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    };
    res.json({ token: signToken(authUser), user: authUser });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: req.user });
  });

  // Employees management (Admin only)
  app.get('/api/employees', requireAuth, requireAdmin, (_req, res) => {
    const store = readStore();
    res.json({
      employees: store.users.map(({ passwordHash: _ignored, ...safe }) => safe),
    });
  });

  app.post('/api/employees', requireAuth, requireAdmin, (req, res) => {
    const username = String(req.body?.username || '').trim();
    const fullName = String(req.body?.fullName || '').trim();
    const password = String(req.body?.password || '');
    const role = req.body?.role === 'admin' ? 'admin' : 'kasir';

    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) {
      res.status(400).json({ error: 'Username harus 3–30 karakter.' });
      return;
    }
    if (fullName.length < 2) {
      res.status(400).json({ error: 'Nama lengkap minimal 2 karakter.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
      return;
    }

    const store = readStore();
    if (store.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      res.status(409).json({ error: 'Username karyawan sudah dipakai.' });
      return;
    }

    const created: EmployeeRecord = {
      id: store.nextIds.user++,
      username,
      fullName,
      passwordHash: hashPassword(password),
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    store.users.push(created);
    writeStore(store);

    const { passwordHash: _ignored, ...safe } = created;
    res.status(201).json({ employee: safe });
  });

  app.patch('/api/employees/:id', requireAuth, requireAdmin, (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (req.user?.id === id) {
      res.status(400).json({ error: 'Tidak dapat menonaktifkan akun yang sedang dipakai login.' });
      return;
    }
    const store = readStore();
    const target = store.users.find((u) => u.id === id);
    if (!target) {
      res.status(404).json({ error: 'Karyawan tidak ditemukan.' });
      return;
    }
    if (typeof req.body?.isActive === 'boolean') {
      target.isActive = req.body.isActive;
    }
    if (req.body?.role === 'admin' || req.body?.role === 'kasir') {
      target.role = req.body.role;
    }
    writeStore(store);
    const { passwordHash: _ignored, ...safe } = target;
    res.json({ employee: safe });
  });

  // Products & Stock Management
  app.get('/api/products', requireAuth, (_req, res) => {
    const store = readStore();
    const products = [...store.products].sort((a, b) => a.name.localeCompare(b.name, 'id'));
    const lowStockItems = products.filter((p) => p.stock <= p.minStock);
    res.json({ products, lowStockItems });
  });

  app.post('/api/products', requireAuth, (req, res) => {
    const sku = String(req.body?.sku || '').trim().toUpperCase();
    const name = String(req.body?.name || '').trim();
    const category = String(req.body?.category || 'Umum').trim() || 'Umum';
    const unit = String(req.body?.unit || 'pcs').trim() || 'pcs';
    const buyPrice = Number(req.body?.buyPrice);
    const sellPrice = Number(req.body?.sellPrice);
    const stock = Math.floor(Number(req.body?.stock));
    const minStock = Math.floor(Number(req.body?.minStock ?? 5));

    if (!sku || !name || !Number.isFinite(sellPrice) || sellPrice < 0 || !Number.isFinite(stock) || stock < 0) {
      res.status(400).json({ error: 'Lengkapi SKU, nama barang, harga jual, dan jumlah stok dengan benar.' });
      return;
    }

    const store = readStore();
    if (store.products.some((p) => p.sku.toLowerCase() === sku.toLowerCase())) {
      res.status(409).json({ error: `Kode SKU ${sku} sudah terdaftar.` });
      return;
    }

    const created: ProductRecord = {
      id: store.nextIds.product++,
      sku,
      name,
      category,
      buyPrice: Number.isFinite(buyPrice) && buyPrice >= 0 ? buyPrice : 0,
      sellPrice,
      stock,
      minStock: Number.isFinite(minStock) && minStock >= 0 ? minStock : 5,
      unit,
      updatedAt: new Date().toISOString(),
    };
    store.products.push(created);
    writeStore(store);
    res.status(201).json({ product: created });
  });

  app.patch('/api/products/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const store = readStore();
    const product = store.products.find((p) => p.id === id);
    if (!product) {
      res.status(404).json({ error: 'Barang tidak ditemukan.' });
      return;
    }

    if (typeof req.body?.name === 'string' && req.body.name.trim()) {
      product.name = req.body.name.trim();
    }
    if (typeof req.body?.category === 'string' && req.body.category.trim()) {
      product.category = req.body.category.trim();
    }
    if (typeof req.body?.unit === 'string' && req.body.unit.trim()) {
      product.unit = req.body.unit.trim();
    }
    if (req.body?.buyPrice !== undefined && Number.isFinite(Number(req.body.buyPrice))) {
      product.buyPrice = Math.max(0, Number(req.body.buyPrice));
    }
    if (req.body?.sellPrice !== undefined && Number.isFinite(Number(req.body.sellPrice))) {
      product.sellPrice = Math.max(0, Number(req.body.sellPrice));
    }
    if (req.body?.stock !== undefined && Number.isFinite(Number(req.body.stock))) {
      product.stock = Math.max(0, Math.floor(Number(req.body.stock)));
    }
    if (req.body?.minStock !== undefined && Number.isFinite(Number(req.body.minStock))) {
      product.minStock = Math.max(0, Math.floor(Number(req.body.minStock)));
    }
    product.updatedAt = new Date().toISOString();

    writeStore(store);
    res.json({ product });
  });

  app.delete('/api/products/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const store = readStore();
    const index = store.products.findIndex((p) => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Barang tidak ditemukan.' });
      return;
    }
    store.products.splice(index, 1);
    writeStore(store);
    res.json({ ok: true });
  });

  // Checkout / Sales Transaction (Cash & QRIS)
  app.post('/api/transactions', requireAuth, (req: AuthedRequest, res) => {
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const paymentMethod = req.body?.paymentMethod === 'qris' ? 'qris' : 'cash';
    const discount = Math.max(0, Number(req.body?.discount || 0));
    const cashPaid = Math.max(0, Number(req.body?.cashPaid || 0));

    if (rawItems.length === 0) {
      res.status(400).json({ error: 'Keranjang belanja masih kosong.' });
      return;
    }

    const store = readStore();
    const resolvedItems: TransactionItemRecord[] = [];
    const stockDeductions: Array<{ product: ProductRecord; nextStock: number }> = [];
    let subtotal = 0;

    for (const row of rawItems) {
      const productId = Number(row?.productId);
      const qty = Math.floor(Number(row?.qty));
      if (!Number.isFinite(productId) || !Number.isFinite(qty) || qty <= 0) {
        res.status(400).json({ error: 'Jumlah barang tidak valid.' });
        return;
      }
      const product = store.products.find((p) => p.id === productId);
      if (!product) {
        res.status(404).json({ error: 'Salah satu barang tidak ditemukan di katalog.' });
        return;
      }
      if (product.stock < qty) {
        res.status(400).json({ error: `Stok "${product.name}" tidak mencukupi (tersisa ${product.stock} ${product.unit}).` });
        return;
      }
      const lineTotal = product.sellPrice * qty;
      subtotal += lineTotal;
      resolvedItems.push({
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        qty,
        unitPrice: product.sellPrice,
        subtotal: lineTotal,
      });
      stockDeductions.push({ product, nextStock: product.stock - qty });
    }

    const totalAmount = Math.max(0, subtotal - discount);
    if (paymentMethod === 'cash' && cashPaid < totalAmount) {
      res.status(400).json({ error: 'Uang tunai yang diterima kurang dari total tagihan.' });
      return;
    }

    const now = new Date();
    const datePrefix = getLocalDateString(now).replace(/-/g, '');
    const randSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const invoiceNo = `INV-${datePrefix}-${randSuffix}`;
    const qrisRef = paymentMethod === 'qris' ? `QRIS-${crypto.randomBytes(4).toString('hex').toUpperCase()}` : null;

    const lowStockWarnings: Array<{ id: number; name: string; stock: number; minStock: number; unit: string }> = [];
    for (const { product, nextStock } of stockDeductions) {
      product.stock = nextStock;
      product.updatedAt = now.toISOString();
      if (nextStock <= product.minStock) {
        lowStockWarnings.push({
          id: product.id,
          name: product.name,
          stock: nextStock,
          minStock: product.minStock,
          unit: product.unit,
        });
      }
    }

    const transaction: TransactionRecord = {
      id: store.nextIds.transaction++,
      invoiceNo,
      userId: req.user?.id ?? 0,
      cashierName: req.user?.fullName || 'Karyawan',
      paymentMethod,
      subtotal,
      discount,
      totalAmount,
      cashPaid: paymentMethod === 'cash' ? cashPaid : totalAmount,
      changeAmount: paymentMethod === 'cash' ? cashPaid - totalAmount : 0,
      qrisRef,
      items: resolvedItems,
      createdAt: now.toISOString(),
    };

    store.transactions.unshift(transaction);
    writeStore(store);

    res.status(201).json({ transaction, lowStockWarnings });
  });

  // Daily Sales Report
  app.get('/api/reports/daily', requireAuth, (req, res) => {
    const rawDate = String(req.query.date || getLocalDateString());
    const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : getLocalDateString();

    const store = readStore();
    const dailyTransactions = store.transactions.filter((t) => {
      const trxDate = t.createdAt.slice(0, 10);
      return trxDate === date;
    });

    let totalRevenue = 0;
    let cashTotal = 0;
    let qrisTotal = 0;
    let itemsSold = 0;
    const productStats = new Map<string, { sku: string; name: string; qty: number; revenue: number }>();

    for (const trx of dailyTransactions) {
      totalRevenue += trx.totalAmount;
      if (trx.paymentMethod === 'cash') {
        cashTotal += trx.totalAmount;
      } else {
        qrisTotal += trx.totalAmount;
      }
      for (const item of trx.items) {
        itemsSold += item.qty;
        const existing = productStats.get(item.sku) || {
          sku: item.sku,
          name: item.productName,
          qty: 0,
          revenue: 0,
        };
        existing.qty += item.qty;
        existing.revenue += item.subtotal;
        productStats.set(item.sku, existing);
      }
    }

    const topProducts = Array.from(productStats.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);

    res.json({
      date,
      summary: {
        totalRevenue,
        transactionCount: dailyTransactions.length,
        cashTotal,
        qrisTotal,
        itemsSold,
      },
      topProducts,
      transactions: dailyTransactions,
    });
  });

  // Serve PHP + MySQL (phpMyAdmin XAMPP) source files for inspection & ZIP download
  app.get('/api/php-bundle', requireAuth, (_req, res) => {
    const files = collectPhpFiles(PHP_DIR, PHP_DIR);
    res.json({ files });
  });

  // Vite / Static Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KasirKita POS server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
