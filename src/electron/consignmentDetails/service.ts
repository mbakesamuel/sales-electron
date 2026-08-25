import type { ConsignmentDetailsRecord } from "../../shared/consignmentDetails.types.js";
import { createTextPrimaryKey } from "../db/tableMeta.js";
import { getDatabase } from "../db/index.js";

export interface ConsignmentDetailsWriteInput {
  saleId: string;
  consignerName: string;
  consignerDesignation: string;
  dateOfConsignment: string;
  receiverName: string;
  receiverNicNo: string | null;
  receiverNicPlaceOfIssue: string | null;
  receivedDate: string | null;
}

export function insertConsignmentDetails(
  input: ConsignmentDetailsWriteInput,
  stamp: string,
): string {
  const id = createTextPrimaryKey();
  getDatabase()
    .prepare(
      `INSERT INTO ConsignmentDetails (
         id, saleId, consignerName, consignerDesignation, dateOfConsignment,
         receiverName, receiverNicNo, receiverNicPlaceOfIssue, receivedDate,
         createdAt, updatedAt
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.saleId,
      input.consignerName,
      input.consignerDesignation,
      input.dateOfConsignment,
      input.receiverName,
      input.receiverNicNo,
      input.receiverNicPlaceOfIssue,
      input.receivedDate,
      stamp,
      stamp,
    );
  return id;
}

export function updateConsignmentDetails(
  id: string,
  input: ConsignmentDetailsWriteInput,
  stamp: string,
): void {
  getDatabase()
    .prepare(
      `UPDATE ConsignmentDetails
       SET consignerName = ?,
           consignerDesignation = ?,
           dateOfConsignment = ?,
           receiverName = ?,
           receiverNicNo = ?,
           receiverNicPlaceOfIssue = ?,
           receivedDate = ?,
           updatedAt = ?
       WHERE id = ?`,
    )
    .run(
      input.consignerName,
      input.consignerDesignation,
      input.dateOfConsignment,
      input.receiverName,
      input.receiverNicNo,
      input.receiverNicPlaceOfIssue,
      input.receivedDate,
      stamp,
      id,
    );
}

export function deleteConsignmentDetails(id: string): void {
  getDatabase().prepare(`DELETE FROM ConsignmentDetails WHERE id = ?`).run(id);
}

export function mapConsignmentDetailsRow(
  row: Record<string, unknown>,
): ConsignmentDetailsRecord {
  return {
    id: String(row.id),
    saleId: String(row.saleId),
    consignerName: String(row.consignerName),
    consignerDesignation: String(row.consignerDesignation),
    dateOfConsignment: String(row.dateOfConsignment).slice(0, 10),
    receiverName: String(row.receiverName),
    receiverNicNo: row.receiverNicNo != null ? String(row.receiverNicNo) : null,
    receiverNicPlaceOfIssue:
      row.receiverNicPlaceOfIssue != null
        ? String(row.receiverNicPlaceOfIssue)
        : null,
    receivedDate: row.receivedDate
      ? String(row.receivedDate).slice(0, 10)
      : null,
  };
}
