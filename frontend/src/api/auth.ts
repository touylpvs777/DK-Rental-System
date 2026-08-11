import client from './client'
import type { LoginRequest, TokenResponse, User } from '@/types/auth'

export const login = (data: LoginRequest) =>
  client.post<TokenResponse>('/auth/login', data)

export const logoutApi = () =>
  client.post('/auth/logout')

export const getMe = () => client.get<User>('/users/me')

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

export const changePassword = (data: ChangePasswordRequest) =>
  client.put('/users/me/password', data)
