import mysql from "mysql2/promise";

async function seed() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  console.log("🌱 Seeding Tier Coffee database...");

  // Sales Channels
  await connection.execute(`INSERT IGNORE INTO sales_channels (name, slug, isActive, sortOrder) VALUES
    ('หน้าร้าน','walkin',1,1),('Grab','grab',1,2),('LINE MAN','lineman',1,3)`);
  console.log("✅ Sales channels");

  // Store Settings (single-row table)
  await connection.execute(`INSERT IGNORE INTO store_settings (shopName, vatEnabled, vatRate, openTime, closeTime)
    VALUES ('Tier Coffee', false, 7.00, '07:00', '22:00')`);
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
    ['เอสเปรสโซ่ช็อต',           'กาแฟ', 45, 0,  true,  false],
    ['อเมริกาโน่',                'กาแฟ', 45, 50, true,  true ],
    ['อเมริกาโน่น้ำผึ้ง',         'กาแฟ', 50, 55, true,  true ],
    ['อเมริกาโน่น้ำผึ้งมะนาว',   'กาแฟ', 60, 65, true,  true ],
    ['เอสเย็น',                   'กาแฟ', 45, 50, true,  true ],
    ['ลาเต้',                     'กาแฟ', 45, 50, true,  true ],
    ['คาปูชิโน่',                 'กาแฟ', 45, 50, true,  true ],
    ['มอคค่า',                    'กาแฟ', 45, 50, true,  true ],
    ['คาราเมลมัคคิอาโต้',         'กาแฟ', 55, 60, true,  true ],
    // มัทฉะ
    ['เพียวมัทฉะ',                'มัทฉะ', 0, 65, false, true ],
    ['มัทฉะลาเต้',                'มัทฉะ', 0, 75, false, true ],
    ['มัทฉะมะพร้าวสด',           'มัทฉะ', 0, 75, false, true ],
    ['มัทฉะลาเต้สตรอว์เบอร์รี่', 'มัทฉะ', 0, 90, false, true ],
    ['มัทฉะส้ม',                  'มัทฉะ', 0, 75, false, true ],
    // ชา
    ['ชาเขียวลาเต้',              'ชา', 40, 45, true,  true ],
    ['ชาไทย',                     'ชา', 40, 45, true,  true ],
    ['ชามะนาว',                   'ชา',  0, 40, false, true ],
    ['ชาพีช',                     'ชา',  0, 45, false, true ],
    ['ชาเขียวน้ำผึ้งมะนาว',      'ชา',  0, 45, false, true ],
    ['ชาดำเย็น',                  'ชา',  0, 40, false, true ],
    // เมนูพิเศษ
    ['วานิลลาคอฟฟี่',             'เมนูพิเศษ', 45, 55, true,  true ],
    ['TIER Coffee',               'เมนูพิเศษ',  0, 70, false, true ],
    ['กาแฟส้ม',                   'เมนูพิเศษ',  0, 70, false, true ],
    ['กาแฟพีช',                   'เมนูพิเศษ',  0, 70, false, true ],
    ['อเมริกาโน่มะพร้าวดอกมะเขือ','เมนูพิเศษ', 0, 70, false, true ],
    ['ชาเขียวมะพร้าวดอกมะเขือ',  'เมนูพิเศษ',  0, 70, false, true ],
    ['ส้มยูซุแบล็คคอฟฟี่โซดา',   'เมนูพิเศษ',  0, 70, false, true ],
    ['อเมริกาโน่มะพร้าวสด',       'เมนูพิเศษ',  0, 70, false, true ],
    // นม
    ['นมสด',                      'นม', 35, 40, true,  true ],
    ['นมชมพู',                    'นม', 35, 40, true,  true ],
    ['นมคาราเมล',                 'นม', 45, 50, true,  true ],
    ['นมวานิลลา',                 'นม', 45, 50, true,  true ],
    ['นมน้ำผึ้ง',                 'นม', 40, 50, true,  true ],
    ['นมสตรอว์เบอร์รี่',          'นม',  0, 60, false, true ],
    ['โกโก้',                     'นม',  0, 50, false, true ],
    // อิตาเลียนโซดา
    ['สตรอว์เบอร์รี่โซดา',        'อิตาเลียนโซดา', 0, 45, false, true ],
    ['น้ำผึ้งมะนาวโซดา',          'อิตาเลียนโซดา', 0, 45, false, true ],
    ['แดงโซดามะนาว',              'อิตาเลียนโซดา', 0, 45, false, true ],
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
