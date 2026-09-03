import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type {
  AuthUser,
  ChangePasswordResponse,
  LoginResponse,
} from "../../shared/database.types.js";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.js";
import { loadRolePermissionsSnapshot } from "./permissions/service.js";
import {
  createSessionToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "./password.js";
import { getDatabase } from "../db/index.js";
import { loadSessionIdleTimeoutMinutes } from "./sessionPolicy.js";

export type { AuthUser };

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: string;
  isActive: number;
  passwordHash: string | null;
  passwordPlain: string | null;
  commercialServiceId: string | null;
  mustChangePassword: number;
}

export interface AuthSession {
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
  sessionIdleTimeoutMinutes: number;
}

function mapUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    commercialServiceId: row.commercialServiceId ?? null,
    mustChangePassword: row.mustChangePassword === 1,
  };
}

function purgeExpiredSessions(db: Database.Database): void {
  db.prepare("DELETE FROM AuthSession WHERE expiresAt <= datetime('now')").run();
}

function verifyUserPassword(row: UserRow, password: string): boolean {
  if (verifyPassword(password, row.passwordHash)) {
    return true;
  }

  if (row.passwordPlain !== null && row.passwordPlain === password) {
    return true;
  }

  return false;
}

function loadUserById(db: Database.Database, userId: string): UserRow | undefined {
  return db
    .prepare(
      `SELECT id, username, name, role, isActive, passwordHash, passwordPlain,
              commercialServiceId, mustChangePassword
       FROM User
       WHERE id = ?
       LIMIT 1`,
    )
    .get(userId) as UserRow | undefined;
}

export function login(
  username: string,
  password: string,
): LoginResponse {
  const db = getDatabase();
  purgeExpiredSessions(db);

  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername || !password) {
    return { error: "Invalid username or password." };
  }

  const user = db
    .prepare(
      `SELECT id, username, name, role, isActive, passwordHash, passwordPlain,
              commercialServiceId, mustChangePassword
       FROM User
       WHERE lower(username) = ?
       LIMIT 1`,
    )
    .get(normalizedUsername) as UserRow | undefined;

  if (!user || user.isActive !== 1 || !verifyUserPassword(user, password)) {
    return { error: "Invalid username or password." };
  }

  const token = createSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  db.prepare(
    `INSERT INTO AuthSession (id, userId, tokenHash, expiresAt)
     VALUES (?, ?, ?, ?)`,
  ).run(randomUUID(), user.id, tokenHash, expiresAt);

  return {
    token,
    user: mapUser(user),
    permissions: loadRolePermissionsSnapshot(user.role),
    sessionIdleTimeoutMinutes: loadSessionIdleTimeoutMinutes(db),
  };
}

export function getSession(token: string): AuthUser | null {
  const session = getAuthSession(token);
  return session?.user ?? null;
}

export function getAuthSession(token: string): AuthSession | null {
  if (!token) {
    return null;
  }

  const db = getDatabase();
  purgeExpiredSessions(db);

  const row = db
    .prepare(
      `SELECT u.id, u.username, u.name, u.role, u.isActive, u.commercialServiceId,
              u.mustChangePassword, u.passwordHash, u.passwordPlain
       FROM AuthSession s
       INNER JOIN User u ON u.id = s.userId
       WHERE s.tokenHash = ?
         AND s.expiresAt > datetime('now')
       LIMIT 1`,
    )
    .get(hashToken(token)) as UserRow | undefined;

  if (!row || row.isActive !== 1) {
    return null;
  }

  return {
    user: mapUser(row),
    permissions: loadRolePermissionsSnapshot(row.role),
    sessionIdleTimeoutMinutes: loadSessionIdleTimeoutMinutes(db),
  };
}

export function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): ChangePasswordResponse {
  const session = getAuthSession(token);
  if (!session) {
    return { error: "Login required." };
  }

  const trimmedCurrent = currentPassword.trim();
  const trimmedNew = newPassword.trim();

  if (!trimmedCurrent || !trimmedNew) {
    return { error: "Current and new passwords are required." };
  }

  if (trimmedNew === trimmedCurrent) {
    return { error: "New password must be different from the current password." };
  }

  const db = getDatabase();
  const user = loadUserById(db, session.user.id);
  if (!user || user.isActive !== 1) {
    return { error: "Login required." };
  }

  if (!verifyUserPassword(user, trimmedCurrent)) {
    return { error: "Current password is incorrect." };
  }

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  db.prepare(
    `UPDATE User
     SET passwordHash = ?,
         passwordPlain = NULL,
         mustChangePassword = 0,
         updatedAt = ?
     WHERE id = ?`,
  ).run(hashPassword(trimmedNew), now, user.id);

  const updated = loadUserById(db, user.id);
  if (!updated) {
    return { error: "Unable to update password." };
  }

  return {
    user: mapUser(updated),
    permissions: loadRolePermissionsSnapshot(updated.role),
  };
}

export function logout(token: string): void {
  if (!token) {
    return;
  }

  getDatabase()
    .prepare("DELETE FROM AuthSession WHERE tokenHash = ?")
    .run(hashToken(token));
}
