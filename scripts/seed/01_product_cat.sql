-- Product categories
-- Palm Oil: main loose-oil category (isMain = 1)
-- Bottled Oil: bottled POS category (isBottled = 1)

INSERT INTO ProductCat (productCatId, productCat, productCode, isMain, isBottled)
SELECT 1, 'Palm Oil', 'PO', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM ProductCat WHERE productCatId = 1);

INSERT INTO ProductCat (productCatId, productCat, productCode, isMain, isBottled)
SELECT 2, 'Bottled Oil', 'BO', 0, 1
WHERE NOT EXISTS (SELECT 1 FROM ProductCat WHERE productCatId = 2);
