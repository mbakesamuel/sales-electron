-- Bottled SKUs use direct schedule rows (customerTypeId null).

UPDATE ProductUnitPriceSchedule
SET customerTypeId = NULL
WHERE id = 'seed-price-bottle';

INSERT INTO ProductUnitPriceSchedule (id, productId, unitPriceExTax, effectiveFrom, customerTypeId)
SELECT 'seed-price-bottle', 3, '1200', '2020-01-01', NULL
WHERE NOT EXISTS (SELECT 1 FROM ProductUnitPriceSchedule WHERE id = 'seed-price-bottle');
