import mysql from "mysql2/promise";

async function seed() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  console.log("🌱 Seeding Tier Coffee database...");

  // Sales Channels
  await connection.execute(`INSERT IGNORE INTO sales_channels (name, slug, isActive, sortOrder) VALUES
    ('หน้าร้าน','walkin',1,1),('Grab','grab',1,2),('LINE MAN','lineman',1,3)`);
  console.log("✅ Sales channels");

  // Store Settings
  await connection.execute(`INSERT IGNORE INTO store_settings (\`key\`,\`value\`) VALUES
    ('store_name','Tier Coffee'),('vat_enabled','false'),('vat_rate','7'),
    ('currency','THB'),('receipt_footer','ขอบคุณที่ใช้บริการ Tier Coffee')`);
  console.log("✅ Store settings");

  // Default branch
  await connection.execute(`INSERT IGNORE INTO branches (name, isActive) VALUES ('สาขาหลัก',1)`);

  // POS Users
  await connection.execute(`INSERT IGNORE INTO pos_users (name, pinCode, role, isActive) VALUES
    ('เจ้าของ','8080','admin',1),
    ('ผู้จัดการ','1234','manager',1),
    ('พนักงาน 1','0001','staff',1)`);
  console.log("✅ Users");

  // Categories
  await connection.execute(`INSERT IGNORE INTO categories (name, sortOrder, isActive) VALUES
    ('กาแฟ',1,1),('มัทฉะ',2,1),('ชา',3,1),('เมนูพิเศษ',4,1),
    ('นม',5,1),('อิตาเลียนโซดา',6,1)`);

  const [cats] = await connection.execute(`SELECT id, name FROM categories`) as any;
  const catId: Record<string,number> = {};
  for (const c of cats) catId[c.name] = c.id;
  console.log("✅ Categories");

  // Modifier Groups
  await connection.execute(`INSERT IGNORE INTO modifier_groups (name, isRequired, minSelect, maxSelect, sortOrder) VALUES
    ('ระดับความหวาน',0,0,1,1),('ท็อปปิ้ง',0,0,1,2),('ประเภทนม',0,0,1,3)`);
  const [mgs] = await connection.execute(`SELECT id, name FROM modifier_groups`) as any;
  const mgId: Record<string,number> = {};
  for (const m of mgs) mgId[m.name] = m.id;

  // Modifier Options
  await connection.execute(`INSERT IGNORE INTO modifier_options (modifierGroupId, name, priceAdd, isActive, sortOrder) VALUES
    (${mgId['ระดับความหวาน']},'หวาน 0%',0,1,1),
    (${mgId['ระดับความหวาน']},'หวาน 25%',0,1,2),
    (${mgId['ระดับความหวาน']},'หวาน 50%',0,1,3),
    (${mgId['ระดับความหวาน']},'หวาน 75%',0,1,4),
    (${mgId['ระดับความหวาน']},'หวาน 100%',0,1,5),
    (${mgId['ท็อปปิ้ง']},'Coffee Shot +1',20,1,1),
    (${mgId['ประเภทนม']},'Oat Milk (OAT SIDE)',15,1,1)`);
  console.log("✅ Modifier groups & options");

  // Items data: [name, catName, priceHotWalkin, priceColdWalkin, hasHot, hasCold]
  // Grab price = walkin + 5
  const items: [string, string, number, number, boolean, boolean][] = [
    // กาแฟ
    ['Espresso Shot',       'กาแฟ',   45, 0,  true,  false],
    ['Americano',           'กาแฟ',   45, 50, true,  true ],
    ['Americano Honey',     'กาแฟ',   50, 55, true,  true ],
    ['Americano Honey Lemon','กาแฟ',  60, 65, true,  true ],
    ['Es Yen',              'กาแฟ',   45, 50, true,  true ],
    ['Latte',               'กาแฟ',   45, 50, true,  true ],
    ['Cappuccino',          'กาแฟ',   45, 50, true,  true ],
    ['Mocha',               'กาแฟ',   45, 50, true,  true ],
    ['Caramel Macchiato',   'กาแฟ',   55, 60, true,  true ],
    // มัทฉะ
    ['Pure Matcha',         'มัทฉะ',  0,  65, false, true ],
    ['Matcha Latte',        'มัทฉะ',  0,  75, false, true ],
    ['Coconut Matcha',      'มัทฉะ',  0,  75, false, true ],
    ['Strawberry Matcha Latte','มัทฉะ',0, 90, false, true ],
    ['Orange Matcha',       'มัทฉะ',  0,  75, false, true ],
    // ชา
    ['Green Tea Latte',     'ชา',     40, 45, true,  true ],
    ['Thai Tea',            'ชา',     40, 45, true,  true ],
    ['Lemon Tea',           'ชา',     0,  40, false, true ],
    ['Peach Tea',           'ชา',     0,  45, false, true ],
    ['Green Tea Honey Lemon','ชา',    0,  45, false, true ],
    ['Black Tea',           'ชา',     0,  40, false, true ],
    // เมนูพิเศษ
    ['Vanilla Coffee',          'เมนูพิเศษ', 45, 55, true,  true ],
    ['TIER Coffee',             'เมนูพิเศษ', 0,  70, false, true ],
    ['Black Orange',            'เมนูพิเศษ', 0,  70, false, true ],
    ['Black Peach',             'เมนูพิเศษ', 0,  70, false, true ],
    ['Americano Coconut Bouquet','เมนูพิเศษ',0, 70, false, true ],
    ['Green Tea Coconut Bouquet','เมนูพิเศษ',0, 70, false, true ],
    ['Yusu Black Coffee Soda',  'เมนูพิเศษ', 0,  70, false, true ],
    ['Coconut Americano',       'เมนูพิเศษ', 0,  70, false, true ],
    // นม
    ['Milk',            'นม', 35, 40, true,  true ],
    ['Pink Milk',       'นม', 35, 40, true,  true ],
    ['Caramel Milk',    'นม', 45, 50, true,  true ],
    ['Vanilla Milk',    'นม', 45, 50, true,  true ],
    ['Honey Milk',      'นม', 40, 50, true,  true ],
    ['Strawberry Milk', 'นม', 0,  60, false, true ],
    ['Coco',            'นม', 0,  50, false, true ],
    // อิตาเลียนโซดา
    ['Strawberry Soda',    'อิตาเลียนโซดา', 0, 45, false, true ],
    ['Honey Lemon Soda',   'อิตาเลียนโซดา', 0, 45, false, true ],
    ['Dang Soda',          'อิตาเลียนโซดา', 0, 45, false, true ],
  ];

  for (let i = 0; i < items.length; i++) {
    const [name, cat, hotPrice, coldPrice, hasHot, hasCold] = items[i];
    const cId = catId[cat];
    if (!cId) { console.warn(`⚠️ Category not found: ${cat}`); continue; }

    await connection.execute(
      `INSERT IGNORE INTO items (name, categoryId, sortOrder, isActive) VALUES (?,?,?,1)`,
      [name, cId, i + 1]
    );
    const [rows] = await connection.execute(`SELECT id FROM items WHERE name=? LIMIT 1`, [name]) as any;
    const itemId = rows[0]?.id;
    if (!itemId) continue;

    let variantSort = 1;
    if (hasHot && hotPrice > 0) {
      await connection.execute(
        `INSERT IGNORE INTO item_variants (itemId,name,priceWalkin,priceGrab,priceLineman,sortOrder,isActive) VALUES (?,?,?,?,?,?,1)`,
        [itemId, 'ร้อน', hotPrice, hotPrice + 5, hotPrice + 5, variantSort++]
      );
    }
    if (hasCold && coldPrice > 0) {
      await connection.execute(
        `INSERT IGNORE INTO item_variants (itemId,name,priceWalkin,priceGrab,priceLineman,sortOrder,isActive) VALUES (?,?,?,?,?,?,1)`,
        [itemId, 'เย็น', coldPrice, coldPrice + 5, coldPrice + 5, variantSort++]
      );
    }

    // Assign sweetness modifier to all items
    await connection.execute(
      `INSERT IGNORE INTO item_modifier_groups (itemId, modifierGroupId) VALUES (?,?)`,
      [itemId, mgId['ระดับความหวาน']]
    );
    // Assign topping modifier to all items
    await connection.execute(
      `INSERT IGNORE INTO item_modifier_groups (itemId, modifierGroupId) VALUES (?,?)`,
      [itemId, mgId['ท็อปปิ้ง']]
    );
    // Assign milk type to coffee & matcha items
    if (cat === 'กาแฟ' || cat === 'มัทฉะ' || cat === 'ชา') {
      await connection.execute(
        `INSERT IGNORE INTO item_modifier_groups (itemId, modifierGroupId) VALUES (?,?)`,
        [itemId, mgId['ประเภทนม']]
      );
    }
  }

  console.log("✅ Items & variants");
  console.log("🎉 Seed complete! Tier Coffee is ready.");
  await connection.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
