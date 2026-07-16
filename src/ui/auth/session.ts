const AUTH_TOKEN_KEY = "sales-electron-auth-token";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  commercialServiceId: string | null;
}

export { AUTH_TOKEN_KEY };
