/** API JSON: expose `id` as ObjectId hex string; hide `_id`. */
export function apiIdFromDoc(doc: { _id?: unknown }): string {
  if (doc._id == null) throw new Error('Document missing _id')
  return String(doc._id)
}

export function toApi<T extends Record<string, unknown>>(raw: T | null): T | null {
  if (!raw) return null
  const o = { ...raw } as Record<string, unknown>
  delete o.mongoObjectId
  // Lean docs have `_id`; Mongoose toJSON/toObject may already expose `id` (see schemaOpts).
  if (o._id != null) {
    o.id = String(o._id)
    delete o._id
  } else if (o.id != null) {
    o.id = String(o.id)
  }
  delete o.__v
  delete o.passwordHash
  return o as T
}

export function toApiList<T extends Record<string, unknown>>(rows: T[]) {
  return rows.map((r) => toApi(r)!)
}

export function expiresAtIso(d: Date) {
  return d.toISOString().replace(/\.\d{3}Z$/, '.000Z')
}
