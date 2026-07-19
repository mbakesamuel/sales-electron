# Organization setup

Screens under **General Parameters** configure the company once (or when the org structure changes). Exact labels follow the sidebar.

## App settings

**App settings** (`company-settings`) stores company-wide fields used on invoices and report headers (company name, department, service name, contact/theme options, and related company configuration).

Keep the printed company name accurate; reports read these values when they generate.

## Report settings

**Report settings** controls display options shared by several stock and delivery reports, notably:

- **Hide zero / empty rows** — When enabled (default), report sections omit rows with no quantity so printouts stay compact.

Changing this affects the next time each report is loaded. See also [Reports](08-reports.md).

## Financial years and months

| Screen | Purpose |
|--------|---------|
| **Financial years** | Open or close a financial year. |
| **Financial months** | Open or close calendar months within the open year. |

**Rules of thumb**

- Only one year/month should be open for normal posting.
- Reports use “as at” dates clamped into the open year (and often the open month).
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

## Tax regimes and tax rates

| Screen | Purpose |
|--------|---------|
| **Tax regimes** | Actual vs simplified (and related regime setup). |
| **Tax rates** | Date-effective VAT / sales-tax schedules. |

Rates are resolved as-of the invoice or DO date when calculating taxes.

Next: [Customers and products](03-customers-products.md).
