import { useCallback, useEffect, useState } from "preact/hooks";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import {
  canAccessBottledStockModule,
  canAccessStockModule,
  type StockModuleVariant,
} from "../../shared/stockModule.ts";
import type { AuthUser } from "../auth/session.ts";
import { getElectronApi } from "../auth/client.ts";
import type { StockBootstrap } from "../../shared/stock.types.ts";
import { StockClient } from "./StockClient.tsx";
import "./StockScreen.css";

interface StockScreenProps {
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
  variant?: StockModuleVariant;
}

export function StockScreen({
  user,
  permissions,
  variant = "bulk",
}: StockScreenProps) {
  const [bootstrap, setBootstrap] = useState<StockBootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canAccess =
    variant === "bottled"
      ? canAccessBottledStockModule(permissions)
      : canAccessStockModule(permissions);

  const refresh = useCallback(async () => {
    try {
      const data = await getElectronApi().stock.getBootstrap(user.id, variant);
      setBootstrap(data);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load stock data.",
      );
    }
  }, [user.id, variant]);

  useEffect(() => {
    if (!canAccess) {
      return;
    }
    void refresh();
  }, [canAccess, refresh]);

  if (!canAccess) {
    return (
      <p class="home-access-denied">
        You do not have permission to view{" "}
        {variant === "bottled" ? "bottled stock" : "stock"} data.
      </p>
    );
  }

  if (error) {
    return <p class="stock-error">{error}</p>;
  }

  if (!bootstrap) {
    return (
      <p class="stock-muted">
        Loading {variant === "bottled" ? "bottled stock" : "stock"} data…
      </p>
    );
  }

  return (
    <StockClient
      bootstrap={bootstrap}
      user={user}
      permissions={permissions}
      variant={variant}
      onRefresh={refresh}
    />
  );
}
