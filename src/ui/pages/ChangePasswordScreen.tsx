import { useState } from "preact/hooks";
import logoSrc from "../../assets/logo.svg";
import { getElectronApi } from "../auth/client.ts";
import { AUTH_TOKEN_KEY, type AuthUser } from "../auth/session.ts";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import "./LoginScreen.css";

interface ChangePasswordScreenProps {
  user: AuthUser;
  onPasswordChanged: (
    user: AuthUser,
    permissions: RolePermissionsSnapshot,
  ) => void;
  onLogout: () => void;
}

export function ChangePasswordScreen({
  user,
  onPasswordChanged,
  onLogout,
}: ChangePasswordScreenProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: Event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedCurrent || !trimmedNew || !trimmedConfirm) {
      setError("Please fill in all password fields.");
      setIsSubmitting(false);
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setError("New password and confirmation do not match.");
      setIsSubmitting(false);
      return;
    }

    if (trimmedNew === trimmedCurrent) {
      setError("New password must be different from the current password.");
      setIsSubmitting(false);
      return;
    }

    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setError("Your session expired. Please sign in again.");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await getElectronApi().auth.changePassword({
        authToken: token,
        currentPassword: trimmedCurrent,
        newPassword: trimmedNew,
      });

      if ("error" in result) {
        setError(result.error ?? "Unable to change password.");
        return;
      }

      onPasswordChanged(result.user, result.permissions);
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : "Unable to change password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main class="login-screen">
      <section class="login-card">
        <div class="login-heading">
          <img class="login-logo" src={logoSrc} alt="" aria-hidden="true" />
          <h1>Sales Management</h1>
        </div>
        <p class="login-subtitle">
          Welcome, {user.name}. Change your temporary password to continue.
        </p>

        <form class="login-form" onSubmit={(event) => void handleSubmit(event)}>
          <label class="login-field">
            <span>Current password</span>
            <input
              type="password"
              name="current-password"
              autocomplete="current-password"
              value={currentPassword}
              onInput={(event) =>
                setCurrentPassword(
                  (event.currentTarget as HTMLInputElement).value,
                )
              }
              disabled={isSubmitting}
            />
          </label>

          <label class="login-field">
            <span>New password</span>
            <input
              type="password"
              name="new-password"
              autocomplete="new-password"
              value={newPassword}
              onInput={(event) =>
                setNewPassword((event.currentTarget as HTMLInputElement).value)
              }
              disabled={isSubmitting}
            />
          </label>

          <label class="login-field">
            <span>Confirm new password</span>
            <input
              type="password"
              name="confirm-password"
              autocomplete="new-password"
              value={confirmPassword}
              onInput={(event) =>
                setConfirmPassword(
                  (event.currentTarget as HTMLInputElement).value,
                )
              }
              disabled={isSubmitting}
            />
          </label>

          {error ? <p class="login-error">{error}</p> : null}

          <button type="submit" class="login-button" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Change password"}
          </button>

          <button
            type="button"
            class="login-secondary-button"
            disabled={isSubmitting}
            onClick={onLogout}
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
