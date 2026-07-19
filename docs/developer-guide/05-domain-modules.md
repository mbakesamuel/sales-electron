# Domain modules

Key main-process domains and entry files.

## Sales

| Piece | Path |
|-------|------|
| Service | `src/electron/sales/service.ts` |
| Invoice helpers | `src/electron/sales/invoice.ts` |
| Print payload | `src/electron/sales/print.ts` |
| DO list/lookup for POS | `src/electron/sales/deliveryOrders.ts` |
| IPC | `src/electron/ipc/sales.ts` |
| UI | `src/ui/sales/SalesClient.tsx` |

### Pick DO behaviour (current)

- `listAvailableDeliveryOrders({ salesPointId, customerId })` — validated DOs for that pair; **one row per product** with remaining kg; CF flagged via `sourceKind`.
- Sold qty = sum of sale lines on sales with the same `deliveryOrderNo` + product.
- UI one-click: lookup DO → `applyDoLinesFrom(lookup, productId)` loads only that product.
- Manual Lookup + Load lines still loads all remaining products.

Operator description: [Sales invoices](../user-guide/04-sales-invoices.md).

## Delivery orders

| Piece | Path |
|-------|------|
| Service | `src/electron/deliveryOrders/service.ts` |
| DO numbers | `src/electron/deliveryOrders/doNo.ts` |
| IPC | `src/electron/ipc/deliveryOrders.ts` |
| UI | `src/ui/delivery-orders/` |

Statuses: `PENDING` | `VALIDATED` | `REJECTED` (as used in types).

## Carry-forward commitments

| Piece | Path |
|-------|------|
| Service | `src/electron/commitments/carryForward.ts` |
| IPC | `src/electron/ipc/carryForward.ts` |

One validated `CARRY_FORWARD` DO per customer + sales point; lines upserted per product.

## Stock

| Piece | Path |
|-------|------|
| Core service / post | `src/electron/stock/service.ts`, `post.ts`, `sales.ts` |
| Carry-forward stock | `src/electron/stock/carryForwardStock.ts` |
| IPC | `src/electron/ipc/stock.ts`, `carryForwardStock.ts` |
| UI | stock screens under `src/ui/` (stock hub, CF stock) |

## Pricing and tax

| Piece | Path |
|-------|------|
| Unit price resolve | `src/electron/pricing/resolveUnitPrice.ts` |
| Tax rates | `src/electron/tax/resolveRates.ts` |

## Financial periods

| Piece | Path |
|-------|------|
| Service | `src/electron/financialYears/service.ts` |
| IPC | `src/electron/ipc/financialYears.ts` |

`getOpenPostingPeriod()` and `resolveReportAsAt()` are shared by posting validation and reports.

## Generic table CRUD

Schema-driven admin tables use `db:*` IPC (`tableQuery`, `tableMutations`, `tableMeta`) for list/edit UIs that are not custom domain screens.
