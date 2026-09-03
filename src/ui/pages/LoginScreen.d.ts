import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import type { AuthUser } from "../auth/session.ts";
import "./LoginScreen.css";
interface LoginScreenProps {
    onLoginSuccess: (user: AuthUser, token: string, permissions: RolePermissionsSnapshot, sessionIdleTimeoutMinutes: number) => void;
}
export declare function LoginScreen({ onLoginSuccess }: LoginScreenProps): import("preact").JSX.Element;
export {};
