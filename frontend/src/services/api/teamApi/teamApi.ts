import { api } from '../api'

class TeamApi {
  private readonly _url = {
    TEAM: '/api/team',
    ROTATE_JOIN: '/api/business/rotate-join-code',
  } as const

  team() {
    return api._get<any[]>(this._url.TEAM)
  }

  rotateJoinCode() {
    return api._post<{ joinCode: string }>(this._url.ROTATE_JOIN, {})
  }
}

export const teamApi = new TeamApi()

