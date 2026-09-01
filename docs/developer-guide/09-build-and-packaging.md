# Build and packaging

## Production build

```bash
npm run build
```

Runs:

1. `tsc -b` (project references / UI types)
2. `transpile:electron` (main + migrations + preload copy)
3. `vite build` → `dist-react/`

Main entry in package.json: `dist-electron/electron/main.js`.

## App naming

| Surface | Current value |
|---------|----------------|
| Window / document title | **Sales Management Application** (`BrowserWindow.title`, `index.html`) |
| Package name / `userData` folder | `sales-electron` |
| electron-builder `productName` / NSIS shortcut | **Sales Management Application** |
| Installer artifact | `Sales Management Application-Setup-{version}-win-x64.exe` under `release/` |

Operators see the same display name in the window title, installer, and Start Menu / desktop shortcuts. The npm package name and `%APPDATA%\sales-electron\` folder stay `sales-electron` so existing installs keep their data.

## Windows installer

```bash
npm run dist:win
# equivalent: npm run pack:win
```

Uses **electron-builder** with NSIS as configured above.

### Release (bump version + build)

```bash
npm run release:patch   # 1.0.0 → 1.0.1
npm run release:minor   # 1.0.0 → 1.1.0
npm run release:major   # 1.0.0 → 2.0.0
npm run release -- minor   # same as release:minor
```

[`scripts/release.mjs`](../../scripts/release.mjs) runs `npm version <bump> --no-git-tag-version` (updates `package.json` and `package-lock.json` only — no git commit or tag), then `npm run dist:win`. Use `dist:win` alone when you only need a rebuild without changing the version number.

### Packaging notes

- `files`: `dist-electron/**`, `dist-react/**`, `package.json`
- `asar: true` with **`asarUnpack` for `better-sqlite3`** (native module must load unpacked)
- `npmRebuild: true` for native deps against Electron’s ABI
- NSIS: non-one-click, desktop + start menu shortcuts

## Dev vs prod load

- Dev: BrowserWindow loads `http://localhost:5173`
- Prod: loads `dist-react/index.html` from disk (see `main.ts`)

## Checklist before release

1. `npm run build` clean
2. Smoke-test login, open month, create sale (booklet serial), one report print
3. `npm run release:minor` (or `dist:win` if version already bumped) on a clean machine if possible
4. Confirm `sales.db` migrations apply on first launch of the installed app
5. Confirm window title shows **Sales Management Application**
