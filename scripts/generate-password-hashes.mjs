import { app } from "electron";
import { hashPassword } from "../dist-electron/electron/auth/password.js";

const passwords = {
  admin123: "admin",
  clerk123: "clerk",
  manager123: "manager",
  supervisor123: "supervisor",
};

app.whenReady().then(() => {
  for (const [password, label] of Object.entries(passwords)) {
    console.log(`${label}: ${hashPassword(password)}`);
  }
  app.quit();
});
