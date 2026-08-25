# Organization setup

Screens under **General Parameters** configure the company once (or when the org structure changes). Exact labels follow the sidebar.

## App settings

**App settings** (`company-settings`) stores company-wide fields used on invoices and report headers (company name, department, service name, contact/theme options, and related company configuration).

Keep the printed company name accurate; reports read these values when they generate.

### Bottle Oil sales options

On **App settings**, under **Bottle Oil sales**:

- **Use registered customers** — Off by default. Bottle Oil invoices hide the per-invoice “Registered customer” checkbox and use an **invoice customer name** only (VAT-exempt walk-in style). When **on**, Bottle Oil invoices **require** a customer from the directory (still no per-invoice checkbox — the company setting is the switch). Special dispositions stay invoice-name only.
- **Allow Ration disposition** — Off by default. When off, Bottle Oil sales hides the **Ration** option and rejects new Ration invoices. When on, clerks can mark Bottle Oil invoices as Ration. **Public relation** is always available.

Save with **Save Bottle Oil options**. Clerks must reopen Bottle Oil sales (or refresh the screen) after you change these settings.

## Report settings

**Report settings** controls display options shared by several stock and delivery reports, notably:

- **Hide zero / empty rows** — When enabled (default), report sections omit rows with no quantity so printouts stay compact.
- **Report signatory** — History of name + title + effective-from date used on printed report footers (latest entry on or before the report as-at date).

Changing these affects the next time each report is loaded. See also [Reports](08-reports.md).

## Financial years and months

| Screen | Purpose |
|--------|---------|
| **Financial years** | Open or close a financial year. |
| **Financial months** | Open or close calendar months within the open year. |

**Rules of thumb**

- Only one year/month should be open for normal posting.
- You cannot open a **future** financial year (after the current calendar year). You can still reopen the current year or an earlier year for posting or reprinting.
- Reports use an **as at** date of the earlier of **today** and the **open month’s end**. Reopening a past month (e.g. January) to print shows figures as at that month’s close, not today’s live stock.
- If save/post fails with a period error, open the correct month first.

## Commercial services, sales points, locations

| Screen | Purpose |
|--------|---------|
| **Commercial services** | Service sites / modules used in the org model. |
| **Sales points** | Outlets (e.g. Bota, Mondoni) used on sales, DOs, and stock. |
| **Locations** | Reusable location name definitions. |
| **Storage locations** | Assign a location to a sales point; mark sellable locations used when selling stock. |

Sales invoices and stock postings always need a coherent sales point + storage location setup.

## Payment methods

Define the payment methods accepted on sales and delivery orders (cash, bank, cheque fields, etc.). At least one method is required before the sales screen allows normal paid invoices.

Kinds include **cash**, **cheque**, **bank transfer**, and other configured types. Bank-transfer methods capture reference fields as defined on the payment-method form.

## Tax regimes and tax rates

| Screen | Purpose |
|--------|---------|
| **Tax regimes** | Actual vs simplified (and related regime setup). |
| **Tax rates** | Date-effective VAT / sales-tax schedules. |

Rates are resolved as-of the invoice or DO date when calculating taxes.

Next: [Customers and products](03-customers-products.md).
