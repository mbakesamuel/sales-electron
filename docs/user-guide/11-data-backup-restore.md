# Data backup and restore

All business data (sales, delivery orders, stock, customers, settings) lives in a single SQLite file on each PC. **ADMIN** users can create and restore full-database backups from **General Parameters → Data backup**.

Report CSV/PDF exports are **not** full backups — use the in-app **Create backup** feature or the manual procedure below.

## Where data is stored

| Item | Location |
|------|----------|
| Database file | `{userData}/sales.db` |
| WAL files (while app runs) | `sales.db-wal`, `sales.db-shm` |
| Dev installs (Windows) | `%APPDATA%\sales-electron\` |
| Installed app (Windows) | Usually `%APPDATA%\Sales Management Application\` or similar (Electron user data folder) |

The installer does **not** delete this folder when you upgrade the application.

## Create a backup (in-app)

1. Sign in as **ADMIN**.
2. Open **General Parameters → Data backup**.
3. Review the data folder and database path shown on screen.
4. Click **Create backup**.
5. Choose where to save the file (default name: `sales-backup-YYYY-MM-DD-HHmm.db`).
6. Store the file on a **network share, USB drive, or synced folder** — not only on the same disk as the PC.

Backups use SQLite’s online backup API, so you can create a backup **while the app is running** without corrupting the file.

The screen shows the **last backup** created from this app (path, date, size).

## Automatic backup (in-app, while running)

**ADMIN** users can schedule a **daily automatic backup** on the same screen:

1. Open **General Parameters → Data backup**.
2. Under **Automatic backup**, click **Browse…** and choose a folder (network share, USB, or local path).
3. Set **Time of day** and how many automatic files to **keep** (older `sales-auto-backup-*.db` files are deleted).
4. Enable **automatic daily backup** and click **Save automatic backup settings**.

Automatic backups run **once per day** at the chosen time **only while the application is open**. They use the same safe online backup as **Create backup**. Use **Run automatic backup now** to test without waiting.

Settings are stored in `{userData}/backup-schedule.json` (outside the database).

## Nightly backup when the app is closed (IT / Task Scheduler)

For backups when nobody has the app open (e.g. overnight), use the PowerShell script in the repository:

`scripts/backup-windows.ps1`

**Example** (run from an elevated or backup-operator account with write access to the share):

```powershell
powershell -ExecutionPolicy Bypass -File "C:\path\to\sales-electron\scripts\backup-windows.ps1" `
  -DestinationRoot "\\fileserver\backups\sales"
```

The script:

1. Skips if **Sales Management Application** is still running.
2. Locates `sales.db` (and `-wal` / `-shm` if present) under `%APPDATA%`.
3. Copies files to `{DestinationRoot}\{PC-name}\sales-backup-{timestamp}\`.
4. Removes backup folders older than **30 days** by default (`-RetentionDays`).

**Task Scheduler setup (summary):**

1. Create a task → trigger: daily at 02:00 (or when PCs are off-shift).
2. Action: Start a program → `powershell.exe`
3. Arguments: `-ExecutionPolicy Bypass -File "…\backup-windows.ps1" -DestinationRoot "\\server\share\sales"`
4. Run whether user is logged on or not; use an account that can read AppData and write the share.
5. Test restore quarterly on a spare machine.

Dev installs use `%APPDATA%\sales-electron\`; pass `-UserDataPath` if auto-detection fails.

## Restore from a backup (in-app)

**Warning:** Restore replaces **all** application data with the selected backup. The current database is renamed to `sales.db.old-{timestamp}` in the data folder before restore.

1. Sign in as **ADMIN**.
2. Open **General Parameters → Data backup**.
3. Click **Restore from backup**.
4. Select a `.db` backup file.
5. Confirm the warning dialogs.
6. The app **restarts automatically** after a successful restore.

After restart:

- If the app version is **newer** than when the backup was taken, pending **database migrations** run automatically — this is normal.
- Restore using the **same or newer** app version when possible. Restoring a newer-schema backup into an older app may fail.

## Manual backup (when app is closed)

If the in-app backup is unavailable:

1. Ask all users to **close** Sales Management Application on that PC.
2. Copy the entire user data folder, or at minimum:
   - `sales.db`
   - `sales.db-wal` (if present)
   - `sales.db-shm` (if present)
3. Name the copy with date and machine, e.g. `sales-backup-2026-08-31-PC01.db`.

Do **not** copy only `sales.db` while the app is running unless you use the in-app backup — WAL mode can make a raw copy inconsistent.

## Manual restore (when app is closed)

1. Close the application completely.
2. Rename the current `sales.db` to `sales.db.old` (keep until you verify restore).
3. Delete `sales.db-wal` and `sales.db-shm` if present.
4. Copy the backup file into the data folder as `sales.db`.
5. Launch the app.

## Before installing an app update

Recommended:

1. Create an in-app backup (or copy the user data folder with the app closed).
2. Run the new installer over the existing app.
3. Launch once — new migrations apply; business data remains in `%APPDATA%`.

See also [PROMPT.txt](../PROMPT.txt) for the deployment update flow.

## Who can use backup/restore

Only **ADMIN** has access to the **Data backup** screen by default. Managers and other roles cannot create or restore backups unless an admin changes the permission matrix.

Next: [Troubleshooting](10-troubleshooting.md).
