-- Sales Electron — full schema translated from Prisma/PostgreSQL to SQLite
-- Fresh install only. Delete sales.db before applying if replacing an old schema.

PRAGMA foreign_keys = OFF;

-- ---------------------------------------------------------------------------
-- Reference / config
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS FinancialYearPeriod (
  id TEXT PRIMARY KEY NOT NULL,
  financialYear INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  openedAt TEXT NOT NULL DEFAULT (datetime('now')),
  closedAt TEXT,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS FinancialYearPeriod_status_idx ON FinancialYearPeriod (status);

CREATE TABLE IF NOT EXISTS FinancialMonth (
  id TEXT PRIMARY KEY NOT NULL,
  financialYearPeriodId TEXT NOT NULL REFERENCES FinancialYearPeriod(id) ON DELETE CASCADE,
  financialYear INTEGER NOT NULL,
  calendarMonth INTEGER NOT NULL CHECK (calendarMonth BETWEEN 1 AND 12),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CLOSED' CHECK (status IN ('OPEN', 'CLOSED')),
  openedAt TEXT,
  closedAt TEXT,
  UNIQUE (financialYearPeriodId, calendarMonth)
);
CREATE INDEX IF NOT EXISTS FinancialMonth_period_status_idx
  ON FinancialMonth (financialYearPeriodId, status);
CREATE INDEX IF NOT EXISTS FinancialMonth_year_month_idx
  ON FinancialMonth (financialYear, calendarMonth);

CREATE TABLE IF NOT EXISTS CommercialService (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  invoicePrefix TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  isActive INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1)),
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  siteKind TEXT NOT NULL DEFAULT 'SALES_POINT' CHECK (siteKind IN ('SALES_POINT', 'FACTORY')),
  enabledModules TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS Factory (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  commercialServiceId TEXT NOT NULL REFERENCES CommercialService(id),
  isActive INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1)),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (commercialServiceId, name)
);
CREATE INDEX IF NOT EXISTS Factory_service_active_idx ON Factory (commercialServiceId, isActive);

CREATE TABLE IF NOT EXISTS CommercialInvoiceSequence (
  commercialServiceId TEXT NOT NULL REFERENCES CommercialService(id) ON DELETE CASCADE,
  calendarYear INTEGER NOT NULL,
  nextNumber INTEGER NOT NULL DEFAULT 1,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (commercialServiceId, calendarYear)
);

CREATE TABLE IF NOT EXISTS CompanySettings (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'default',
  companyName TEXT NOT NULL,
  department TEXT,
  vatRate TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  fiscalYearStartMonth INTEGER NOT NULL DEFAULT 1,
  logoUrl TEXT,
  uiThemePreset TEXT NOT NULL DEFAULT 'agro' CHECK (uiThemePreset IN ('agro', 'dark')),
  hideZeroReportRows INTEGER NOT NULL DEFAULT 1 CHECK (hideZeroReportRows IN (0, 1)),
  stockCommitmentReportComments TEXT,
  reportCommentsJson TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS DeliveryOrderSequence (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'default',
  nextNumber INTEGER NOT NULL DEFAULT 1,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS VehicleConsignmentNoteSequence (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'default',
  nextNumber INTEGER NOT NULL DEFAULT 1,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Mill (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ProductCat (
  productCatId INTEGER PRIMARY KEY AUTOINCREMENT,
  productCat TEXT NOT NULL,
  productCode TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  isMain INTEGER NOT NULL DEFAULT 0 CHECK (isMain IN (0, 1)),
  isBottled INTEGER NOT NULL DEFAULT 0 CHECK (isBottled IN (0, 1))
);
CREATE UNIQUE INDEX IF NOT EXISTS ProductCat_isMain_unique ON ProductCat (isMain) WHERE isMain = 1;
CREATE UNIQUE INDEX IF NOT EXISTS ProductCat_isBottled_unique ON ProductCat (isBottled) WHERE isBottled = 1;

CREATE TABLE IF NOT EXISTS CustomerTypeDefinition (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  isActive INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1)),
  isSystem INTEGER NOT NULL DEFAULT 0 CHECK (isSystem IN (0, 1)),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS CustomerTypeDefinition_active_sort_idx ON CustomerTypeDefinition (isActive, sortOrder);

CREATE TABLE IF NOT EXISTS TaxRegime (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  kind TEXT NOT NULL DEFAULT 'SIMPLIFIED' CHECK (kind IN ('SIMPLIFIED', 'REAL')),
  commercialServiceId TEXT REFERENCES CommercialService(id),
  UNIQUE (commercialServiceId, name)
);
CREATE INDEX IF NOT EXISTS TaxRegime_service_idx ON TaxRegime (commercialServiceId);

CREATE TABLE IF NOT EXISTS TaxRateSchedule (
  id TEXT PRIMARY KEY NOT NULL,
  rateKind TEXT NOT NULL CHECK (
    rateKind IN ('VAT', 'SALES_ACTUAL', 'SALES_SIMPLIFIED', 'SALES_NO_TAXPAYER')
  ),
  rate TEXT NOT NULL,
  effectiveFrom TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (rateKind, effectiveFrom)
);
CREATE INDEX IF NOT EXISTS TaxRateSchedule_kind_from_idx
  ON TaxRateSchedule (rateKind, effectiveFrom);

CREATE TABLE IF NOT EXISTS PaymentMethodDefinition (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('SIMPLE','CHEQUE','TRAITE','CREDIT')),
  sortOrder INTEGER NOT NULL DEFAULT 0,
  isActive INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1)),
  isSystem INTEGER NOT NULL DEFAULT 0 CHECK (isSystem IN (0, 1)),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS PaymentMethodDefinition_active_sort_idx ON PaymentMethodDefinition (isActive, sortOrder);

CREATE TABLE IF NOT EXISTS SalesPoint (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  millId INTEGER REFERENCES Mill(id),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS SalesPoint_mill_idx ON SalesPoint (millId);

-- ---------------------------------------------------------------------------
-- Users & auth (User FK targets created above except self-references)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'SALES_CLERK' CHECK (role IN ('ADMIN','MANAGER','SENIOR_SALES_SUPERVISOR','STATISTICS_SUPERVISOR','SALES_CLERK')),
  isActive INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1)),
  username TEXT NOT NULL UNIQUE,
  passwordPlain TEXT,
  salesPointId INTEGER REFERENCES SalesPoint(id),
  passwordHash TEXT,
  commercialServiceId TEXT REFERENCES CommercialService(id),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS User_commercialService_idx ON User (commercialServiceId);

CREATE TABLE IF NOT EXISTS AuthSession (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
  tokenHash TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  expiresAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS AuthSession_user_idx ON AuthSession (userId);
CREATE INDEX IF NOT EXISTS AuthSession_expires_idx ON AuthSession (expiresAt);

CREATE TABLE IF NOT EXISTS MobileRefreshToken (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
  tokenHash TEXT NOT NULL UNIQUE,
  deviceLabel TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  expiresAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS MobileRefreshToken_user_idx ON MobileRefreshToken (userId);
CREATE INDEX IF NOT EXISTS MobileRefreshToken_expires_idx ON MobileRefreshToken (expiresAt);

-- ---------------------------------------------------------------------------
-- Catalog & pricing
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS Product (
  productId INTEGER PRIMARY KEY AUTOINCREMENT,
  productName TEXT NOT NULL,
  productCode TEXT,
  productCatId INTEGER NOT NULL REFERENCES ProductCat(productCatId),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  commercialServiceId TEXT REFERENCES CommercialService(id),
  uom TEXT NOT NULL DEFAULT 'Kg'
);

CREATE TABLE IF NOT EXISTS ProductSalesBudgetMonthPhaseProfile (
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
CREATE INDEX IF NOT EXISTS ProductSalesBudgetMonthPhaseProfile_year_idx ON ProductSalesBudgetMonthPhaseProfile (financialYear);

CREATE TABLE IF NOT EXISTS ProductSalesBudget (
  id TEXT PRIMARY KEY NOT NULL,
  financialYear INTEGER NOT NULL,
  productCatId INTEGER NOT NULL REFERENCES ProductCat(productCatId),
  annualQtyKg TEXT NOT NULL,
  budgetUnitPricePerKg TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (financialYear, productCatId)
);
CREATE INDEX IF NOT EXISTS ProductSalesBudget_year_idx ON ProductSalesBudget (financialYear);

CREATE TABLE IF NOT EXISTS ProductUnitPriceSchedule (
  id TEXT PRIMARY KEY NOT NULL,
  productId INTEGER NOT NULL REFERENCES Product(productId),
  unitPriceExTax TEXT NOT NULL,
  effectiveFrom TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  customerTypeId TEXT REFERENCES CustomerTypeDefinition(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS ProductUnitPriceSchedule_product_from_idx ON ProductUnitPriceSchedule (productId, effectiveFrom);
CREATE INDEX IF NOT EXISTS ProductUnitPriceSchedule_customerType_idx ON ProductUnitPriceSchedule (customerTypeId);
CREATE UNIQUE INDEX IF NOT EXISTS ProductUnitPriceSchedule_product_customer_effective_key
  ON ProductUnitPriceSchedule (productId, customerTypeId, effectiveFrom)
  WHERE customerTypeId IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ProductUnitPriceSchedule_product_effective_direct_key
  ON ProductUnitPriceSchedule (productId, effectiveFrom)
  WHERE customerTypeId IS NULL;

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS Customer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  taxRegimeId TEXT REFERENCES TaxRegime(id) ON DELETE RESTRICT,
  taxpayerId TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  residency TEXT NOT NULL DEFAULT 'LOCAL' CHECK (residency IN ('LOCAL', 'OVERSEAS')),
  hasTaxpayerId INTEGER NOT NULL DEFAULT 0 CHECK (hasTaxpayerId IN (0, 1)),
  isPosPlaceholder INTEGER NOT NULL DEFAULT 0 CHECK (isPosPlaceholder IN (0, 1)),
  commercialServiceId TEXT NOT NULL REFERENCES CommercialService(id),
  customerTypeId TEXT NOT NULL REFERENCES CustomerTypeDefinition(id)
);
CREATE INDEX IF NOT EXISTS Customer_name_idx ON Customer (name);
CREATE INDEX IF NOT EXISTS Customer_taxRegime_idx ON Customer (taxRegimeId);
CREATE INDEX IF NOT EXISTS Customer_commercialService_idx ON Customer (commercialServiceId);
CREATE INDEX IF NOT EXISTS Customer_customerType_idx ON Customer (customerTypeId);

-- ---------------------------------------------------------------------------
-- Sales
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS Sale (
  id TEXT PRIMARY KEY NOT NULL,
  invoiceNo TEXT NOT NULL UNIQUE,
  soldAt TEXT NOT NULL DEFAULT (datetime('now')),
  customerId INTEGER NOT NULL REFERENCES Customer(id),
  createdByUserId TEXT NOT NULL REFERENCES User(id),
  customerNameSnapshot TEXT NOT NULL,
  taxRegimeId TEXT REFERENCES TaxRegime(id) ON DELETE RESTRICT,
  vatRateSnapshot TEXT NOT NULL,
  netAmount TEXT NOT NULL,
  vatAmount TEXT NOT NULL,
  grossAmount TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  financialYear INTEGER,
  financialMonth INTEGER,
  referenceNumber TEXT,
  salesPointId INTEGER REFERENCES SalesPoint(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','VALIDATED','REJECTED')),
  validatedAt TEXT,
  validatedByUserId TEXT REFERENCES User(id),
  vehicleNumber TEXT NOT NULL,
  dateIssued TEXT NOT NULL,
  deliveryOrderNo TEXT,
  postingCalendarYear INTEGER,
  commercialServiceId TEXT REFERENCES CommercialService(id),
  issuerPhoneSnapshot TEXT,
  issuerAddressSnapshot TEXT,
  commercialServiceNameSnapshot TEXT,
  saleProductMode TEXT CHECK (saleProductMode IS NULL OR saleProductMode IN ('LOOSE','BOTTLE')),
  saleDisposition TEXT DEFAULT 'NORMAL' CHECK (saleDisposition IS NULL OR saleDisposition IN ('NORMAL','RATION','PUBLIC_RELATION'))
);
CREATE INDEX IF NOT EXISTS Sale_soldAt_idx ON Sale (soldAt);
CREATE INDEX IF NOT EXISTS Sale_customer_soldAt_idx ON Sale (customerId, soldAt);
CREATE INDEX IF NOT EXISTS Sale_createdBy_soldAt_idx ON Sale (createdByUserId, soldAt);
CREATE INDEX IF NOT EXISTS Sale_taxRegime_soldAt_idx ON Sale (taxRegimeId, soldAt);
CREATE INDEX IF NOT EXISTS Sale_fy_posting_idx ON Sale (financialYear, postingCalendarYear, financialMonth);
CREATE INDEX IF NOT EXISTS Sale_status_soldAt_idx ON Sale (status, soldAt);
CREATE INDEX IF NOT EXISTS Sale_deliveryOrderNo_idx ON Sale (deliveryOrderNo);
CREATE INDEX IF NOT EXISTS Sale_commercialService_idx ON Sale (commercialServiceId);

CREATE TABLE IF NOT EXISTS Location (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  locationName TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS StorageLocation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  salesPointId INTEGER NOT NULL REFERENCES SalesPoint(id) ON DELETE CASCADE,
  locationId INTEGER NOT NULL REFERENCES Location(id) ON DELETE RESTRICT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  isDefault INTEGER NOT NULL DEFAULT 0 CHECK (isDefault IN (0, 1)),
  isSellable INTEGER NOT NULL DEFAULT 1 CHECK (isSellable IN (0, 1)),
  UNIQUE (salesPointId, locationId)
);
CREATE INDEX IF NOT EXISTS StorageLocation_salesPoint_idx ON StorageLocation (salesPointId);
CREATE INDEX IF NOT EXISTS StorageLocation_location_idx ON StorageLocation (locationId);

CREATE TABLE IF NOT EXISTS SaleLine (
  id TEXT PRIMARY KEY NOT NULL,
  saleId TEXT NOT NULL REFERENCES Sale(id) ON DELETE CASCADE,
  productId INTEGER NOT NULL REFERENCES Product(productId),
  qtyKg TEXT NOT NULL,
  unitPricePerKg TEXT NOT NULL,
  lineNet TEXT NOT NULL,
  lineVat TEXT NOT NULL,
  lineGross TEXT NOT NULL,
  qtyUnits TEXT,
  unitPricePerUnit TEXT,
  storageLocationId INTEGER REFERENCES StorageLocation(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS SaleLine_sale_idx ON SaleLine (saleId);
CREATE INDEX IF NOT EXISTS SaleLine_product_idx ON SaleLine (productId);
CREATE INDEX IF NOT EXISTS SaleLine_storageLocation_idx ON SaleLine (storageLocationId);

CREATE TABLE IF NOT EXISTS SaleAppliedTax (
  id TEXT PRIMARY KEY NOT NULL,
  saleId TEXT NOT NULL REFERENCES Sale(id) ON DELETE CASCADE,
  taxTypeId TEXT,
  codeSnapshot TEXT NOT NULL,
  labelSnapshot TEXT NOT NULL,
  rateSnapshot TEXT NOT NULL,
  amount TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS SaleAppliedTax_sale_idx ON SaleAppliedTax (saleId);

CREATE TABLE IF NOT EXISTS Payment (
  id TEXT PRIMARY KEY NOT NULL,
  saleId TEXT NOT NULL REFERENCES Sale(id) ON DELETE CASCADE,
  amount TEXT NOT NULL,
  chequeNo TEXT,
  paidAt TEXT NOT NULL DEFAULT (datetime('now')),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  bank TEXT,
  traiteNo TEXT,
  traiteIssuedOn TEXT,
  traiteMaturityOn TEXT,
  paymentMethodId TEXT NOT NULL REFERENCES PaymentMethodDefinition(id)
);
CREATE INDEX IF NOT EXISTS Payment_sale_idx ON Payment (saleId);
CREATE INDEX IF NOT EXISTS Payment_method_paidAt_idx ON Payment (paymentMethodId, paidAt);

-- ---------------------------------------------------------------------------
-- Delivery orders
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS DeliveryOrder (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deliveryOrderNo TEXT NOT NULL UNIQUE,
  dateIssued TEXT NOT NULL,
  customerId INTEGER NOT NULL REFERENCES Customer(id),
  orderRef TEXT,
  salesPointId INTEGER NOT NULL REFERENCES SalesPoint(id),
  financialYear INTEGER,
  financialMonth INTEGER,
  createdByUserId TEXT REFERENCES User(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','VALIDATED','REJECTED')),
  validatedAt TEXT,
  validatedByUserId TEXT REFERENCES User(id),
  postingCalendarYear INTEGER,
  commercialServiceId TEXT REFERENCES CommercialService(id),
  issuerPhoneSnapshot TEXT,
  issuerAddressSnapshot TEXT,
  commercialServiceNameSnapshot TEXT,
  reviewedAt TEXT,
  reviewedByUserId TEXT REFERENCES User(id),
  cancelledAt TEXT,
  cancelledByUserId TEXT REFERENCES User(id),
  cancelReason TEXT,
  sourceKind TEXT NOT NULL DEFAULT 'NORMAL' CHECK (sourceKind IN ('NORMAL','CARRY_FORWARD'))
);
CREATE INDEX IF NOT EXISTS DeliveryOrder_customer_idx ON DeliveryOrder (customerId);
CREATE INDEX IF NOT EXISTS DeliveryOrder_salesPoint_idx ON DeliveryOrder (salesPointId);
CREATE INDEX IF NOT EXISTS DeliveryOrder_fy_posting_idx ON DeliveryOrder (financialYear, postingCalendarYear, financialMonth);
CREATE INDEX IF NOT EXISTS DeliveryOrder_status_date_idx ON DeliveryOrder (status, dateIssued);
CREATE INDEX IF NOT EXISTS DeliveryOrder_status_reviewed_idx ON DeliveryOrder (status, reviewedAt);
CREATE INDEX IF NOT EXISTS DeliveryOrder_status_cancelled_idx ON DeliveryOrder (status, cancelledAt);
CREATE INDEX IF NOT EXISTS DeliveryOrder_commercialService_idx ON DeliveryOrder (commercialServiceId);

CREATE TABLE IF NOT EXISTS DeliveryOrderDetails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deliveryOrderId INTEGER NOT NULL REFERENCES DeliveryOrder(id) ON DELETE CASCADE,
  productId INTEGER NOT NULL REFERENCES Product(productId),
  orderQty INTEGER NOT NULL,
  orderUnit TEXT,
  unitPrice TEXT,
  amount TEXT,
  lineSubtotalExTax TEXT,
  vatRate TEXT,
  vatAmount TEXT,
  otherTaxLabel TEXT,
  otherTaxAmount TEXT
);
CREATE INDEX IF NOT EXISTS DeliveryOrderDetails_order_idx ON DeliveryOrderDetails (deliveryOrderId);

CREATE TABLE IF NOT EXISTS DeliveryOrderPaymentDetails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deliveryOrderId INTEGER NOT NULL REFERENCES DeliveryOrder(id) ON DELETE CASCADE,
  paymentDate TEXT NOT NULL,
  chequeNo TEXT,
  bank TEXT,
  cashReceiptNo TEXT,
  receiptDate TEXT,
  paymentMethodId TEXT NOT NULL REFERENCES PaymentMethodDefinition(id)
);
CREATE INDEX IF NOT EXISTS DeliveryOrderPaymentDetails_order_idx ON DeliveryOrderPaymentDetails (deliveryOrderId);

CREATE TABLE IF NOT EXISTS VehicleConsignmentNote (
  id TEXT PRIMARY KEY NOT NULL,
  consignmentNoteNo TEXT NOT NULL UNIQUE,
  saleId TEXT NOT NULL UNIQUE REFERENCES Sale(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  dateOfLifting TEXT NOT NULL,
  vehicleNumber TEXT NOT NULL,
  consignerName TEXT NOT NULL,
  dateOfConsignment TEXT NOT NULL,
  receiverName TEXT NOT NULL,
  receiverNicNo TEXT NOT NULL,
  receiverNicPlaceOfIssue TEXT NOT NULL,
  receivedDate TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','VALIDATED','REJECTED')),
  validatedAt TEXT,
  validatedByUserId TEXT REFERENCES User(id),
  createdByUserId TEXT NOT NULL REFERENCES User(id),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  consignerDesignation TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS VehicleConsignmentNote_sale_idx ON VehicleConsignmentNote (saleId);
CREATE INDEX IF NOT EXISTS VehicleConsignmentNote_no_idx ON VehicleConsignmentNote (consignmentNoteNo);
CREATE INDEX IF NOT EXISTS VehicleConsignmentNote_status_idx ON VehicleConsignmentNote (status);

-- ---------------------------------------------------------------------------
-- Stock
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS StockReceiptSequence (
  calendarYear INTEGER PRIMARY KEY NOT NULL,
  nextNumber INTEGER NOT NULL DEFAULT 1,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS StockTransferSequence (
  calendarYear INTEGER PRIMARY KEY NOT NULL,
  nextNumber INTEGER NOT NULL DEFAULT 1,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS StockAdjustmentSequence (
  calendarYear INTEGER PRIMARY KEY NOT NULL,
  nextNumber INTEGER NOT NULL DEFAULT 1,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS StockReceipt (
  id TEXT PRIMARY KEY NOT NULL,
  receiptNo TEXT NOT NULL UNIQUE,
  salesPointId INTEGER NOT NULL REFERENCES SalesPoint(id),
  receivedAt TEXT NOT NULL,
  supplierLabel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','POSTED','DISPATCHED','RECEIVED','CANCELLED')),
  notes TEXT,
  createdByUserId TEXT NOT NULL REFERENCES User(id),
  postedByUserId TEXT REFERENCES User(id),
  postedAt TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS StockReceipt_point_date_idx ON StockReceipt (salesPointId, receivedAt);
CREATE INDEX IF NOT EXISTS StockReceipt_status_date_idx ON StockReceipt (status, receivedAt);

CREATE TABLE IF NOT EXISTS StockReceiptLine (
  id TEXT PRIMARY KEY NOT NULL,
  receiptId TEXT NOT NULL REFERENCES StockReceipt(id) ON DELETE CASCADE,
  productId INTEGER NOT NULL REFERENCES Product(productId),
  qty TEXT NOT NULL,
  storageLocationId INTEGER NOT NULL REFERENCES StorageLocation(id)
);
CREATE INDEX IF NOT EXISTS StockReceiptLine_receipt_idx ON StockReceiptLine (receiptId);
CREATE INDEX IF NOT EXISTS StockReceiptLine_product_idx ON StockReceiptLine (productId);
CREATE INDEX IF NOT EXISTS StockReceiptLine_location_idx ON StockReceiptLine (storageLocationId);

CREATE TABLE IF NOT EXISTS StockTransfer (
  id TEXT PRIMARY KEY NOT NULL,
  transferNo TEXT NOT NULL UNIQUE,
  fromSalesPointId INTEGER NOT NULL REFERENCES SalesPoint(id),
  toSalesPointId INTEGER NOT NULL REFERENCES SalesPoint(id),
  dispatchedAt TEXT,
  receivedAt TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','POSTED','DISPATCHED','RECEIVED','CANCELLED')),
  notes TEXT,
  createdByUserId TEXT NOT NULL REFERENCES User(id),
  dispatchedByUserId TEXT REFERENCES User(id),
  receivedByUserId TEXT REFERENCES User(id),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS StockTransfer_from_status_idx ON StockTransfer (fromSalesPointId, status);
CREATE INDEX IF NOT EXISTS StockTransfer_to_status_idx ON StockTransfer (toSalesPointId, status);
CREATE INDEX IF NOT EXISTS StockTransfer_status_dispatched_idx ON StockTransfer (status, dispatchedAt);

CREATE TABLE IF NOT EXISTS StockTransferLine (
  id TEXT PRIMARY KEY NOT NULL,
  transferId TEXT NOT NULL REFERENCES StockTransfer(id) ON DELETE CASCADE,
  productId INTEGER NOT NULL REFERENCES Product(productId),
  qty TEXT NOT NULL,
  fromStorageLocationId INTEGER NOT NULL REFERENCES StorageLocation(id),
  toStorageLocationId INTEGER REFERENCES StorageLocation(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS StockTransferLine_transfer_idx ON StockTransferLine (transferId);
CREATE INDEX IF NOT EXISTS StockTransferLine_product_idx ON StockTransferLine (productId);

CREATE TABLE IF NOT EXISTS StockAdjustment (
  id TEXT PRIMARY KEY NOT NULL,
  adjustmentNo TEXT NOT NULL UNIQUE,
  salesPointId INTEGER NOT NULL REFERENCES SalesPoint(id),
  occurredAt TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','POSTED','DISPATCHED','RECEIVED','CANCELLED')),
  sourceKind TEXT NOT NULL DEFAULT 'NORMAL' CHECK (sourceKind IN ('NORMAL','CARRY_FORWARD')),
  createdByUserId TEXT NOT NULL REFERENCES User(id),
  postedByUserId TEXT REFERENCES User(id),
  postedAt TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS StockAdjustment_point_date_idx ON StockAdjustment (salesPointId, occurredAt);
CREATE INDEX IF NOT EXISTS StockAdjustment_status_date_idx ON StockAdjustment (status, occurredAt);

CREATE TABLE IF NOT EXISTS StockAdjustmentLine (
  id TEXT PRIMARY KEY NOT NULL,
  adjustmentId TEXT NOT NULL REFERENCES StockAdjustment(id) ON DELETE CASCADE,
  productId INTEGER NOT NULL REFERENCES Product(productId),
  deltaQty TEXT NOT NULL,
  storageLocationId INTEGER NOT NULL REFERENCES StorageLocation(id),
  fromCondition TEXT CHECK (fromCondition IS NULL OR fromCondition IN ('SELLABLE','UNSELLABLE')),
  toCondition TEXT CHECK (toCondition IS NULL OR toCondition IN ('SELLABLE','UNSELLABLE'))
);
CREATE INDEX IF NOT EXISTS StockAdjustmentLine_adjustment_idx ON StockAdjustmentLine (adjustmentId);
CREATE INDEX IF NOT EXISTS StockAdjustmentLine_product_idx ON StockAdjustmentLine (productId);
CREATE INDEX IF NOT EXISTS StockAdjustmentLine_location_idx ON StockAdjustmentLine (storageLocationId);

CREATE TABLE IF NOT EXISTS StockBalance (
  salesPointId INTEGER NOT NULL REFERENCES SalesPoint(id) ON DELETE CASCADE,
  productId INTEGER NOT NULL REFERENCES Product(productId) ON DELETE CASCADE,
  qty TEXT NOT NULL,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  storageLocationId INTEGER NOT NULL REFERENCES StorageLocation(id),
  condition TEXT NOT NULL DEFAULT 'SELLABLE' CHECK (condition IN ('SELLABLE','UNSELLABLE')),
  PRIMARY KEY (salesPointId, productId, storageLocationId, condition)
);
CREATE INDEX IF NOT EXISTS StockBalance_product_idx ON StockBalance (productId);
CREATE INDEX IF NOT EXISTS StockBalance_location_idx ON StockBalance (storageLocationId);

CREATE TABLE IF NOT EXISTS StockMovement (
  id TEXT PRIMARY KEY NOT NULL,
  salesPointId INTEGER NOT NULL REFERENCES SalesPoint(id),
  productId INTEGER NOT NULL REFERENCES Product(productId),
  kind TEXT NOT NULL CHECK (kind IN ('RECEIPT','TRANSFER_OUT','TRANSFER_IN','SALE','SALE_REVERSAL','ADJUSTMENT')),
  qty TEXT NOT NULL,
  occurredAt TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES User(id),
  sourceKind TEXT NOT NULL,
  sourceId TEXT NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  storageLocationId INTEGER NOT NULL REFERENCES StorageLocation(id),
  condition TEXT NOT NULL DEFAULT 'SELLABLE' CHECK (condition IN ('SELLABLE','UNSELLABLE'))
);
CREATE INDEX IF NOT EXISTS StockMovement_point_product_date_idx ON StockMovement (salesPointId, productId, occurredAt);
CREATE INDEX IF NOT EXISTS StockMovement_location_product_idx ON StockMovement (storageLocationId, productId);
CREATE INDEX IF NOT EXISTS StockMovement_source_idx ON StockMovement (sourceKind, sourceId);
CREATE INDEX IF NOT EXISTS StockMovement_occurred_idx ON StockMovement (occurredAt);
CREATE INDEX IF NOT EXISTS StockMovement_user_date_idx ON StockMovement (userId, occurredAt);

PRAGMA foreign_keys = ON;
