import { type AuthUser } from "../auth/session.ts";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import "./LoginScreen.css";
interface ChangePasswordScreenProps {
    user: AuthUser;
    onPasswordChanged: (user: AuthUser, permissions: RolePermissionsSnapshot) => void;
    onLogout: () => void;
}
export declare function ChangePasswordScreen({ user, onPasswordChanged, onLogout, }: ChangePasswordScreenProps): import("preact").JSX.Element;
export {};
