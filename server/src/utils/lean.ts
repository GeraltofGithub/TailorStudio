/** Mongoose .lean() typing helper */
export function leanOne<T>(doc: unknown): T {
  return doc as T
}
