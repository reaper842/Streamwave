'use client'

import { create } from 'zustand'
import { signIn, signOut } from 'next-auth/react'
import { apiClient, ApiRequestError } from '@/lib/api/client'

interface AuthState {
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<{ success: boolean }>
  register: (displayName: string, email: string, password: string) => Promise<{ success: boolean }>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        set({ error: 'Invalid email or password. Please try again.', isLoading: false })
        return { success: false }
      }
      set({ isLoading: false })
      return { success: true }
    } catch {
      set({ error: 'An unexpected error occurred. Please try again.', isLoading: false })
      return { success: false }
    }
  },

  register: async (displayName, email, password) => {
    set({ isLoading: true, error: null })
    try {
      await apiClient.post('/auth/register', { displayName, email, password })
      // Auto sign-in after successful registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        set({
          error: 'Account created! Please log in.',
          isLoading: false,
        })
        return { success: false }
      }
      set({ isLoading: false })
      return { success: true }
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Registration failed. Please try again.'
      set({ error: message, isLoading: false })
      return { success: false }
    }
  },

  logout: async () => {
    set({ isLoading: true })
    await signOut({ redirectTo: '/login' })
    set({ isLoading: false })
  },

  clearError: () => set({ error: null }),
}))
