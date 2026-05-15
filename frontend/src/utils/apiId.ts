/** Read API entity id from create/update responses (id or legacy _id). */
export function idFromApi(doc: { id?: unknown; _id?: unknown } | null | undefined): string {
  if (!doc) return ''
  if (doc.id != null && String(doc.id).trim() !== '') return String(doc.id)
  if (doc._id != null && String(doc._id).trim() !== '') return String(doc._id)
  return ''
}
