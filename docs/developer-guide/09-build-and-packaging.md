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

## Windows installer

```bash
npm run dist:win
# equivalent: npm run pack:win
```

Uses **electron-builder** with NSIS, product name **Sales Electron**, artifact  
`Sales Electron-Setup-{version}-win-x64.exe` under `release/`.

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
2. Smoke-test login, open month, create sale, one report print
3. `npm run dist:win` on a clean machine if possible
4. Confirm `sales.db` migrations apply on first launch of the installed app
