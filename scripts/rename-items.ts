import mysql from "mysql2/promise";

const names: [string, string][] = [
  ["เอสเปรสโซ่ช็อต", "Espresso Shot"],
  ["อเมริกาโน่", "Americano"],
  ["อเมริกาโน่น้ำผึ้ง", "Americano Honey"],
  ["อเมริกาโน่น้ำผึ้งมะนาว", "Americano Honey Lemon"],
  ["เอสเย็น", "Es Yen"],
  ["ลาเต้", "Latte"],
  ["คาปูชิโน่", "Cappuccino"],
  ["มอคค่า", "Mocha"],
  ["คาราเมลมัคคิอาโต้", "Caramel Macchiato"],
  ["เพียวมัทฉะ", "Pure Matcha"],
  ["มัทฉะลาเต้", "Matcha Latte"],
  ["มัทฉะมะพร้าวสด", "Coconut Matcha"],
  ["มัทฉะลาเต้สตรอว์เบอร์รี่", "Strawberry Matcha Latte"],
  ["มัทฉะส้ม", "Orange Matcha"],
  ["ชาเขียวลาเต้", "Green Tea Latte"],
  ["ชาไทย", "Thai Tea"],
  ["ชามะนาว", "Lemon Tea"],
  ["ชาพีช", "Peach Tea"],
  ["ชาเขียวน้ำผึ้งมะนาว", "Green Tea Honey Lemon"],
  ["ชาดำเย็น", "Black Tea"],
  ["วานิลลาคอฟฟี่", "Vanilla Coffee"],
  ["กาแฟส้ม", "Black Orange"],
  ["กาแฟพีช", "Black Peach"],
  ["อเมริกาโน่มะพร้าวดอกมะเขือ", "Americano Coconut Bouquet"],
  ["ชาเขียวมะพร้าวดอกมะเขือ", "Green Tea Coconut Bouquet"],
  ["ส้มยูซุแบล็คคอฟฟี่โซดา", "Yusu Black Coffee Soda"],
  ["อเมริกาโน่มะพร้าวสด", "Coconut Americano"],
  ["นมสด", "Milk"],
  ["นมชมพู", "Pink Milk"],
  ["นมคาราเมล", "Caramel Milk"],
  ["นมวานิลลา", "Vanilla Milk"],
  ["นมน้ำผึ้ง", "Honey Milk"],
  ["นมสตรอว์เบอร์รี่", "Strawberry Milk"],
  ["โกโก้", "Coco"],
  ["สตรอว์เบอร์รี่โซดา", "Strawberry Soda"],
  ["น้ำผึ้งมะนาวโซดา", "Honey Lemon Soda"],
  ["แดงโซดามะนาว", "Dang Soda"],
];

async function renameItems() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  let count = 0;
  for (const [th, en] of names) {
    const [result] = await connection.execute(
      "UPDATE items SET name=? WHERE name=?",
      [th, en]
    ) as any;
    if (result.affectedRows > 0) count++;
  }
  console.log(`✅ Updated ${count} items to Thai names`);
  await connection.end();
}

renameItems().catch(e => { console.error(e); process.exit(1); });
