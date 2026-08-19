ALTER TABLE pos_users ADD COLUMN branchId INT NULL;
ALTER TABLE pos_users MODIFY COLUMN role ENUM('staff', 'manager', 'admin') NOT NULL DEFAULT 'staff';
