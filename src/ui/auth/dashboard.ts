import { getAuthToken } from "./db.ts";
import { getElectronApi } from "./client.ts";

function requireAuthToken(): string {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Login required.");
  }
  return token;
}

export function getAuthenticatedDashboard() {
  const api = getElectronApi().dashboard;

  return {
    getSummary: () => api.getSummary(requireAuthToken()),
  };
}
