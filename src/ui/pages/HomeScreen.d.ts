import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import type { AuthUser } from "../auth/session.ts";
import "./HomeScreen.css";
interface HomeScreenProps {
    user: AuthUser;
    permissions: RolePermissionsSnapshot;
    onPermissionsSaved: (next: RolePermissionsSnapshot) => void;
    onLogout: () => void;
}
export declare function HomeScreen({ user, permissions, onPermissionsSaved, onLogout, }: HomeScreenProps): import("preact").JSX.Element;
export {};
