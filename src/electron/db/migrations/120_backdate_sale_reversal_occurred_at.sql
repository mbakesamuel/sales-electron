-- 120_backdate_sale_reversal_occurred_at.sql
-- Align SALE_REVERSAL movement dates with the original SALE so open-month
-- stock reports (as-of period end) include the stock restore.

UPDATE StockMovement AS rev
SET occurredAt = (
  SELECT sale.occurredAt
  FROM StockMovement AS sale
  WHERE sale.sourceKind = 'SALE'
    AND sale.sourceId = rev.sourceId
    AND sale.kind = 'SALE'
    AND sale.productId = rev.productId
    AND (
      (sale.storageLocationId IS NULL AND rev.storageLocationId IS NULL)
      OR sale.storageLocationId = rev.storageLocationId
    )
  ORDER BY sale.createdAt ASC
  LIMIT 1
)
WHERE rev.kind = 'SALE_REVERSAL'
  AND rev.sourceKind = 'SALE'
  AND EXISTS (
    SELECT 1
    FROM StockMovement AS sale
    WHERE sale.sourceKind = 'SALE'
      AND sale.sourceId = rev.sourceId
      AND sale.kind = 'SALE'
      AND sale.productId = rev.productId
      AND (
        (sale.storageLocationId IS NULL AND rev.storageLocationId IS NULL)
        OR sale.storageLocationId = rev.storageLocationId
      )
  );
