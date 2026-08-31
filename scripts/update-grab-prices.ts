import mysql from "mysql2/promise";

// Grab prices from real CSV: [itemName, grabPriceHot, grabPriceCold]
// null = variant doesn't exist
const grabPrices: [string, number | null, number | null][] = [
  ["อเมริกาโน่",              65,  70],
  ["อเมริกาโน่น้ำผึ้ง",       75,  80],
  ["เอสเย็น",                  70,  75],
  ["ลาเต้",                    70,  75],
  ["คาปูชิโน่",               70,  75],
  ["มอคค่า",                  70,  75],
  ["วานิลลาคอฟฟี่",           70,  75],
  ["TIER Coffee",              null, 85],
  ["กาแฟส้ม",                 null, 105],
  ["อเมริกาโน่มะพร้าวสด",     null, 105],
  ["เพียวมัทฉะ",              null, 90],
  ["มัทฉะลาเต้",              105, 110],
  ["มัทฉะมะพร้าวสด",          null, 105],
  ["มัทฉะลาเต้สตรอว์เบอร์รี่", null, 135],
  ["มัทฉะส้ม",                null, 110],
  ["ชาเขียวลาเต้",            60,  65],
  ["ชาไทย",                   60,  65],
  ["ชามะนาว",                 null, 60],
  ["ชาดำเย็น",                null, 60],
  ["นมสด",                    55,  60],
  ["นมชมพู",                  55,  60],
  ["นมคาราเมล",               70,  75],
  ["นมน้ำผึ้ง",               70,  75],
  ["นมสตรอว์เบอร์รี่",        null, 90],
  ["โกโก้",                   55,  60],
  ["สตรอว์เบอร์รี่โซดา",      null, 65],
  ["น้ำผึ้งมะนาวโซดา",        null, 65],
  ["แดงโซดามะนาว",            null, 60],
];

// New items from Grab not in DB yet
// [name, catName, priceGrabHot, priceGrabCold, hasHot, hasCold]
const newItems = [
  // เมนูพิเศษ
  ["ชาไทยโกโก้",                 "เมนูพิเศษ", null, 75,  false, true],
  ["นมชมพูโกโก้",                "เมนูพิเศษ", null, 75,  false, true],
  ["มินต์ช็อก",                  "เมนูพิเศษ", null, 80,  false, true],
  ["เอสเพรสโซ่โทนิค",            "เมนูพิเศษ", null, 105, false, true],
  ["มัทฉะน้ำผึ้งมะนาว",          "มัทฉะ",     null, 95,  false, true],
  ["มัทฉะมะพร้าวลาเต้",          "มัทฉะ",     null, 125, false, true],
  ["มัทฉะลาเต้นูเทลล่า",         "เมนูพิเศษ", null, 139, false, true],
  ["นมสดสตรอว์เบอร์รี่มัทฉะ",   "เมนูพิเศษ", null, 135, false, true],
  // กาแฟ
  ["Coconut Latte",              "กาแฟ",      null, 105, false, true],
  ["กาแฟมะพร้าว",               "กาแฟ",      null, 105, false, true],
  // SET
  ["ดับเบิ้ลโน่",               "SET จับคู่", null, 125, false, true],
  ["ดับเบิ้ลชาเขียวอร่อยมาก",   "SET จับคู่", null, 125, false, true],
  ["โน่เย็นๆ+ชาเขียวอร่อยมาก",  "SET จับคู่", null, 125, false, true],
  ["ดับเบิ้ลชาไทย",             "SET จับคู่", null, 125, false, true],
] as [string, string, number|null, number, boolean, boolean][];

async function run() {
  const c = await mysql.createConnection(process.env.DATABASE_URL!);

  // 1. Update existing Grab prices
  let updated = 0;
  for (const [name, grabHot, grabCold] of grabPrices) {
    const [items] = await c.execute("SELECT id FROM items WHERE name=? LIMIT 1", [name]) as any;
    const itemId = items[0]?.id;
    if (!itemId) { console.log(`⚠️ ไม่พบ: ${name}`); continue; }

    if (grabHot !== null) {
      await c.execute(
        "UPDATE item_variants SET priceGrab=?, priceLineman=? WHERE itemId=? AND name='ร้อน'",
        [grabHot, grabHot, itemId]
      );
    }
    if (grabCold !== null) {
      await c.execute(
        "UPDATE item_variants SET priceGrab=?, priceLineman=? WHERE itemId=? AND name='เย็น'",
        [grabCold, grabCold, itemId]
      );
    }
    updated++;
  }
  console.log(`✅ อัปเดตราคา Grab ${updated} เมนู`);

  // 2. Add SET category
  await c.execute(`INSERT IGNORE INTO categories (name, sortOrder, isActive) VALUES ('SET จับคู่', 7, 1)`);

  // 3. Get category ids
  const [cats] = await c.execute("SELECT id, name FROM categories") as any;
  const catId: Record<string, number> = {};
  for (const cat of cats) catId[cat.name] = cat.id;

  // 4. Get modifier group ids
  const [mgs] = await c.execute("SELECT id, name FROM modifier_groups") as any;
  const mgId: Record<string, number> = {};
  for (const m of mgs) mgId[m.name] = m.id;

  // 5. Add new items
  let added = 0;
  for (const [name, cat, grabHot, grabCold, hasHot, hasCold] of newItems) {
    const cId = catId[cat];
    if (!cId) { console.log(`⚠️ ไม่พบหมวด: ${cat}`); continue; }

    await c.execute(
      "INSERT IGNORE INTO items (name, categoryId, sortOrder, isActive) VALUES (?,?,100,1)",
      [name, cId]
    );
    const [rows] = await c.execute("SELECT id FROM items WHERE name=? LIMIT 1", [name]) as any;
    const itemId = rows[0]?.id;
    if (!itemId) continue;

    // Walkin price = grab - 5 (estimate), but for SET keep same
    const isSet = cat === "SET จับคู่";
    if (hasHot && grabHot !== null) {
      const walkin = isSet ? grabHot : grabHot - 5;
      await c.execute(
        "INSERT IGNORE INTO item_variants (itemId,name,priceWalkin,priceGrab,priceLineman,sortOrder,isActive) VALUES (?,?,?,?,?,1,1)",
        [itemId, "ร้อน", walkin, grabHot, grabHot]
      );
    }
    if (hasCold) {
      const walkin = isSet ? grabCold : grabCold - 5;
      await c.execute(
        "INSERT IGNORE INTO item_variants (itemId,name,priceWalkin,priceGrab,priceLineman,sortOrder,isActive) VALUES (?,?,?,?,?,2,1)",
        [itemId, "เย็น", walkin, grabCold, grabCold]
      );
    }

    // Assign sweetness modifier
    if (mgId["ระดับความหวาน"]) {
      await c.execute(
        "INSERT IGNORE INTO item_modifier_groups (itemId, modifierGroupId) VALUES (?,?)",
        [itemId, mgId["ระดับความหวาน"]]
      );
    }
    added++;
  }
  console.log(`✅ เพิ่มเมนูใหม่ ${added} รายการ`);
  console.log("🎉 เสร็จแล้ว!");
  await c.end();
}

run().catch(e => { console.error(e); process.exit(1); });
