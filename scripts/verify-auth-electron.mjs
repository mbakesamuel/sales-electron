import { app } from "electron";
import { closeDatabase, initDatabase } from "../dist-electron/electron/db/index.js";
import { login, getSession, logout } from "../dist-electron/electron/auth/session.js";

app.whenReady().then(() => {
  initDatabase();

  const { token, user } = login("admin", "admin123");
  console.log("loginOk", user.username, user.role);

  const restored = getSession(token);
  console.log("sessionOk", restored?.name);

  logout(token);
  console.log("logoutOk", getSession(token) === null);

  closeDatabase();
  app.quit();
});
