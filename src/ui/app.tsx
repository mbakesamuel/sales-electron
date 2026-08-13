import { useEffect, useState } from "preact/hooks";
import type { RolePermissionsSnapshot } from "../shared/permissions.types.ts";
import {
  AUTH_TOKEN_KEY,
  type AuthUser,
} from "./auth/session.ts";
import { getElectronApi } from "./auth/client.ts";
import { ChangePasswordScreen } from "./pages/ChangePasswordScreen.tsx";
import { HomeScreen } from "./pages/HomeScreen.tsx";
import { LoginScreen } from "./pages/LoginScreen.tsx";
import { ReportWindowApp } from "./pages/ReportWindowApp.tsx";
import { parseReportWindowHash } from "../shared/reportWindow.ts";
import { applyUiTheme, loadAndApplyCompanyTheme } from "./theme/applyUiTheme.ts";
import "./app.css";

function MainApp() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<RolePermissionsSnapshot | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    applyUiTheme("agro");

    async function bootstrap() {
      try {
        await loadAndApplyCompanyTheme();
      } catch {
        applyUiTheme("agro");
      }

      const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const session = await getElectronApi().auth.getSession(token);
        if (session) {
          setUser(session.user);
          setPermissions(session.permissions);
        } else {
          sessionStorage.removeItem(AUTH_TOKEN_KEY);
        }
      } catch {
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
      } finally {
        setIsBootstrapping(false);
      }
    }

    void bootstrap();
  }, []);

  async function handleLoginSuccess(
    nextUser: AuthUser,
    token: string,
    nextPermissions: RolePermissionsSnapshot,
  ) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    setUser(nextUser);
    setPermissions(nextPermissions);
    void loadAndApplyCompanyTheme();
  }

  function handlePasswordChanged(
    nextUser: AuthUser,
    nextPermissions: RolePermissionsSnapshot,
  ) {
    setUser(nextUser);
    setPermissions(nextPermissions);
  }

  async function handleLogout() {
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
    setPermissions(null);

    if (token) {
      try {
        await getElectronApi().auth.logout(token);
      } catch {
        // Session already cleared locally.
      }
    }
  }

  if (isBootstrapping) {
    return <main class="app-loading">Loading...</main>;
  }

  if (!user || !permissions) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (user.mustChangePassword) {
    return (
      <ChangePasswordScreen
        user={user}
        onPasswordChanged={handlePasswordChanged}
        onLogout={() => void handleLogout()}
      />
    );
  }

  return (
    <HomeScreen
      user={user}
      permissions={permissions}
      onPermissionsSaved={setPermissions}
      onLogout={() => void handleLogout()}
    />
  );
}

export function App() {
  if (parseReportWindowHash()) {
    return <ReportWindowApp />;
  }
  return <MainApp />;
}
