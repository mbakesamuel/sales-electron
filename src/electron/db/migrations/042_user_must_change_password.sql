-- Force password change after admin sets a temporary password.

ALTER TABLE User ADD COLUMN mustChangePassword INTEGER NOT NULL DEFAULT 0;
