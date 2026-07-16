-- Product unit prices for delivery order pricing preview.

INSERT INTO ProductUnitPriceSchedule (id, productId, unitPriceExTax, effectiveFrom, customerTypeId)
SELECT 'seed-price-po-a', 1, '500', '2020-01-01', 'seed-ct-retail'
WHERE NOT EXISTS (SELECT 1 FROM ProductUnitPriceSchedule WHERE id = 'seed-price-po-a');

INSERT INTO ProductUnitPriceSchedule (id, productId, unitPriceExTax, effectiveFrom, customerTypeId)
SELECT 'seed-price-po-b', 2, '480', '2020-01-01', 'seed-ct-retail'
WHERE NOT EXISTS (SELECT 1 FROM ProductUnitPriceSchedule WHERE id = 'seed-price-po-b');

INSERT INTO ProductUnitPriceSchedule (id, productId, unitPriceExTax, effectiveFrom, customerTypeId)
SELECT 'seed-price-bottle', 3, '1200', '2020-01-01', 'seed-ct-retail'
WHERE NOT EXISTS (SELECT 1 FROM ProductUnitPriceSchedule WHERE id = 'seed-price-bottle');
