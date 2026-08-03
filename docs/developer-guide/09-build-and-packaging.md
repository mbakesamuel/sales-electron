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
| electron-builder `productName` / NSIS shortcut | **Sales Electron** |
| Installer artifact | `Sales Electron-Setup-{version}-win-x64.exe` under `release/` |

Operators see the window title; the Start Menu / desktop shortcut still uses **Sales Electron** until `productName` / `shortcutName` are renamed in `package.json`.

## Windows installer

```bash
npm run dist:win
# equivalent: npm run pack:win
```

Uses **electron-builder** with NSIS as configured above.

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
3. `npm run dist:win` on a clean machine if possible
4. Confirm `sales.db` migrations apply on first launch of the installed app
5. Confirm window title shows **Sales Management Application**
