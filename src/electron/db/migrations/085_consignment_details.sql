-- Extract consignment signatory fields into ConsignmentDetails (sale-anchored).

PRAGMA foreign_keys = OFF;

CREATE TABLE ConsignmentDetails (
  id TEXT PRIMARY KEY NOT NULL,
  saleId TEXT NOT NULL REFERENCES Sale(id) ON DELETE CASCADE,
  consignerName TEXT NOT NULL,
  consignerDesignation TEXT NOT NULL,
  dateOfConsignment TEXT NOT NULL,
  receiverName TEXT NOT NULL,
  receiverNicNo TEXT,
  receiverNicPlaceOfIssue TEXT,
  receivedDate TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX ConsignmentDetails_sale_idx ON ConsignmentDetails (saleId);

INSERT INTO ConsignmentDetails (
  id,
  saleId,
  consignerName,
  consignerDesignation,
  dateOfConsignment,
  receiverName,
  receiverNicNo,
  receiverNicPlaceOfIssue,
  receivedDate,
  createdAt,
  updatedAt
)
SELECT
  'cd_' || id,
  saleId,
  consignerName,
  consignerDesignation,
  dateOfConsignment,
  receiverName,
  receiverNicNo,
  receiverNicPlaceOfIssue,
  receivedDate,
  createdAt,
  updatedAt
FROM VehicleConsignmentNote;

CREATE TABLE VehicleConsignmentNote__new (
  id TEXT PRIMARY KEY NOT NULL,
  consignmentNoteNo TEXT NOT NULL UNIQUE,
  saleId TEXT NOT NULL UNIQUE REFERENCES Sale(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  dateOfLifting TEXT NOT NULL,
  vehicleNumber TEXT NOT NULL,
  consignmentDetailsId TEXT NOT NULL UNIQUE REFERENCES ConsignmentDetails(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','VALIDATED','REJECTED')),
  validatedAt TEXT,
  validatedByUserId TEXT REFERENCES User(id),
  createdByUserId TEXT NOT NULL REFERENCES User(id),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO VehicleConsignmentNote__new (
  id,
  consignmentNoteNo,
  saleId,
  destination,
  dateOfLifting,
  vehicleNumber,
  consignmentDetailsId,
  status,
  validatedAt,
  validatedByUserId,
  createdByUserId,
  createdAt,
  updatedAt
)
SELECT
  id,
  consignmentNoteNo,
  saleId,
  destination,
  dateOfLifting,
  vehicleNumber,
  'cd_' || id,
  status,
  validatedAt,
  validatedByUserId,
  createdByUserId,
  createdAt,
  updatedAt
FROM VehicleConsignmentNote;

DROP TABLE VehicleConsignmentNote;
ALTER TABLE VehicleConsignmentNote__new RENAME TO VehicleConsignmentNote;

CREATE INDEX IF NOT EXISTS VehicleConsignmentNote_sale_idx ON VehicleConsignmentNote (saleId);
CREATE INDEX IF NOT EXISTS VehicleConsignmentNote_no_idx ON VehicleConsignmentNote (consignmentNoteNo);
CREATE INDEX IF NOT EXISTS VehicleConsignmentNote_status_idx ON VehicleConsignmentNote (status);

PRAGMA foreign_keys = ON;
