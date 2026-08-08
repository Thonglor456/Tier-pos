CREATE TABLE `sales_channels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`slug` varchar(50) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_channels_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_channels_name_unique` UNIQUE(`name`),
	CONSTRAINT `sales_channels_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `store_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopName` varchar(200) NOT NULL DEFAULT 'Tier Coffee',
	`logoUrl` text,
	`address` text,
	`phone` varchar(20),
	`taxId` varchar(20),
	`vatEnabled` boolean NOT NULL DEFAULT false,
	`vatRate` decimal(5,2) NOT NULL DEFAULT '7.00',
	`openTime` varchar(5) DEFAULT '07:00',
	`closeTime` varchar(5) DEFAULT '20:00',
	`promptpayQrUrl` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `store_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `salesChannel` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `paymentMethod` enum('cash','transfer','thai_chuay_thai') NOT NULL;--> statement-breakpoint
ALTER TABLE `item_variants` ADD `priceLineman` decimal(10,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `vatAmount` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `orders` ADD `staffId` int;