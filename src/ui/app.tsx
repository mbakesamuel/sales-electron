import { useEffect, useState } from "preact/hooks";
import type { RolePermissionsSnapshot } from "../shared/permissions.types.ts";
import {
  AUTH_TOKEN_KEY,
  type AuthUser,
} from "./auth/session.ts";
import { getElectronApi } from "./auth/client.ts";
import { AppErrorBoundary } from "./components/AppErrorBoundary.tsx";
import { AppLoadingShell } from "./components/AppLoadingShell.tsx";
import { ChangePasswordScreen } from "./pages/ChangePasswordScreen.tsx";
import { HomeScreen } from "./pages/HomeScreen.tsx";
import { LoginScreen } from "./pages/LoginScreen.tsx";
import { ReportWindowApp } from "./pages/ReportWindowApp.tsx";
import { parseReportWindowHash } from "../shared/reportWindow.ts";
import { applyUiTheme, loadAndApplyCompanyTheme } from "./theme/applyUiTheme.ts";
import "./app.css";

function readStoredToken(): string | null {
  try {
    return sessionStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function MainApp() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<RolePermissionsSnapshot | null>(
    null,
  );
  // Only show a restore shell when a token already exists at first paint.
  const [isRestoringSession, setIsRestoringSession] = useState(
    () => Boolean(readStoredToken()),
  );

  useEffect(() => {
    applyUiTheme("agro");
    void loadAndApplyCompanyTheme().catch(() => {
      applyUiTheme("agro");
    });

    const token = readStoredToken();
    if (!token) {
      setIsRestoringSession(false);
      return;
    }

    let cancelled = false;

    void getElectronApi()
      .auth.getSession(token)
      .then((session) => {
        if (cancelled) {
          return;
        }
        if (session) {
          setUser(session.user);
          setPermissions(session.permissions);
        } else {
          sessionStorage.removeItem(AUTH_TOKEN_KEY);
        }
      })
      .catch(() => {
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
      })
      .finally(() => {
        if (!cancelled) {
          setIsRestoringSession(false);
        }
      });

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setIsRestoringSession(false);
      }
    }, 4000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  function handleLoginSuccess(
    nextUser: AuthUser,
    token: string,
    nextPermissions: RolePermissionsSnapshot,
  ) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    // Never re-enter the restore shell after a successful interactive login.
    setIsRestoringSession(false);
    setUser(nextUser);
    setPermissions(nextPermissions);
    void loadAndApplyCompanyTheme().catch(() => {
      applyUiTheme("agro");
    });
  }

  function handlePasswordChanged(
    nextUser: AuthUser,
    nextPermissions: RolePermissionsSnapshot,
  ) {
    setUser(nextUser);
    setPermissions(nextPermissions);
  }

  async function handleLogout() {
    const token = readStoredToken();
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    setIsRestoringSession(false);
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

  // Restore shell only before we know whether a stored token is valid.
  // After login, user/permissions are set and we skip this even if restore was pending.
  if (isRestoringSession && !user) {
    return <AppLoadingShell status="Restoring session…" />;
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
    <AppErrorBoundary>
      <HomeScreen
        user={user}
        permissions={permissions}
        onPermissionsSaved={setPermissions}
        onLogout={() => void handleLogout()}
      />
    </AppErrorBoundary>
  );
}

export function App() {
  if (parseReportWindowHash()) {
    return <ReportWindowApp />;
  }
  return <MainApp />;
}
