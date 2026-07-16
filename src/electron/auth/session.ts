import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { AuthUser, LoginResponse } from "../../shared/database.types.js";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.js";
import { loadRolePermissionsSnapshot } from "./permissions/service.js";
import { createSessionToken, hashToken, verifyPassword } from "./password.js";
import { getDatabase } from "../db/index.js";

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
}

export interface AuthSession {
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
}

function mapUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    commercialServiceId: row.commercialServiceId ?? null,
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
              commercialServiceId
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

  return { token, user: mapUser(user), permissions: loadRolePermissionsSnapshot(user.role) };
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
      `SELECT u.id, u.username, u.name, u.role, u.isActive, u.commercialServiceId
       FROM AuthSession s
       INNER JOIN User u ON u.id = s.userId
       WHERE s.tokenHash = ?
         AND s.expiresAt > datetime('now')
       LIMIT 1`,
    )
    .get(hashToken(token)) as
    | (UserRow & { isActive: number })
    | undefined;

  if (!row || row.isActive !== 1) {
    return null;
  }

  return {
    user: mapUser(row),
    permissions: loadRolePermissionsSnapshot(row.role),
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
