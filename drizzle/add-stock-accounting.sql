-- Stock (ตัดวัตถุดิบตามสูตร, แยกสาขา, โอนระหว่างสาขา) + กระทบยอด + ต้นทุนต่อบิล
-- รันครั้งเดียวบนฐานข้อมูล Railway (เหมือน add-cups-per-serving.sql) — สำรองข้อมูลก่อนรัน

CREATE TABLE `branch_stock` (
	`branchId` int NOT NULL,
	`ingredientId` int NOT NULL,
	`quantity` decimal(14,3) NOT NULL DEFAULT '0',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branch_stock_branchId_ingredientId_pk` PRIMARY KEY(`branchId`,`ingredientId`)
);

CREATE TABLE `ingredients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`unit` varchar(20) NOT NULL,
	`costPerUnit` decimal(12,4) NOT NULL DEFAULT '0',
	`reorderLevel` decimal(14,3) NOT NULL DEFAULT '0',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ingredients_id` PRIMARY KEY(`id`)
);

CREATE TABLE `modifier_recipe_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`modifierOptionId` int NOT NULL,
	`ingredientId` int NOT NULL,
	`quantity` decimal(12,3) NOT NULL,
	CONSTRAINT `modifier_recipe_lines_id` PRIMARY KEY(`id`)
);

CREATE TABLE `recipe_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` int NOT NULL,
	`variantId` int,
	`ingredientId` int NOT NULL,
	`quantity` decimal(12,3) NOT NULL,
	CONSTRAINT `recipe_lines_id` PRIMARY KEY(`id`)
);

CREATE TABLE `reconciliations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`businessDate` date NOT NULL,
	`source` varchar(50) NOT NULL,
	`grossAmount` decimal(12,2) NOT NULL,
	`expectedNet` decimal(12,2) NOT NULL,
	`actualNet` decimal(12,2) NOT NULL,
	`feeAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`note` text,
	`staffId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reconciliations_id` PRIMARY KEY(`id`),
	CONSTRAINT `reconciliations_branch_date_source_uq` UNIQUE(`branchId`,`businessDate`,`source`)
);

CREATE TABLE `stock_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`ingredientId` int NOT NULL,
	`type` enum('sale','sale_cancel','receive','count','waste','transfer_out','transfer_in','transfer_return','withdraw_out','withdraw_in','return_out','return_in') NOT NULL,
	`quantity` decimal(14,3) NOT NULL,
	`unitCost` decimal(12,4) NOT NULL DEFAULT '0',
	`orderId` int,
	`transferId` int,
	`note` text,
	`staffId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);

CREATE TABLE `stock_transfer_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transferId` int NOT NULL,
	`ingredientId` int NOT NULL,
	`quantity` decimal(14,3) NOT NULL,
	`receivedQuantity` decimal(14,3),
	`unitCost` decimal(12,4) NOT NULL DEFAULT '0',
	CONSTRAINT `stock_transfer_lines_id` PRIMARY KEY(`id`)
);

CREATE TABLE `stock_transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('transfer','withdrawal','return') NOT NULL DEFAULT 'transfer',
	`fromBranchId` int NOT NULL,
	`toBranchId` int NOT NULL,
	`status` enum('in_transit','received','cancelled') NOT NULL DEFAULT 'in_transit',
	`note` text,
	`createdBy` int,
	`receivedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`receivedAt` timestamp,
	CONSTRAINT `stock_transfers_id` PRIMARY KEY(`id`)
);

ALTER TABLE `orders` ADD `costAmount` decimal(10,2);
ALTER TABLE `branches` ADD `type` enum('shop','warehouse') DEFAULT 'shop' NOT NULL;
ALTER TABLE `branches` ADD `usesCentralStock` boolean DEFAULT true NOT NULL;
ALTER TABLE `sales_channels` ADD `gpPercent` decimal(5,2) DEFAULT '0' NOT NULL;
CREATE INDEX `modifier_recipe_lines_option_idx` ON `modifier_recipe_lines` (`modifierOptionId`);
CREATE INDEX `recipe_lines_item_idx` ON `recipe_lines` (`itemId`);
CREATE INDEX `stock_movements_branch_time_idx` ON `stock_movements` (`branchId`,`createdAt`);
CREATE INDEX `stock_movements_order_idx` ON `stock_movements` (`orderId`);
CREATE INDEX `stock_transfer_lines_transfer_idx` ON `stock_transfer_lines` (`transferId`);

-- ตั้ง GP เริ่มต้นของแอปเดลิเวอรี (แก้ได้ในหน้า ตั้งค่า → ช่องทางขาย)
UPDATE `sales_channels` SET `gpPercent` = 30.00 WHERE `slug` IN ('grab', 'lineman');

-- คลังกลาง: ที่เก็บของกลาง สาขาที่ใช้คลังกลางมาเบิกของไป (ไม่มีหน้าขาย)
INSERT INTO `branches` (`name`, `type`, `usesCentralStock`, `isActive`) VALUES ('คลังกลาง', 'warehouse', false, true);

-- สาขาร้อยเอ็ดสั่งของเอง ไม่เบิกจากคลังกลาง (ถ้าชื่อในระบบต่างไป ปิดได้ที่ ตั้งค่า → สาขา)
UPDATE `branches` SET `usesCentralStock` = false WHERE `name` LIKE '%ร้อยเอ็ด%';
