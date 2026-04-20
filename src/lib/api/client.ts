'use client'

import type { ApiError, ApiResponse } from '@/types/api'

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
const API_PREFIX = '/api/v1'

// ─── Error class ──────────────────────────────────────────────────────────────

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  token?: string
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { body, token, ...init } = options

  const headers: Record<string, string> = {
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${API_PREFIX}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    let errorPayload: ApiError | null = null
    try {
      errorPayload = (await response.json()) as ApiError
    } catch {
      // non-JSON error response
    }

    throw new ApiRequestError(
      response.status,
      errorPayload?.error.code ?? 'UNKNOWN_ERROR',
      errorPayload?.error.message ?? `HTTP ${response.status}`,
      errorPayload?.error.details,
    )
  }

  // 204 No Content
  if (response.status === 204) {
    return { data: undefined as T }
  }

  return response.json() as Promise<ApiResponse<T>>
}

// ─── Convenience methods ──────────────────────────────────────────────────────

export const apiClient = {
  get<T>(path: string, options?: Omit<RequestOptions, 'body' | 'method'>) {
    return request<T>(path, { ...options, method: 'GET' })
  },

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body' | 'method'>) {
    return request<T>(path, { ...options, method: 'POST', body })
  },

  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body' | 'method'>) {
    return request<T>(path, { ...options, method: 'PATCH', body })
  },

  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body' | 'method'>) {
    return request<T>(path, { ...options, method: 'PUT', body })
  },

  delete<T>(path: string, options?: Omit<RequestOptions, 'body' | 'method'>) {
    return request<T>(path, { ...options, method: 'DELETE' })
  },
}
