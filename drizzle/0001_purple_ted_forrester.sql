CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `item_modifier_groups` (
	`itemId` int NOT NULL,
	`modifierGroupId` int NOT NULL,
	CONSTRAINT `item_modifier_groups_itemId_modifierGroupId_pk` PRIMARY KEY(`itemId`,`modifierGroupId`)
);
--> statement-breakpoint
CREATE TABLE `item_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`priceWalkin` decimal(10,2) NOT NULL,
	`priceGrab` decimal(10,2) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `item_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`sku` varchar(50),
	`costPrice` decimal(10,2) NOT NULL DEFAULT '0',
	`hasVariants` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `items_id` PRIMARY KEY(`id`),
	CONSTRAINT `items_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `modifier_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`isRequired` boolean NOT NULL DEFAULT false,
	`minSelect` int NOT NULL DEFAULT 0,
	`maxSelect` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `modifier_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `modifier_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`modifierGroupId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`priceAdd` decimal(10,2) NOT NULL DEFAULT '0',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `modifier_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_item_modifiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderItemId` int NOT NULL,
	`modifierOptionId` int NOT NULL,
	`modifierGroupName` varchar(100) NOT NULL,
	`modifierName` varchar(100) NOT NULL,
	`priceAdd` decimal(10,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_item_modifiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`itemId` int NOT NULL,
	`variantId` int NOT NULL,
	`itemName` varchar(200) NOT NULL,
	`variantName` varchar(100) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`basePrice` decimal(10,2) NOT NULL,
	`modifiersPrice` decimal(10,2) NOT NULL DEFAULT '0',
	`totalPrice` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(30) NOT NULL,
	`salesChannel` enum('walkin','grab') NOT NULL,
	`status` enum('completed','cancelled') NOT NULL DEFAULT 'completed',
	`totalAmount` decimal(10,2) NOT NULL,
	`paymentMethod` enum('cash','transfer') NOT NULL,
	`cashReceived` decimal(10,2),
	`changeAmount` decimal(10,2),
	`cancelledBy` varchar(100),
	`cancelReason` text,
	`cancelledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `pos_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`pinCode` varchar(6) NOT NULL,
	`role` enum('staff','manager') NOT NULL DEFAULT 'staff',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_users_id` PRIMARY KEY(`id`)
);
