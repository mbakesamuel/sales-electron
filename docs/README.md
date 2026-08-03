# Sales Management Application documentation

Dual-audience documentation for the Sales Management Application desktop app (installer / package name **Sales Electron**).

## User guide (operators)

Step-by-step workflows for day-to-day use.

1. [Overview](user-guide/00-overview.md)
2. [Getting started](user-guide/01-getting-started.md)
3. [Organization setup](user-guide/02-organization-setup.md)
4. [Customers and products](user-guide/03-customers-products.md)
5. [Sales invoices](user-guide/04-sales-invoices.md)
6. [Delivery orders](user-guide/05-delivery-orders.md)
7. [Inventory and stock](user-guide/06-inventory-stock.md)
8. [Sales budgets](user-guide/07-sales-budgets.md)
9. [Reports](user-guide/08-reports.md)
10. [Users and permissions](user-guide/09-users-permissions.md)
11. [Troubleshooting](user-guide/10-troubleshooting.md)

## Developer guide

Architecture, database, IPC, and how to extend the app.

1. [Overview](developer-guide/00-overview.md)
2. [Architecture](developer-guide/01-architecture.md)
3. [Dev setup](developer-guide/02-dev-setup.md)
4. [Database and migrations](developer-guide/03-database-migrations.md)
5. [Auth and permissions](developer-guide/04-auth-permissions.md)
6. [Domain modules](developer-guide/05-domain-modules.md)
7. [Reports engine](developer-guide/06-reports-engine.md)
8. [IPC and preload](developer-guide/07-ipc-and-preload.md)
9. [UI structure](developer-guide/08-ui-structure.md)
10. [Build and packaging](developer-guide/09-build-and-packaging.md)

## Related

- Product landing page: [../README.md](../README.md)

## Export PDF / Word

```bash
npm run docs:export
```

Writes two separate guides (PDF + DOCX each) under [`export/`](export/):

- `Sales-Management-Application-User-Guide.pdf` / `.docx`
- `Sales-Management-Application-Developer-Guide.pdf` / `.docx`
