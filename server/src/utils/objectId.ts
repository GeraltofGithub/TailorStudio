import mongoose from 'mongoose'

export function parseObjectId(id: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId {
  if (id instanceof mongoose.Types.ObjectId) return id
  const s = String(id).trim()
  if (!mongoose.Types.ObjectId.isValid(s)) throw new Error('invalid id')
  return new mongoose.Types.ObjectId(s)
}

export function isObjectIdString(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(String(id).trim())
}

/** Query by MongoDB `_id` only (API `id` is the hex string of `_id`). */
export function byId(id: string | mongoose.Types.ObjectId) {
  return { _id: parseObjectId(id) }
}

export function apiIdFromDoc(doc: { _id?: unknown }): string {
  if (doc._id == null) throw new Error('Document missing _id')
  return String(doc._id)
}
