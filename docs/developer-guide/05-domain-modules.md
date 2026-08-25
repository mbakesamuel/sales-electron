# Domain modules

Key main-process domains and entry files.

## Booklet serial numbers (sales and DOs)

New sales invoices and delivery orders require a **manual booklet serial** entered by the operator (paper booklet). Shared validation lives in `src/shared/bookletSerial.ts` (`validateBookletSerial`): digits only, max 20 characters, non-empty. Services enforce uniqueness and immutability after create (`src/electron/sales/service.ts`, `src/electron/deliveryOrders/service.ts`).

| Kind | Numbering |
|------|-----------|
| New sale / new DO | Operator booklet serial (required) |
| Carry-forward DO | Auto `CF-{year}-{seq}` via `allocateCarryForwardDeliveryOrderNo` in `doNo.ts` |
| Legacy rows | Existing `INV-…` / `DO-…` values remain loadable |

Legacy auto-allocators `allocateDeliveryOrderNo` / `allocateInvoiceNo` in `doNo.ts` / `invoice.ts` are **unused** by create paths; do not wire new UI to them.

## Sales

| Piece | Path |
|-------|------|
| Service | `src/electron/sales/service.ts` |
| Invoice helpers (legacy allocate) | `src/electron/sales/invoice.ts` |
| Print payload | `src/electron/sales/print.ts` |
| DO list/lookup for POS | `src/electron/sales/deliveryOrders.ts` |
| IPC | `src/electron/ipc/sales.ts` |
| UI | `src/ui/sales/SalesClient.tsx`, `SalesScreen.tsx` (`variant`: `loose` \| `bottled`) |
| Routes | `sales`, `bottle-oil-sales` |

### Bottle Oil company settings

| Column | Migration | Default | Effect |
|--------|-----------|---------|--------|
| `bottleOilUseRegisteredCustomers` | `078` | off | Directory customers vs invoice name on Bottle Oil |
| `bottleOilAllowRation` | `079` | off | Whether Ration disposition is offered / accepted on Bottle Oil |

Form options expose both flags; `createSale` enforces them. The Sales UI never shows the per-invoice registered-customer checkbox on the bottled variant. Ration is hidden on Bottle Oil when `bottleOilAllowRation` is off. Admins toggle both under App settings.

### Pick DO behaviour (current)

- `listAvailableDeliveryOrders({ salesPointId, customerId })` — validated DOs for that pair; **one row per product** with remaining kg; CF flagged via `sourceKind`.
- Sold qty = sum of sale lines on sales with the same `deliveryOrderNo` + product.
- UI pick / lookup **links** the DO number and adopts the DO customer without replacing the invoice line list. Pick opens **Add line** prefilled with that product’s remaining qty and DO unit price; Lookup prefills when exactly one remaining product exists.

Operator description: [Sales invoices](../user-guide/04-sales-invoices.md).

## Delivery orders

| Piece | Path |
|-------|------|
| Service | `src/electron/deliveryOrders/service.ts` |
| DO numbers (CF allocate + unused legacy) | `src/electron/deliveryOrders/doNo.ts` |
| IPC | `src/electron/ipc/deliveryOrders.ts` |
| UI | `src/ui/delivery-orders/` (create, list, validation queue) |

Statuses: `PENDING` | `VALIDATED` | `REJECTED` (as used in types).

### Validation queue

- `listValidationQueue()` — pending DOs awaiting validation.
- `validateMany({ ids })` — bulk validate.
- UI: `src/ui/delivery-orders/validation-queue/ValidationQueueClient.tsx` (tab gated on `validate_delivery_orders`).

### DO tracking

| Piece | Path |
|-------|------|
| Builder | `src/electron/deliveryOrders/track.ts` → `trackDeliveryOrderByNo` |
| IPC | `deliveryOrders:trackByNo` |
| UI | `src/ui/delivery-orders/DeliveryOrderTrackingScreen.tsx`, `DeliveryOrderTrackingPrintView.tsx` |
| Route | `delivery-order-tracking` (migration `044`) |

Shows header, commitment by product, lift history, and transfers out. Printable tracking report uses company report header. Any DO status — not limited to validated.

### Transfer DO balance

| Piece | Path |
|-------|------|
| Service | `src/electron/deliveryOrders/transfer.ts` → `transferDeliveryOrderBalance` |
| IPC | `deliveryOrders:transferBalance` (requires `userId`; action `transfer_delivery_order_balance`) |
| UI | `src/ui/delivery-orders/DeliveryOrderTransferScreen.tsx` |
| Route | `delivery-order-transfer` (migration `045`) |

Reduces source DO `orderQty`, creates validated destination DO `DT-{year}-{seq}` with `sourceKind = TRANSFER`. Commitment only — no stock movement.

### Print

| Piece | Path |
|-------|------|
| Print payload | `src/electron/deliveryOrders/print.ts` |
| IPC | `deliveryOrders:getPrintById` |
| UI | `src/ui/delivery-orders/DeliveryOrderPrintView.tsx` |

## Carry-forward commitments

| Piece | Path |
|-------|------|
| Service | `src/electron/commitments/carryForward.ts` |
| IPC | `src/electron/ipc/carryForward.ts` |

One validated `CARRY_FORWARD` DO per customer + sales point; lines upserted per product. Uses auto CF numbering (not booklet serials).

## Stock

| Piece | Path |
|-------|------|
| Core service / post | `src/electron/stock/service.ts`, `post.ts`, `sales.ts` |
| Carry-forward stock | `src/electron/stock/carryForwardStock.ts` |
| IPC | `src/electron/ipc/stock.ts`, `carryForwardStock.ts` |
| UI | stock screens under `src/ui/` (stock hub, CF stock) |

`applyMovement` in `post.ts` enforces storage location occupancy: bottled products may co-mingle; non-bottled products are one SKU per location; bottled and bulk stock cannot share a location (non-zero on-hand).

### Bin card

| Piece | Path |
|-------|------|
| Builder | `src/electron/stock/binCard.ts` → `getBinCard(userId, query)` |
| Types | `src/shared/stock.types.ts` (`BinCardQuery`, `BinCardReport`) |
| IPC | `stock:getBinCard` in `src/electron/ipc/stock.ts` |
| UI (filters + table) | `src/ui/stock/BinCardScreen.tsx` |
| UI (print window) | `src/ui/stock/BinCardReportScreen.tsx` |
| Report route | `stock-bin-card-report` in `REPORT_WINDOW_ROUTE_IDS` |

The main screen posts filters to `windows:openReport` with a **`query`** payload (bottled product, date range, optional sales point / location / condition). Bin card is **bottled products only** (enforced in `getBinCard` and the product picker). The report window bootstraps via `report-window:bootstrap` and renders with shared report chrome (`StockCommitmentReport.css` + `BinCardReport.css`). Report window size is **A4 portrait** (~820×1120). Permissions: migration `051_stock_bin_card_permissions.sql` (copied from stock-movements / stock-balance routes).

## Pricing and tax

| Piece | Path |
|-------|------|
| Unit price resolve | `src/electron/pricing/resolveUnitPrice.ts` |
| Tax rates | `src/electron/tax/resolveRates.ts` |

Customer types may set `exemptFromSalesTax` (migration `036`). Sales for those types follow exemption rules; `npm run recalc:sales-tax-exempt` recalculates affected historical sales when needed.

## Financial periods

| Piece | Path |
|-------|------|
| Service | `src/electron/financialYears/service.ts` |
| IPC | `src/electron/ipc/financialYears.ts` |

`getOpenPostingPeriod()` and `resolveReportAsAt()` are shared by posting validation and reports. On startup, `backfillFinancialMonths()` fills missing month rows for open years. `openYear(year)` rejects years after the local calendar year so a future period cannot become the posting year by mistake; past and current years can still be opened.

## Dashboard

| Piece | Path |
|-------|------|
| Summary builder | `src/electron/dashboard/summary.ts` |
| IPC | `src/electron/ipc/dashboard.ts` |
| UI | `src/ui/dashboard/` (Overview route) |

Authenticated helper: `getAuthenticatedDashboard()` in the UI auth layer.

## Generic table CRUD

Schema-driven admin tables use `db:*` IPC (`tableQuery`, `tableMutations`, `tableMeta`) for list/edit UIs that are not custom domain screens.
