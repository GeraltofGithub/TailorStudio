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

  me() {
    if (!this._meInflight) {
      this._meInflight = api._get<MeResponse>(this._url.ME).finally(() => {
        this._meInflight = null
      })
    }
    return this._meInflight
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

