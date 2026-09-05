import { app } from "electron";
import { closeDatabase, initDatabase, getDatabase } from "../dist-electron/electron/db/index.js";
import { canPerformAction } from "../dist-electron/electron/auth/permissions/service.js";
import {
  createDocumentBooklet,
  validateDocumentBooklet,
  rejectDocumentBooklet,
  validateManyBooklets,
  validateSerialForSalesPoint,
  listDocumentBooklets,
} from "../dist-electron/electron/booklets/service.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

app.whenReady().then(() => {
  initDatabase();
  const db = getDatabase();

  console.log("1. Checking DocumentBooklet schema columns...");
  const tableCols = db.prepare(`PRAGMA table_info(DocumentBooklet)`).all();
  const colNames = tableCols.map((c) => c.name);
  assert(colNames.includes("status"), "DocumentBooklet must have status column");
  assert(colNames.includes("validatedAt"), "DocumentBooklet must have validatedAt column");
  assert(colNames.includes("validatedByUserId"), "DocumentBooklet must have validatedByUserId column");
  console.log("   Schema columns verified.");

  console.log("2. Checking permissions...");
  assert(canPerformAction("ADMIN", "validate_document_booklets") === true, "ADMIN should have validate_document_booklets");
  assert(canPerformAction("MANAGER", "validate_document_booklets") === true, "MANAGER should have validate_document_booklets");
  assert(canPerformAction("SENIOR_SALES_SUPERVISOR", "validate_document_booklets") === true, "SENIOR_SALES_SUPERVISOR should have validate_document_booklets");
  assert(canPerformAction("STATISTICS_CLERK", "validate_document_booklets") === false, "STATISTICS_CLERK should not have validate_document_booklets");
  console.log("   Permissions verified.");

  console.log("3. Testing booklet creation as clerk (pending by default)...");
  const spRow = db.prepare(`SELECT id FROM SalesPoint LIMIT 1`).get();
  assert(spRow != null, "A SalesPoint is required");
  const spId = spRow.id;

  const adminRow = db.prepare(`SELECT id, role FROM User WHERE role = 'ADMIN' LIMIT 1`).get() || { id: "seed-admin-001", role: "ADMIN" };
  let clerkRow = db.prepare(`SELECT id, role FROM User WHERE role = 'STATISTICS_CLERK' LIMIT 1`).get();
  if (!clerkRow) {
    // If no statistics clerk exists in test DB, use admin user with simulated clerk role for testing
    clerkRow = { id: adminRow.id, role: "STATISTICS_CLERK" };
  }

  const baseSerial = Math.floor(100000 + Math.random() * 800000);
  const start1 = String(baseSerial);
  const end1 = String(baseSerial + 49);

  const clerkUser = { id: clerkRow.id, role: "STATISTICS_CLERK" };
  const adminUser = { id: adminRow.id, role: "ADMIN" };

  const createPending = createDocumentBooklet(clerkUser, {
    documentKind: "SALES_INVOICE",
    salesPointId: spId,
    bookletCode: "TEST-PENDING-01",
    startSerial: start1,
    endSerial: end1,
    activateImmediately: true, // Should be ignored because clerk cannot validate!
  });
  assert(createPending.ok === true, `Clerk should be able to issue booklet: ${createPending.error}`);
  assert(createPending.booklet.status === "PENDING", "Clerk booklet should be PENDING");
  assert(createPending.booklet.validatedAt == null, "Clerk booklet validatedAt should be null");
  console.log("   Clerk issuance is PENDING as expected.");

  console.log("4. Testing that PENDING booklet is NOT accepted for serial lookup...");
  const serialCheckPending = validateSerialForSalesPoint({
    documentKind: "SALES_INVOICE",
    salesPointId: spId,
    serial: start1,
  });
  assert(serialCheckPending.ok === false, "Pending booklet serial should NOT be valid");
  console.log("   Pending serial rejected as expected.");

  console.log("5. Testing supervisor validation of the pending booklet...");
  const valResult = validateDocumentBooklet(adminUser, createPending.booklet.id);
  assert(valResult.ok === true, `Admin should validate booklet: ${valResult.error}`);
  assert(valResult.booklet.status === "ACTIVE", "Validated booklet must be ACTIVE");
  assert(valResult.booklet.validatedByUserId === adminUser.id, "ValidatedByUserId should match admin");

  const serialCheckActive = validateSerialForSalesPoint({
    documentKind: "SALES_INVOICE",
    salesPointId: spId,
    serial: start1,
  });
  assert(serialCheckActive.ok === true, "Active booklet serial should now be valid");
  console.log("   Validation transitioned to ACTIVE and serial is now usable.");

  console.log("6. Testing immediate activation for supervisor...");
  const start2 = String(baseSerial + 50);
  const end2 = String(baseSerial + 99);
  const createActive = createDocumentBooklet(adminUser, {
    documentKind: "SALES_INVOICE",
    salesPointId: spId,
    bookletCode: "TEST-ACTIVE-02",
    startSerial: start2,
    endSerial: end2,
    activateImmediately: true,
  });
  assert(createActive.ok === true, `Admin immediate creation should succeed: ${createActive.error}`);
  assert(createActive.booklet.status === "ACTIVE", "Booklet should be immediately ACTIVE");
  assert(createActive.booklet.validatedAt != null, "validatedAt should be populated");
  console.log("   Supervisor immediate activation verified.");

  console.log("7. Testing rejection workflow...");
  const start3 = String(baseSerial + 100);
  const end3 = String(baseSerial + 149);
  const createForReject = createDocumentBooklet(clerkUser, {
    documentKind: "DELIVERY_ORDER",
    salesPointId: spId,
    bookletCode: "TEST-REJECT-03",
    startSerial: start3,
    endSerial: end3,
  });
  assert(createForReject.ok === true, "Create for rejection should succeed");
  assert(createForReject.booklet.status === "PENDING", "Status should be PENDING");

  const rejResult = rejectDocumentBooklet(adminUser, createForReject.booklet.id, "Misprinted series");
  assert(rejResult.ok === true, "Reject should succeed");

  const loadedAfterReject = listDocumentBooklets({ status: "REJECTED" }).find((b) => b.id === createForReject.booklet.id);
  assert(loadedAfterReject != null, "Rejected booklet should be found with REJECTED status");
  assert(loadedAfterReject.notes.includes("Misprinted series"), "Notes should contain rejection reason");
  console.log("   Rejection workflow verified.");

  console.log("8. Testing batch validation...");
  const start4 = String(baseSerial + 150);
  const end4 = String(baseSerial + 199);
  const start5 = String(baseSerial + 200);
  const end5 = String(baseSerial + 249);

  const b4 = createDocumentBooklet(clerkUser, {
    documentKind: "SALES_INVOICE",
    salesPointId: spId,
    bookletCode: "BATCH-01",
    startSerial: start4,
    endSerial: end4,
  });
  const b5 = createDocumentBooklet(clerkUser, {
    documentKind: "SALES_INVOICE",
    salesPointId: spId,
    bookletCode: "BATCH-02",
    startSerial: start5,
    endSerial: end5,
  });
  assert(b4.ok && b5.ok, "Batch creation should succeed");

  const batchResult = validateManyBooklets(adminUser, [b4.booklet.id, b5.booklet.id]);
  assert(batchResult.ok === true, "Batch validation should succeed");
  assert(batchResult.validated === 2, "Should have validated 2 booklets");
  console.log("   Batch validation verified.");

  // Clean up test entries
  db.prepare(`DELETE FROM DocumentBooklet WHERE bookletCode LIKE 'TEST-%' OR bookletCode LIKE 'BATCH-%'`).run();
  console.log("   Cleaned up test booklets.");

  console.log("\nALL BOOKLET VALIDATION VERIFICATION TESTS PASSED SUCCESSFULLY!");
  closeDatabase();
  app.quit();
});
