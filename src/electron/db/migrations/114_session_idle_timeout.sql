-- Session idle timeout: minutes of inactivity before auto sign-out (0 = disabled).

ALTER TABLE CompanySettings ADD COLUMN sessionIdleTimeoutMinutes INTEGER NOT NULL DEFAULT 0 CHECK (sessionIdleTimeoutMinutes >= 0);
