import type { AuthUser } from "../../shared/database.types.js";
import { getSession } from "../auth/session.js";

export function requireAuthUser(authToken: string | undefined): AuthUser {
  if (!authToken) {
    throw new Error("Login required.");
  }

  const user = getSession(authToken);
  if (!user) {
    throw new Error("Session expired. Please log in again.");
  }

  return user;
}
