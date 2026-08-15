# Claude ผ่าน Pull Request

เอกสารนี้กำหนดวิธีใช้ Claude อย่างปลอดภัยกับ Tier Coffee POS ผ่าน Pull Request (PR) โดยไม่ให้ Claude แก้ `main` โดยตรง และใช้ GitHub Actions ตรวจ TypeScript กับ Vitest ก่อน merge

## สิ่งที่ workflow ทำ

ไฟล์ `.github/workflows/claude.yml` จะทำงานเฉพาะเมื่อ **เจ้าของรีโพซิทอรี** หรือ **ผู้ร่วมพัฒนา (collaborator)** พิมพ์ `@claude` ในความเห็นของ PR เท่านั้น จึงไม่เกิดค่าใช้จ่ายหรือการแก้โค้ดจากการเปิด PR ตามปกติ และผู้ใช้ภายนอกไม่สามารถเรียก workflow นี้ได้

เมื่อถูกเรียก Claude จะทำงานในบริบทของ PR ปัจจุบัน สามารถตอบคำถามหรือเสนอ/แก้ไขโค้ดตามคำสั่งของผู้ดูแลได้ แต่ workflow กำหนดไม่ให้ merge PR, เปลี่ยน GitHub Actions, เปลี่ยนการตั้งค่ารีโพซิทอรี, จัดการ secrets หรือเปิดเผยข้อมูลลับ

> GitHub Actions CI ที่ `.github/workflows/ci.yml` ยังคงตรวจ `pnpm exec tsc --noEmit` และ `pnpm test` ทุกครั้งที่ push หรือเปิด PR แยกต่างหากจาก Claude

## ตั้งค่าครั้งแรก

| ขั้นตอน | ผู้ดำเนินการ | รายละเอียด |
|---|---|---|
| 1 | เจ้าของรีโพซิทอรี | ติดตั้ง [Claude GitHub App](https://github.com/apps/claude) ให้กับ `Thonglor456/Tier-pos` |
| 2 | เจ้าของรีโพซิทอรี | เพิ่ม Actions secret ชื่อ `ANTHROPIC_API_KEY` ที่ **Settings → Secrets and variables → Actions** |
| 3 | ผู้ร่วมพัฒนา | เปิด PR จาก branch แยก ห้ามแก้ `main` โดยตรง |
| 4 | ผู้ดูแล PR | พิมพ์ `@claude` พร้อมคำสั่งที่เฉพาะเจาะจงในความเห็น PR |
| 5 | ผู้ดูแล PR | ตรวจ diff, ผล CI และผลทดสอบก่อน merge ด้วยตนเอง |

หากใช้ Claude subscription แทน Anthropic API ให้เปลี่ยนค่าใน workflow จาก `anthropic_api_key` เป็น `claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}` ตามเอกสาร Anthropic แล้วเก็บ token ไว้ใน GitHub Actions secret เท่านั้น

## ตัวอย่างคำสั่งใน PR

```text
@claude ช่วยตรวจ PR นี้ว่ากระทบการคำนวณยอดขายหรือจำนวนแก้วหรือไม่
หากพบข้อผิดพลาด ให้แก้เฉพาะจุดนั้น รัน pnpm exec tsc --noEmit และ pnpm test แล้วสรุปผลใน PR
```

```text
@claude ช่วยเพิ่ม test สำหรับกรณีเลือกช่วงวันที่ข้ามเดือน
ห้ามเปลี่ยน workflow, dependency, schema ฐานข้อมูล หรือแก้ไฟล์นอกขอบเขตการทดสอบ
```

## แนวทางสำหรับ Claude และผู้รีวิว

Claude ควรทำงานใน branch/PR เดิม, รักษาขอบเขตงานให้เล็ก, อ่านโค้ดที่เกี่ยวข้องก่อนแก้, และรายงานคำสั่งตรวจสอบพร้อมผลลัพธ์จริงเสมอ ผู้รีวิวควรอ่านทุก diff, ยืนยันว่า CI สีเขียว, และตรวจว่าการเปลี่ยนแปลงไม่มีข้อมูลลับ เช่น API key, PIN, QR ที่เป็นข้อมูลอ่อนไหว หรือไฟล์ `.env`

เมื่อเป็นงานที่เกี่ยวข้องกับฐานข้อมูล, การชำระเงิน, สิทธิ์พนักงาน, workflow หรือ secrets ให้ใช้ PR แยก, ระบุความเสี่ยงในคำอธิบาย PR และให้ผู้ดูแลตรวจด้วยตนเองก่อน merge

## อ้างอิง

เอกสาร Anthropic อธิบายว่า Claude Code GitHub Actions รองรับการตอบสนองต่อการแท็ก `@claude` ใน PR หรือ issue, ต้องติดตั้ง GitHub App, และต้องเก็บ credential ใน GitHub Actions secret [1] เอกสาร CI ของโครงการอยู่ที่ `.github/workflows/ci.yml`

[1]: https://code.claude.com/docs/en/github-actions "Claude Code GitHub Actions"
