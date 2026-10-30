import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

// Initialize SQLite database file in a data directory
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'stock_maintenance.db');
export const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    -- Users Table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'staff')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Categories Table
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Suppliers Table
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      contact_person TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Products Table
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      description TEXT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      unit_price REAL NOT NULL CHECK(unit_price >= 0),
      cost_price REAL NOT NULL DEFAULT 0 CHECK(cost_price >= 0),
      available_quantity INTEGER NOT NULL DEFAULT 0 CHECK(available_quantity >= 0),
      minimum_stock_level INTEGER NOT NULL DEFAULT 10 CHECK(minimum_stock_level >= 0),
      unit_of_measure TEXT NOT NULL DEFAULT 'pcs',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Stock Movements Table
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      movement_type TEXT NOT NULL CHECK(movement_type IN ('IN', 'OUT')),
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      unit_price REAL,
      reference_number TEXT,
      reason TEXT,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Purchase Orders Table
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
      order_date TEXT NOT NULL,
      expected_delivery_date TEXT,
      total_amount REAL NOT NULL DEFAULT 0 CHECK(total_amount >= 0),
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')),
      notes TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Purchase Order Line Items Table
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      unit_price REAL NOT NULL CHECK(unit_price >= 0),
      total_price REAL NOT NULL CHECK(total_price >= 0),
      received_quantity INTEGER NOT NULL DEFAULT 0 CHECK(received_quantity >= 0)
    );

    -- Indexes for high-performance searches and joins
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_movements_date ON stock_movements(date);
    CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
    CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id);
  `);

  seedInitialData();
}

function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    return; // Already seeded
  }

  console.log('Seeding initial stock maintenance database records...');

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  const adminPass = bcrypt.hashSync('Admin@123', 10);
  const managerPass = bcrypt.hashSync('Manager@123', 10);
  const staffPass = bcrypt.hashSync('Staff@123', 10);

  const adminUser = insertUser.run('Eleanor Vance (Admin)', 'admin@stockmaster.com', adminPass, 'admin', 'active');
  const managerUser = insertUser.run('Marcus Brody (Manager)', 'manager@stockmaster.com', managerPass, 'manager', 'active');
  insertUser.run('Sarah Jenkins (Staff)', 'staff@stockmaster.com', staffPass, 'staff', 'active');

  const insertCat = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
  const catElec = insertCat.run('Electronics & Sensors', 'Microcontrollers, sensors, industrial displays, and wiring').lastInsertRowid;
  const catTools = insertCat.run('Industrial Tools', 'Pneumatics, calibration gauges, handheld tools, and drill bits').lastInsertRowid;
  const catOffice = insertCat.run('Office & IT Hardware', 'Printers, toner cartridges, networking cables, and accessories').lastInsertRowid;
  const catPack = insertCat.run('Packaging & Shipping', 'Corrugated boxes, bubble wrap, thermal labels, and tape').lastInsertRowid;
  const catSafety = insertCat.run('Safety Equipment (PPE)', 'Hard hats, nitrile gloves, safety goggles, and respirators').lastInsertRowid;

  const insertSupp = db.prepare(`
    INSERT INTO suppliers (company_name, contact_person, email, phone, address, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const sup1 = insertSupp.run('Apex Micro Technologies', 'David Miller', 'dmiller@apexmicro.com', '+1 (555) 234-5678', '1420 Silicon Ave, San Jose, CA', 'active').lastInsertRowid;
  const sup2 = insertSupp.run('Vanguard Industrial Supply', 'Rachel Green', 'sales@vanguardindustrial.com', '+1 (555) 876-5432', '800 Industrial Pkwy, Cleveland, OH', 'active').lastInsertRowid;
  const sup3 = insertSupp.run('Summit Pack & Logix', 'Ken Tanaka', 'ken@summitpack.com', '+1 (555) 432-1098', '55 Harbor Blvd, Seattle, WA', 'active').lastInsertRowid;
  const sup4 = insertSupp.run('Guardian Safety Corp', 'Maria Garcia', 'm.garcia@guardiansafety.com', '+1 (555) 987-6543', '320 Highland Way, Austin, TX', 'active').lastInsertRowid;

  const insertProd = db.prepare(`
    INSERT INTO products (name, sku, description, category_id, supplier_id, unit_price, cost_price, available_quantity, minimum_stock_level, unit_of_measure, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Products with varying stock levels: healthy, low-stock, and out-of-stock
  const p1 = insertProd.run('Optical Temperature Sensor XT-90', 'ELEC-SENS-001', 'High precision digital IR temperature sensor', catElec, sup1, 48.50, 28.00, 85, 20, 'pcs', 'active').lastInsertRowid;
  const p2 = insertProd.run('Microcontroller Dev Board Pro', 'ELEC-MCU-002', 'ARM Cortex-M4 development board with Wi-Fi & BLE', catElec, sup1, 32.00, 18.50, 42, 15, 'pcs', 'active').lastInsertRowid;
  const p3 = insertProd.run('Industrial Digital Caliper 150mm', 'TOOL-CAL-101', 'Stainless steel water-resistant digital vernier caliper', catTools, sup2, 65.00, 38.00, 8, 12, 'pcs', 'active').lastInsertRowid; // LOW STOCK
  const p4 = insertProd.run('Heavy Duty Pneumatic Impact Wrench', 'TOOL-PNEU-102', '1/2 inch drive air impact wrench 850 ft-lbs torque', catTools, sup2, 189.00, 115.00, 4, 10, 'pcs', 'active').lastInsertRowid; // LOW STOCK
  const p5 = insertProd.run('Cat6 Shielded Ethernet Cable 100m', 'IT-NET-201', 'Pure copper FTP 550MHz spool with snagless boots', catOffice, sup1, 74.00, 45.00, 26, 10, 'pcs', 'active').lastInsertRowid;
  const p6 = insertProd.run('Enterprise Wireless Access Point', 'IT-NET-202', 'Dual-band Wi-Fi 6 Gigabit access point PoE', catOffice, sup1, 249.00, 160.00, 18, 5, 'pcs', 'active').lastInsertRowid;
  const p7 = insertProd.run('Double-Wall Shipping Box 16x12x12', 'PACK-BOX-301', 'Heavy duty corrugated packaging box bundle of 25', catPack, sup3, 42.00, 22.00, 120, 30, 'bundle', 'active').lastInsertRowid;
  const p8 = insertProd.run('Direct Thermal Shipping Labels 4x6', 'PACK-LBL-302', 'Roll of 500 permanent adhesive perforated labels', catPack, sup3, 14.50, 7.20, 5, 25, 'rolls', 'active').lastInsertRowid; // LOW STOCK
  const p9 = insertProd.run('Heavy Duty Nitrile Gloves (Box of 100)', 'SAFE-GLV-401', '8 mil thick chemical and puncture resistant gloves', catSafety, sup4, 21.00, 11.50, 0, 15, 'box', 'active').lastInsertRowid; // OUT OF STOCK
  const p10 = insertProd.run('Anti-Fog Polycarbonate Safety Goggles', 'SAFE-GGL-402', 'ANSI Z87.1 certified splash and impact protection', catSafety, sup4, 12.50, 6.00, 64, 20, 'pcs', 'active').lastInsertRowid;
  const p11 = insertProd.run('High Visibility Reflective Vest Class 2', 'SAFE-VST-403', 'ANSI certified breathable safety vest with pockets', catSafety, sup4, 18.00, 9.20, 35, 15, 'pcs', 'active').lastInsertRowid;
  const p12 = insertProd.run('Brushless Cordless Hammer Drill 20V', 'TOOL-DRL-103', 'Variable speed industrial hammer drill with 2 batteries', catTools, sup2, 159.00, 95.00, 0, 8, 'set', 'active').lastInsertRowid; // OUT OF STOCK

  // Seed sample initial stock movements
  const insertMove = db.prepare(`
    INSERT INTO stock_movements (product_id, movement_type, quantity, unit_price, reference_number, reason, supplier_id, user_id, date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = new Date().toISOString().split('T')[0];
  const dateAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  insertMove.run(p1, 'IN', 100, 28.00, 'PO-2026-001', 'Initial Stock Receipt', sup1, adminUser.lastInsertRowid, dateAgo(15), 'Batch #9923 verified and approved');
  insertMove.run(p1, 'OUT', 15, 48.50, 'SO-4401', 'Client Hardware Assembly', null, managerUser.lastInsertRowid, dateAgo(5), 'Dispatched for Project Falcon');
  insertMove.run(p3, 'IN', 20, 38.00, 'PO-2026-002', 'Restock Order', sup2, adminUser.lastInsertRowid, dateAgo(12), 'Standard inspection passed');
  insertMove.run(p3, 'OUT', 12, 65.00, 'SO-4412', 'Internal Workshop Allocation', null, managerUser.lastInsertRowid, dateAgo(3), 'Calibrations department tooling upgrade');
  insertMove.run(p7, 'IN', 150, 22.00, 'PO-2026-003', 'Bulk Packaging Delivery', sup3, adminUser.lastInsertRowid, dateAgo(10), 'Warehouse bay 4 received');
  insertMove.run(p7, 'OUT', 30, 42.00, 'SO-4428', 'Fulfillment Center Dispatch', null, managerUser.lastInsertRowid, dateAgo(2), 'Weekly order packing usage');
  insertMove.run(p8, 'IN', 50, 7.20, 'PO-2026-004', 'Supplier Shipment', sup3, adminUser.lastInsertRowid, dateAgo(8), 'Thermal label restocking');
  insertMove.run(p8, 'OUT', 45, 14.50, 'SO-4439', 'Label printer reload', null, managerUser.lastInsertRowid, dateAgo(1), 'High dispatch volume consumption');

  // Seed Purchase Orders (various statuses)
  const insertPO = db.prepare(`
    INSERT INTO purchase_orders (order_number, supplier_id, order_date, expected_delivery_date, total_amount, status, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPOItem = db.prepare(`
    INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price, total_price, received_quantity)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // PO 1: DRAFT
  const po1 = insertPO.run('PO-2026-101', sup4, today, dateAgo(-7), 575.00, 'DRAFT', 'Upcoming restock for safety equipment', managerUser.lastInsertRowid).lastInsertRowid;
  insertPOItem.run(po1, p9, 50, 11.50, 575.00, 0);

  // PO 2: ORDERED
  const po2 = insertPO.run('PO-2026-102', sup2, dateAgo(4), dateAgo(-3), 950.00, 'ORDERED', 'Expedited replenishment for cordless drills', adminUser.lastInsertRowid).lastInsertRowid;
  insertPOItem.run(po2, p12, 10, 95.00, 950.00, 0);

  // PO 3: PARTIALLY_RECEIVED
  const po3 = insertPO.run('PO-2026-103', sup3, dateAgo(6), dateAgo(-1), 1080.00, 'PARTIALLY_RECEIVED', 'Split shipment expected by carrier', adminUser.lastInsertRowid).lastInsertRowid;
  insertPOItem.run(po3, p7, 40, 22.00, 880.00, 20); // 20 received of 40
  insertPOItem.run(po3, p8, 25, 7.20, 180.00, 10); // 10 received of 25

  // PO 4: RECEIVED
  const po4 = insertPO.run('PO-2026-104', sup1, dateAgo(14), dateAgo(8), 1400.00, 'RECEIVED', 'All items checked and staged in warehouse', managerUser.lastInsertRowid).lastInsertRowid;
  insertPOItem.run(po4, p1, 50, 28.00, 1400.00, 50);

  console.log('Database initialized and successfully seeded with realistic stock records.');
}
