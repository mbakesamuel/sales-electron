import type { StorageLocationRow } from "./shared.js";

interface LocationSortKey {
  rank: number;
  number: number;
  name: string;
}

function extractTrailingNumber(name: string): number {
  const matches = name.match(/\d+/g);
  if (!matches || matches.length === 0) {
    return 0;
  }
  const last = matches[matches.length - 1];
  const parsed = Number.parseInt(last, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nameContains(upperName: string, ...parts: string[]): boolean {
  return parts.every((part) => upperName.includes(part));
}

function resolveLocationSortKey(
  location: Pick<StorageLocationRow, "name" | "isSalesTank">,
): LocationSortKey {
  const name = location.name.toUpperCase();

  if (nameContains(name, "PRODUCTION", "TANK")) {
    return { rank: 0, number: extractTrailingNumber(name), name };
  }
  if (location.isSalesTank || nameContains(name, "SALES", "TANK")) {
    return { rank: 1, number: extractTrailingNumber(name), name };
  }
  if (nameContains(name, "BOTTLING", "TANK")) {
    return { rank: 2, number: extractTrailingNumber(name), name };
  }
  if (name.includes("PIT")) {
    return { rank: 3, number: 0, name };
  }
  if (name.includes("DRUM")) {
    return { rank: 4, number: 0, name };
  }

  return { rank: 99, number: 0, name };
}

export function compareStorageLocationsForReport(
  a: Pick<StorageLocationRow, "name" | "isSalesTank">,
  b: Pick<StorageLocationRow, "name" | "isSalesTank">,
): number {
  const keyA = resolveLocationSortKey(a);
  const keyB = resolveLocationSortKey(b);

  if (keyA.rank !== keyB.rank) {
    return keyA.rank - keyB.rank;
  }

  if (keyA.rank <= 2 && keyA.number !== keyB.number) {
    return keyA.number - keyB.number;
  }

  return keyA.name.localeCompare(keyB.name);
}
