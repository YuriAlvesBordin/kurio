import { HttpResponse } from 'msw'
import type { ErrorCode, Quote } from '@/api/contracts'

export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly fields?: Record<string, string>
  readonly quote?: Quote

  constructor(status: number, code: ErrorCode, message: string, extra?: { fields?: Record<string, string>; quote?: Quote }) {
    super(message)
    this.status = status
    this.code = code
    this.fields = extra?.fields
    this.quote = extra?.quote
  }
}

/**
 * Converts an ApiError into the JSON error envelope shared with the client contracts.
 * @param error error raised by a handler
 */
export function errorResponse(error: ApiError) {
  return HttpResponse.json(
    { error: { code: error.code, message: error.message, fields: error.fields, quote: error.quote } },
    { status: error.status },
  )
}
