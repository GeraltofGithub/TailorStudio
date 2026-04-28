import { api } from '../api'

class BusinessApi {
  private readonly _url = {
    UPDATE: '/api/business',
  } as const

  update(data: { name: string; tagline: string | null; address: string | null; phone: string | null; secondaryPhone: string | null }) {
    return api._patch<void>(this._url.UPDATE, data)
  }
}

export const businessApi = new BusinessApi()

