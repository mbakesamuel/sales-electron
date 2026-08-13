# Sales budgets

Sidebar section: **Sales budget**.

## Sales budget phasing

Screen: **Sales budget phasing**.

Define **annual budgets by product category** — quantity (kg) and unit price (XAF/kg). Monthly phasing is edited **inline** on this screen (expand **FY months 1–12 (%)** per category). Twelve percentages must total **100%**; quantities are phased into fiscal months, then spread across ISO weeks for the crosstab views.

| Field | Notes |
|-------|--------|
| **Annual qty (kg)** | Rounded to **0 decimal places** on save; displayed with **thousand separators** (e.g. `1,250,000`). |
| **Unit price (XAF/kg)** | Shown with thousand separators; up to 2 decimal places allowed. |
| **Derived total** | Annual qty × unit price (XAF), rounded to 0 dp with thousand separators. |

The **Phasing preview** section at the bottom runs the phase engine for a chosen category without saving budget rows.

Typography and spacing on this screen match other operational modules (14px base) rather than the larger default app shell font.

## Crosstab reports (budget views)

| Screen | Purpose |
|--------|---------|
| **Sales budget phasing (monthly)** | Crosstab of phased kg by budget group × calendar month (Jan–Dec). |
| **Sales budget phasing (weekly)** | Crosstab of phased kg by ISO week × budget group × calendar month. |

These are planning views derived from category budgets + phasing, not live sales. They support **year pickers**, **Print**, **Save PDF**, and **Export CSV** like other reports. Comments can be attached per report (see [Reports](08-reports.md)).

Cell quantities use **thousand separators** and **0 decimal places**. Layout and fonts align with the main phasing screen and other report chrome.

Next: [Reports](08-reports.md).
