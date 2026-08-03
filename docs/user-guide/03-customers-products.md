# Customers and products

## Customers

**Customers** holds registered accounts. Each customer normally has a **customer type**.

Customer type text (code/name) is used on the **Sales/delivery report** to classify loose palm oil into:

- Industries  
- Wholesales  
- Retail  
- CDC workers (ration) — also used when the sale disposition is **Ration**

Keep types named consistently so weekly/monthly delivery reports group sales correctly.

Invoice-only / walk-in flows (no registered customer) are available on sales for certain dispositions; see [Sales invoices](04-sales-invoices.md).

## Customer types

**Customer types** is the master list of type definitions assigned to customers.

Each type can be marked **exempt from sales tax**. When set, sales for customers of that type are treated as sales-tax exempt (tax lines / totals follow the exemption rules). Changing the flag on an existing type may require an administrator to recalculate affected sales (developers: `npm run recalc:sales-tax-exempt`).

## Products

**Products** is the catalog (name, code, category, etc.).

## Categories (important for reports)

**Categories** (`ProductCat`) include flags that reports use:

| Flag | Meaning for reporting |
|------|------------------------|
| **Main** (`isMain`) | Treated as loose / main palm oil on weekly and many stock/commitment layouts. |
| **Bottled** (`isBottled`) | Treated as bottled palm oil (jug/carton packs). |

Products that are **neither** main nor bottled (for example Palm Kernel Oil, kernel cake) appear under **Other products / PKO** on the Sales/delivery report and in dedicated sections on other reports (stock, monthly delivery).

If a product shows in the wrong report section, check its category flags first.

## Product unit prices

Sidebar label: **ProductUnit prices**. These are date-effective schedules. Sales and delivery orders resolve unit prices from these schedules (and related pricing rules) as of the document date / customer context.

Next: [Sales invoices](04-sales-invoices.md).
