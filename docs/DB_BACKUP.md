# Backup ฐานข้อมูลอัตโนมัติ

แพลน Hobby ของ Railway สร้าง backup ของ volume ไม่ได้ (เฉพาะแพลน Pro) โปรเจกต์นี้จึงใช้ GitHub Actions ที่ `.github/workflows/db-backup.yml` รัน `mysqldump` ทุกวันเวลา **03:00 น. (เวลาไทย)** แล้วเก็บไฟล์เป็น artifact ของ GitHub ไว้ **30 วัน**

> repo นี้เป็น public ใครก็ตามที่ล็อกอิน GitHub ดาวน์โหลด artifact ได้ ไฟล์ backup จึง**เข้ารหัสด้วย AES-256 (GPG)** ทุกครั้ง คนที่ไม่มีรหัส `BACKUP_PASSPHRASE` จะเปิดไฟล์ไม่ได้

## ตั้งค่าครั้งแรก

| ขั้นตอน | ที่ไหน | ทำอะไร |
|---|---|---|
| 1 | Railway → MySQL → Settings → Networking | กด **Add Public Access** Railway จะสร้างตัวแปร `MYSQL_PUBLIC_URL` ให้ |
| 2 | Railway → MySQL → Variables | คัดลอกค่า `MYSQL_PUBLIC_URL` |
| 3 | GitHub → Settings → Secrets and variables → Actions | เพิ่ม secret `MYSQL_PUBLIC_URL` ใส่ค่าจากข้อ 2 |
| 4 | ที่เดียวกัน | เพิ่ม secret `BACKUP_PASSPHRASE` ใส่รหัสยาวๆ ที่เดายาก (เช่นได้จาก `openssl rand -base64 32`) |
| 5 | ตัวจัดการรหัสผ่าน | **เก็บ `BACKUP_PASSPHRASE` ไว้ที่อื่นด้วย** เพราะ GitHub ไม่ให้ดูค่า secret ย้อนหลัง ถ้ารหัสหาย backup ทุกไฟล์จะเปิดไม่ได้ |
| 6 | GitHub → Actions → Database Backup | กด **Run workflow** เพื่อทดสอบรอบแรก |

แอปยังต่อ DB ผ่าน private network (`MYSQL_URL`) เหมือนเดิม ส่วน public URL ใช้แค่ตอน backup ค่า egress จึงน้อยมาก

## กู้คืนข้อมูล

1. เปิด GitHub → Actions → Database Backup → เลือกรอบที่ต้องการ → ดาวน์โหลด artifact (ได้ไฟล์ `.zip`)
2. ถอดรหัสและแตกไฟล์ (บน Mac ติดตั้ง GPG ก่อนด้วย `brew install gnupg`)

   ```bash
   unzip tier-pos-db-*.zip
   gpg --decrypt tier-pos-db-*.sql.gz.gpg | gunzip > restore.sql
   ```

3. **ตรวจไฟล์ก่อน import** ไฟล์นี้จะ `DROP TABLE` แล้วสร้างตารางใหม่ ข้อมูลที่เกิดหลังเวลา backup จะหายหมด

   ```bash
   tail -n 1 restore.sql   # ต้องขึ้นว่า "-- Dump completed on ..."
   ```

4. Import กลับเข้า Railway

   ```bash
   mysql -h <host> -P <port> -u root -p railway < restore.sql
   ```

   ค่า host / port / รหัสผ่านดูได้จาก `MYSQL_PUBLIC_URL` (`mysql://root:<รหัส>@<host>:<port>/railway`)

5. ลบ `restore.sql` ทิ้งเมื่อเสร็จ เพราะเป็นข้อมูลร้านที่ไม่ได้เข้ารหัส

## ปรับแต่ง

- **เปลี่ยนเวลา:** แก้ `cron` ใน workflow (เป็นเวลา UTC ให้ลบ 7 ชั่วโมงจากเวลาไทย)
- **เก็บนานขึ้น:** แก้ `retention-days` (repo public ตั้งได้สูงสุด 90)
- **อัปเกรด MySQL บน Railway:** แก้ `MYSQL_IMAGE` ให้เวอร์ชันตรงกัน
