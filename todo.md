# Tier Coffee POS - Todo

## Phase 1: Database & Backend
- [x] Database schema: categories, items, item_variants, modifier_groups, modifier_options, item_modifier_groups
- [x] Database schema: orders, order_items, order_item_modifiers, pos_users (PIN-based)
- [x] Seed data: categories, items with variants, modifier groups, modifier options, item-modifier mappings
- [x] tRPC router: menu (categories, items, variants, modifiers)
- [x] tRPC router: orders (create, complete, cancel with PIN)
- [x] tRPC router: reports (daily summary, by channel, order history)
- [x] tRPC router: admin (manage items, categories, modifiers, pricing)
- [x] tRPC router: pos_users (PIN verification for manager actions)

## Phase 2: POS Screen (หน้าจอขายหลัก)
- [x] App layout with routing (POS, Payment, Admin, Reports)
- [x] Global theme: elegant dark brown + cream color scheme
- [x] POS Screen: Category tabs (horizontal scroll)
- [x] POS Screen: Product grid (touch-friendly large cards)
- [x] POS Screen: Order panel (right side) with channel selector Walk-in/Grab
- [x] POS Screen: Cart items list with quantity controls
- [x] POS Screen: Order total and checkout button

## Phase 3: Modals & Payment
- [x] Modifier Selection Modal (variant + required modifiers + optional modifiers)
- [x] Payment Screen: order summary + payment method selector
- [x] Payment Screen: Cash numpad with change calculation
- [x] Payment Screen: Transfer/QR payment flow
- [x] Receipt/confirmation screen after payment
- [x] Cancel Order PIN Modal (manager PIN + reason input)

## Phase 4: Admin & Reports
- [x] Admin: Product list with edit/toggle active
- [x] Admin: Add/Edit product form (name, category, cost, variants, pricing by channel)
- [x] Admin: Category management
- [x] Reports: Daily summary card (total, by channel, by payment method)
- [x] Reports: Order history table with filter by date/channel/status
- [x] Reports: Cancelled orders view

## Phase 5: Tests & Polish
- [x] Vitest: menu router tests
- [x] Vitest: order creation and cancellation tests
- [x] Vitest: PIN verification tests
- [x] Mobile/tablet responsive polish
- [x] Checkpoint & deploy

## Phase 6: UI Enhancement (reference match)
- [x] Header with live clock and date display
- [x] Product cards with real food photography images
- [x] Upload 15 product images to webdev static storage
- [x] Update ProductGrid with correct image paths
- [x] Redesign OrderPanel with summary rows matching reference

## Phase 7: Staff System, Settings, LINE MAN, Payment Methods
- [x] DB: staff table (name, PIN hash, role: staff/manager)
- [x] DB: store_settings table (shop name, logo, address, phone, tax_id, vat_enabled, vat_rate, open_time, close_time)
- [x] DB: sales_channels table (dynamic: หน้าร้าน, Grab, LINE MAN)
- [x] DB: item_variants add price_lineman column
- [x] DB: orders add staff_id, payment_method add thai_chuay_thai
- [x] Backend: staff router (CRUD, PIN verify)
- [x] Backend: settings router (get/update store settings)
- [x] Backend: sales_channels router (CRUD)
- [x] Backend: update orders router to accept staff_id and new payment methods
- [x] Backend: update reports router for staff summary and payment method breakdown
- [x] UI: Staff PIN Login Screen (before POS)
- [x] UI: Settings page (shop info, VAT, hours, channels, modifier groups)
- [x] UI: POS channel selector dynamic from DB (หน้าร้าน/Grab/LINE MAN)
- [x] UI: Payment Modal — add โอนธนาคาร (QR upload), ไทยช่วยไทย
- [x] UI: Admin — staff management page (add/edit/delete, role)
- [x] UI: Admin — guard manager-only sections by role
- [x] UI: Reports — staff sales summary filter
- [x] UI: Reports — payment method breakdown
- [x] Vitest: staff PIN and role tests (10 tests passing)
- [x] Vitest: staff PIN and role tests (10 tests passing)

## Phase 8: Bug Fixes
- [x] Fix: getOrders endDate ตีความเป็น 00:00:00 ทำให้บิลหายในหน้ารายงาน
- [x] Fix: ReportsScreen ส่ง endDate ให้ครอบคลุมสิ้นวัน 23:59:59.999
- [x] Verify: ปุ่มยกเลิกบิลในหน้ารายงาน — popup ยืนยัน ไม่ต้อง PIN, เปลี่ยนสถานะเป็น cancelled ไม่ลบ

## Phase 9: Logo & Branch Feature
- [x] Upload Tier Coffee logo (real brand logo) to webdev static storage
- [x] Update Header to show real logo instead of coffee cup icon
- [x] Update Staff Login screen to show real logo
- [x] DB: branches table (id, name, address, isActive)
- [x] Backend: branches router (CRUD)
- [x] Settings: branch management page (add/edit/delete branches)
- [x] Settings: select active branch for this device (stored in localStorage via BranchContext)
- [x] Header: show current branch name next to logo
- [x] StaffLoginScreen: show current branch name
- [x] Reports: filter by branch
- [x] Orders: record branch_id per order

## Phase 10: Date Range + Theme Overhaul
- [x] เปลี่ยนธีมทั้งระบบเป็นโทนเทา/ดำ โมเดิร์น (index.css CSS variables)
- [x] อัปเดต StaffLoginScreen ให้ใช้ธีมใหม่
- [x] อัปเดต POSHeader ให้ใช้ธีมใหม่
- [x] อัปเดต POSScreen / OrderPanel / ProductGrid ให้ใช้ธีมใหม่
- [x] อัปเดต AdminScreen / SettingsScreen / ReportsScreen ให้ใช้ธีมใหม่
- [x] เพิ่ม Date Range Picker ในหน้ารายงาน (เลือกช่วงวันที่แบบลากได้)
- [x] อัปเดต orders.list query ให้รับ startDate/endDate จาก range picker
- [x] อัปเดต summary cards ให้ใช้ข้อมูลจาก range ที่เลือก
- [x] อัปเดต summary cards ให้ใช้ข้อมูลจาก range ที่เลือก

## Phase 11: Manager Dashboard
- [x] Backend: dashboard.todaySummary — KPI วันนี้ (revenue, orders, avg order value, cancelled)
- [x] Backend: dashboard.topItems — สินค้าขายดีรายวัน/รายเดือน (item name, qty, revenue)
- [x] Backend: dashboard.weeklyRevenue — ยอดขาย 7 วันย้อนหลัง (bar chart data)
- [x] Backend: dashboard.monthlyRevenue — ยอดขายรายวันในเดือนนี้
- [x] Backend: dashboard.recentOrders — 10 บิลล่าสุด
- [x] UI: DashboardScreen.tsx — KPI cards, top products table, revenue bar chart, recent orders
- [x] UI: เพิ่มปุ่มเข้า Dashboard ใน POSHeader
- [x] Route: /dashboard ใน App.tsx

## Phase 12: Export CSV/Excel
- [x] สร้าง export utility (client/src/lib/exportUtils.ts) — แปลงข้อมูลเป็น CSV string และ trigger download
- [x] ReportsScreen: เพิ่มปุ่ม Export CSV ใน toolbar (ส่งออกรายการบิลในช่วงวันที่ที่เลือก)
- [x] DashboardScreen: เพิ่มปุ่ม Export CSV สำหรับ top items และ recent orders
- [x] Export ครอบคลุมข้อมูล: เลขบิล, วันที่/เวลา, พนักงาน, ช่องทาง, วิธีชำระ, สาขา, ยอดรวม, สถานะ

## Phase 13: Performance Optimization
- [x] ถอด analytics scripts (Umami) ออกจาก index.html
- [x] แก้ StaffLoginScreen เรียก posUsers.list ซ้ำ 2 ครั้ง (ยืนยัน: เป็น Vite HMR dev artifact เท่านั้น production ไม่มีปัญหา)
- [x] เพิ่ม /api/scheduled/keepalive endpoint + Heartbeat cron ทุก 5 นาที (task_uid: GWybd6pjAm9xEujdHbRD4B)

## Phase 14: Bug Fixes
- [ ] Security: เพิ่ม manager-only guard ใน AdminScreen, ReportsScreen, DashboardScreen
- [ ] UX: เพิ่ม toast แจ้งเตือน "กรุณาเลือกตัวเลือกที่จำเป็นให้ครบ" ใน ModifierModal
- [ ] UX: เพิ่ม toast แจ้งเตือน "จำนวนเงินที่รับไม่พอ" ใน PaymentModal (cash)
- [ ] i18n: แปลค่า walkin/transfer/grab/lineman เป็นภาษาไทยใน DashboardScreen
- [ ] UX: เปลี่ยน window.confirm ลบพนักงานเป็น custom AlertDialog ใน AdminScreen
