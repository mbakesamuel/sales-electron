# Getting started

## Install

1. Install the Windows build (**Sales Management Application** Setup) from your IT package, or run from source with `npm run dev` (developers).
2. Launch **Sales Management Application** from the Start menu or desktop shortcut.
3. Sign in with the username and temporary password provided by your administrator. On first login the app asks you to choose a new password before you can continue.

The application stores data locally in a SQLite database on the PC (Electron user data folder).

## First-run checklist

Before day-to-day sales, an administrator (or manager with access) should confirm:

1. **Financial years** — Open the correct financial year (**General Parameters → Financial years**).
2. **Financial months** — Open the current calendar month (**General Parameters → Financial months**). Posting into a closed month is blocked.
3. **Company / app settings** — Company name and report header fields (**App settings**).
4. **Sales points and storage** — At least one sales point with storage locations (including sellable locations for POS).
5. **Payment methods** — At least one active payment method for normal sales.
6. **Products and prices** — Products in the right categories, with unit price schedules where needed.
7. **Customers** — Customer accounts with customer types (types drive loose-oil report rows such as Industries / Wholesale / Retail).
8. **Users and permissions** — Roles assigned so clerks can sell but only authorized roles can validate.

## Login and roles

Access to each sidebar screen depends on your **role**. Action rights (for example validating a sale) are separate from merely opening the Sales screen. See [Users and permissions](09-users-permissions.md).

## Daily rhythm (typical)

1. Confirm the open financial month.
2. Enter or validate delivery orders if used.
3. Create and validate sales invoices.
4. Post stock receipts / transfers as needed.
5. Print or export weekly reports at week end.

Next: [Organization setup](02-organization-setup.md).
