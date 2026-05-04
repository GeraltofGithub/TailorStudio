import { api } from '../api'

export type UserRole = 'OWNER' | 'STAFF'

export type MeResponse = {
  email?: string
  fullName: string
  role: UserRole
  businessId: number
  businessName: string
  tagline?: string | null
  address?: string | null
  phone?: string | null
  secondaryPhone?: string | null
  joinCode?: string
}

class AuthApi {
  private readonly _url = {
    ME: '/api/me',
    SIGNUP: '/api/auth/signup',
    STAFF_SIGNUP: '/api/auth/staff-signup',
  } as const

  /** Coalesce overlapping GET /api/me (e.g. StrictMode, rapid refresh). */
  private _meInflight: Promise<MeResponse> | null = null
  private _meAbort: AbortController | null = null

  me() {
    if (!this._meInflight) {
      this._meAbort?.abort()
      const ac = new AbortController()
      this._meAbort = ac
      this._meInflight = api
        ._get<MeResponse>(this._url.ME, { signal: ac.signal })
        .finally(() => {
          this._meInflight = null
          this._meAbort = null
        })
    }
    return this._meInflight
  }

  /** Drop an in-flight /api/me (e.g. login just completed with initialMe). */
  cancelPendingMe() {
    this._meAbort?.abort()
    this._meInflight = null
    this._meAbort = null
  }

  signup(data: {
    businessName: string
    tagline: string | null
    address: string | null
    phone: string | null
    secondaryPhone: string | null
    ownerName: string
    email: string
    password: string
  }) {
    return api._post<{ message?: string; error?: string }>(this._url.SIGNUP, data)
  }

  staffSignup(data: { joinCode: string; fullName: string; email: string; password: string }) {
    return api._post<{ message?: string; error?: string }>(this._url.STAFF_SIGNUP, data)
  }
}

export const authApi = new AuthApi()

