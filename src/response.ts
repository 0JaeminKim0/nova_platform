// ===== NOVA Response Standard =====
// NovaResponse[T] — Pydantic 제네릭 패턴의 TypeScript 구현
// 모든 API 응답은 이 형식을 따름

import type { Context } from 'hono'

export interface NovaResponseMeta {
  page?: number
  per_page?: number
  total?: number
  total_pages?: number
}

export interface NovaResponse<T = unknown> {
  success: boolean
  data: T | null
  meta: NovaResponseMeta | null
  message: string
  error_code: string | null
  timestamp: string
}

// ===== Response Helpers =====

export function novaSuccess<T>(
  c: Context,
  data: T,
  message = 'OK',
  meta?: NovaResponseMeta,
  status: 200 | 201 = 200
) {
  const body: NovaResponse<T> = {
    success: true,
    data,
    meta: meta || null,
    message,
    error_code: null,
    timestamp: new Date().toISOString()
  }
  return c.json(body, status)
}

export function novaError(
  c: Context,
  message: string,
  error_code: string,
  status: 400 | 401 | 403 | 404 | 409 | 422 | 500 = 400
) {
  const body: NovaResponse<null> = {
    success: false,
    data: null,
    meta: null,
    message,
    error_code,
    timestamp: new Date().toISOString()
  }
  return c.json(body, status)
}

export function novaValidationError(c: Context, errors: unknown) {
  const body: NovaResponse<null> = {
    success: false,
    data: null,
    meta: null,
    message: '입력 데이터 검증에 실패했습니다.',
    error_code: 'VALIDATION_ERROR',
    timestamp: new Date().toISOString()
  }
  return c.json({ ...body, details: errors }, 422)
}

export function novaNotFound(c: Context, resource: string) {
  return novaError(c, `${resource}을(를) 찾을 수 없습니다.`, 'NOT_FOUND', 404)
}

export function novaDuplicate(c: Context, resource: string) {
  return novaError(c, `이미 존재하는 ${resource}입니다.`, 'DUPLICATE', 409)
}
