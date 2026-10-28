const AUTH_TOKEN_KEY = "sales-electron-auth-token";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  commercialServiceId: string | null;
  /** Assigned collection point id when set on the user record. */
  salesPointId: number | null;
  /** Display name for salesPointId. */
  salesPointName: string | null;
  mustChangePassword: boolean;
}

export { AUTH_TOKEN_KEY };
