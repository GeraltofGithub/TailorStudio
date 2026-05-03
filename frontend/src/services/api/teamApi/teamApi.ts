import { api } from '../api'
import { TtlDedupeCache } from '../ttlDedupeCache'

class TeamApi {
  private readonly _cache = new TtlDedupeCache(60_000)

  private readonly _url = {
    TEAM: '/api/team',
    ROTATE_JOIN: '/api/business/rotate-join-code',
  } as const

  invalidateAllReadCaches() {
    this._cache.clear()
  }

  team() {
    return this._cache.load(
      'team:list',
      () => api._get<any[]>(this._url.TEAM),
      (rows) => (rows || []).map((x) => ({ ...x })),
    )
  }

  rotateJoinCode() {
    this._cache.clear()
    return api._post<{ joinCode: string }>(this._url.ROTATE_JOIN, {})
  }
}

export const teamApi = new TeamApi()
