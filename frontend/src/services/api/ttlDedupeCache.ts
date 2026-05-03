/**
 * In-flight dedupe + TTL for identical GET keys. Returns a fresh clone each resolve
 * so callers cannot accidentally mutate cached payloads.
 */
export class TtlDedupeCache {
  private readonly store = new Map<string, { at: number; p: Promise<unknown> }>()
  private readonly defaultTtlMs: number

  constructor(defaultTtlMs: number) {
    this.defaultTtlMs = defaultTtlMs
  }

  clear() {
    this.store.clear()
  }

  delete(key: string) {
    this.store.delete(key)
  }

  deletePrefix(prefix: string) {
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) this.store.delete(k)
    }
  }

  load<T>(key: string, supplier: () => Promise<T>, clone: (v: T) => T, ttlMs?: number): Promise<T> {
    const ttl = ttlMs ?? this.defaultTtlMs
    const now = Date.now()
    const hit = this.store.get(key)
    if (hit && now - hit.at < ttl) {
      return (hit.p as Promise<T>).then((v) => clone(v))
    }
    const p = supplier().catch((err) => {
      this.store.delete(key)
      throw err
    })
    this.store.set(key, { at: now, p })
    return p.then((v) => clone(v))
  }
}
