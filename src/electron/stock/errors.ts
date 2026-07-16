export class InsufficientStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientStockError";
  }
}

export function isInsufficientStockError(error: unknown): error is InsufficientStockError {
  return error instanceof InsufficientStockError;
}
