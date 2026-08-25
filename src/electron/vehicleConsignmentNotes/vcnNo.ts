import type Database from "better-sqlite3";

export function allocateConsignmentNoteNo(db: Database.Database): string {
  const year = new Date().getFullYear();
  const prefix = `VCN-${year}-`;
  const last = db
    .prepare(
      `SELECT consignmentNoteNo FROM VehicleConsignmentNote
       WHERE consignmentNoteNo LIKE ?
       ORDER BY consignmentNoteNo DESC
       LIMIT 1`,
    )
    .get(`${prefix}%`) as { consignmentNoteNo: string } | undefined;

  let next = 1;
  if (last?.consignmentNoteNo) {
    const match = last.consignmentNoteNo.match(/-(\d+)$/);
    if (match) {
      next = Number.parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${String(next).padStart(6, "0")}`;
}
