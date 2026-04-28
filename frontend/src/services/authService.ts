import { authApi } from './api/authApi/authApi'

class AuthService {
  me() {
    return authApi.me()
  }

  signup(data: Parameters<typeof authApi.signup>[0]) {
    return authApi.signup(data)
  }

  staffSignup(data: Parameters<typeof authApi.staffSignup>[0]) {
    return authApi.staffSignup(data)
  }
}

export const authService = new AuthService()

