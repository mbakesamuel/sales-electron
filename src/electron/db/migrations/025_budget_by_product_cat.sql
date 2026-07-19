-- Budget by product category: re-key ProductSalesBudget and phase profiles
-- from productId to productCatId.

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS ProductSalesBudget_cat (
  id TEXT PRIMARY KEY NOT NULL,
  financialYear INTEGER NOT NULL,
  productCatId INTEGER NOT NULL REFERENCES ProductCat(productCatId),
  annualQtyKg TEXT NOT NULL,
  budgetUnitPricePerKg TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (financialYear, productCatId)
);

INSERT INTO ProductSalesBudget_cat (
  id, financialYear, productCatId, annualQtyKg, budgetUnitPricePerKg, createdAt, updatedAt
)
SELECT
  b.id,
  b.financialYear,
  p.productCatId,
  b.annualQtyKg,
  b.budgetUnitPricePerKg,
  b.createdAt,
  b.updatedAt
FROM ProductSalesBudget b
INNER JOIN Product p ON p.productId = b.productId
WHERE NOT EXISTS (
  SELECT 1
  FROM ProductSalesBudget b2
  INNER JOIN Product p2 ON p2.productId = b2.productId
  WHERE b2.financialYear = b.financialYear
    AND p2.productCatId = p.productCatId
    AND (
      CAST(b2.annualQtyKg AS REAL) > CAST(b.annualQtyKg AS REAL)
      OR (
        CAST(b2.annualQtyKg AS REAL) = CAST(b.annualQtyKg AS REAL)
        AND b2.updatedAt > b.updatedAt
      )
      OR (
        CAST(b2.annualQtyKg AS REAL) = CAST(b.annualQtyKg AS REAL)
        AND b2.updatedAt = b.updatedAt
        AND b2.id > b.id
      )
    )
);

DROP TABLE IF EXISTS ProductSalesBudget;
ALTER TABLE ProductSalesBudget_cat RENAME TO ProductSalesBudget;
CREATE INDEX IF NOT EXISTS ProductSalesBudget_year_idx ON ProductSalesBudget (financialYear);

CREATE TABLE IF NOT EXISTS ProductSalesBudgetMonthPhaseProfile_cat (
  id TEXT PRIMARY KEY NOT NULL,
  financialYear INTEGER NOT NULL,
  productCatId INTEGER NOT NULL REFERENCES ProductCat(productCatId) ON DELETE CASCADE,
  pctM01 TEXT NOT NULL,
  pctM02 TEXT NOT NULL,
  pctM03 TEXT NOT NULL,
  pctM04 TEXT NOT NULL,
  pctM05 TEXT NOT NULL,
  pctM06 TEXT NOT NULL,
  pctM07 TEXT NOT NULL,
  pctM08 TEXT NOT NULL,
  pctM09 TEXT NOT NULL,
  pctM10 TEXT NOT NULL,
  pctM11 TEXT NOT NULL,
  pctM12 TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (financialYear, productCatId)
);

INSERT INTO ProductSalesBudgetMonthPhaseProfile_cat (
  id, financialYear, productCatId,
  pctM01, pctM02, pctM03, pctM04, pctM05, pctM06,
  pctM07, pctM08, pctM09, pctM10, pctM11, pctM12,
  createdAt, updatedAt
)
SELECT
  ph.id,
  ph.financialYear,
  p.productCatId,
  ph.pctM01, ph.pctM02, ph.pctM03, ph.pctM04, ph.pctM05, ph.pctM06,
  ph.pctM07, ph.pctM08, ph.pctM09, ph.pctM10, ph.pctM11, ph.pctM12,
  ph.createdAt,
  ph.updatedAt
FROM ProductSalesBudgetMonthPhaseProfile ph
INNER JOIN Product p ON p.productId = ph.productId
WHERE NOT EXISTS (
  SELECT 1
  FROM ProductSalesBudgetMonthPhaseProfile ph2
  INNER JOIN Product p2 ON p2.productId = ph2.productId
  WHERE ph2.financialYear = ph.financialYear
    AND p2.productCatId = p.productCatId
    AND (
      ph2.updatedAt > ph.updatedAt
      OR (ph2.updatedAt = ph.updatedAt AND ph2.id > ph.id)
    )
);

DROP TABLE IF EXISTS ProductSalesBudgetMonthPhaseProfile;
ALTER TABLE ProductSalesBudgetMonthPhaseProfile_cat RENAME TO ProductSalesBudgetMonthPhaseProfile;
CREATE INDEX IF NOT EXISTS ProductSalesBudgetMonthPhaseProfile_year_idx
  ON ProductSalesBudgetMonthPhaseProfile (financialYear);

PRAGMA foreign_keys = ON;
