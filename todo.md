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
- [ ] Checkpoint & deploy
- [x] Checkpoint & deploy
