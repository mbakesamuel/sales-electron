import type { ElectronAppApi } from "../types/electron.d.ts";

export function getElectronApi(): ElectronAppApi {
  const api = window.api;

  if (!api?.auth || !api?.db || !api?.stock) {
    throw new Error(
      "Electron API is unavailable. Close any browser tab and use the Electron app window launched by npm run dev.",
    );
  }

  return api;
}
