import type { AuthUser } from "../auth/session.ts";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import { ConsignmentNotesClient } from "./ConsignmentNotesClient.tsx";
import "./VcnPrintView.css";
import "../sales/sales.css";

interface ConsignmentNotesScreenProps {
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
}

export function ConsignmentNotesScreen({
  user,
  permissions,
}: ConsignmentNotesScreenProps) {
  return (
    <div class="sales-screen">
      <ConsignmentNotesClient user={user} permissions={permissions} />
    </div>
  );
}
