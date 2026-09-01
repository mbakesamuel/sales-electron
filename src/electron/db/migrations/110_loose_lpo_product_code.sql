-- Ensure the canonical loose palm oil SKU is identifiable by product code LPO.

UPDATE Product
SET productCode = 'LPO',
    updatedAt = datetime('now')
WHERE UPPER(TRIM(productName)) = 'LOOSE PALM OIL'
  AND (productCode IS NULL OR TRIM(productCode) = '');
