import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

async function seed() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);

  console.log("🌱 Seeding database...");

  // Sales Channels
  await connection.execute(`
    INSERT IGNORE INTO sales_channels (name, slug, isActive, sortOrder) VALUES
    ('หน้าร้าน', 'walkin', 1, 1),
    ('Grab', 'grab', 1, 2),
    ('LINE MAN', 'lineman', 1, 3)
  `);
  console.log("✅ Sales channels");

  // Store Settings
  await connection.execute(`
    INSERT IGNORE INTO store_settings (\`key\`, \`value\`) VALUES
    ('store_name', 'Tier Coffee'),
    ('vat_enabled', 'false'),
    ('vat_rate', '7'),
    ('currency', 'THB'),
    ('receipt_footer', 'ขอบคุณที่ใช้บริการ')
  `);
  console.log("✅ Store settings");

  // Categories
  await connection.execute(`
    INSERT IGNORE INTO categories (name, sortOrder, isActive) VALUES
    ('กาแฟ', 1, 1),
    ('ชา', 2, 1),
    ('นม', 3, 1),
    ('มัทฉะ', 4, 1),
    ('เครื่องดื่มอื่นๆ', 5, 1)
  `);
  console.log("✅ Categories");

  // Get category IDs
  const [cats] = await connection.execute(`SELECT id, name FROM categories ORDER BY sortOrder`) as any;
  const catMap: Record<string, number> = {};
  for (const c of cats) catMap[c.name] = c.id;

  // Items
  const items = [
    { name: 'อเมริกาโน่', catName: 'กาแฟ', walkin: 45, grab: 50 },
    { name: 'ลาเต้', catName: 'กาแฟ', walkin: 55, grab: 60 },
    { name: 'คาปูชิโน่', catName: 'กาแฟ', walkin: 55, grab: 60 },
    { name: 'เอสเพรสโซ่', catName: 'กาแฟ', walkin: 40, grab: 45 },
    { name: 'ชาไทย', catName: 'ชา', walkin: 40, grab: 45 },
    { name: 'ชาเขียว', catName: 'ชา', walkin: 40, grab: 45 },
    { name: 'นม', catName: 'นม', walkin: 35, grab: 40 },
    { name: 'นมชมพู', catName: 'นม', walkin: 40, grab: 45 },
    { name: 'มัทฉะลาเต้', catName: 'มัทฉะ', walkin: 70, grab: 75 },
    { name: 'มัทฉะน้ำ', catName: 'มัทฉะ', walkin: 55, grab: 60 },
  ];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const catId = catMap[item.catName];
    if (!catId) continue;
    await connection.execute(
      `INSERT IGNORE INTO items (name, categoryId, sortOrder, isActive) VALUES (?, ?, ?, 1)`,
      [item.name, catId, i + 1]
    );
    const [rows] = await connection.execute(`SELECT id FROM items WHERE name=? LIMIT 1`, [item.name]) as any;
    const itemId = rows[0]?.id;
    if (!itemId) continue;
    // Variants: เย็น, ร้อน
    await connection.execute(
      `INSERT IGNORE INTO item_variants (itemId, name, priceWalkin, priceGrab, priceLineman, sortOrder, isActive) VALUES
       (?, 'เย็น', ?, ?, ?, 1, 1),
       (?, 'ร้อน', ?, ?, ?, 2, 1)`,
      [itemId, item.walkin, item.grab, item.grab, itemId, item.walkin - 5, item.grab - 5, item.grab - 5]
    );
  }
  console.log("✅ Items & variants");

  // Default branch
  await connection.execute(`
    INSERT IGNORE INTO branches (name, isActive) VALUES ('สาขาหลัก', 1)
  `);
  console.log("✅ Default branch");

  console.log("🎉 Seed complete!");
  await connection.end();
}

seed().catch(console.error);
