import axios from 'axios'
import { apiErrorBodySchema, type ErrorCode, type Quote } from '@/api/contracts'

export class ClientError extends Error {
  readonly status: number | null
  readonly code: ErrorCode | 'NETWORK' | 'TIMEOUT' | 'ABORTED'
  readonly fields: Record<string, string>
  readonly quote?: Quote

  constructor(code: ClientError['code'], message: string, status: number | null, extra?: { fields?: Record<string, string>; quote?: Quote }) {
    super(message)
    this.code = code
    this.status = status
    this.fields = extra?.fields ?? {}
    this.quote = extra?.quote
  }

  get retryable(): boolean {
    return this.code === 'NETWORK' || this.code === 'TIMEOUT' || (this.status !== null && this.status >= 500)
  }
}

/**
 * Normalizes any thrown value from Axios into a ClientError with a stable code.
 * @param error raw error
 */
export function toClientError(error: unknown): ClientError {
  if (error instanceof ClientError) return error
  if (axios.isCancel(error)) return new ClientError('ABORTED', 'Requisição cancelada.', null)
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ClientError('TIMEOUT', 'A resposta demorou demais. Tente novamente.', null)
    }
    if (!error.response) return new ClientError('NETWORK', 'Sem conexão com o servidor.', null)
    const parsed = apiErrorBodySchema.safeParse(error.response.data)
    if (parsed.success) {
      const { code, message, fields, quote } = parsed.data.error
      return new ClientError(code, message, error.response.status, { fields, quote })
    }
    return new ClientError('INTERNAL_ERROR', 'Erro inesperado no servidor.', error.response.status)
  }
  return new ClientError('INTERNAL_ERROR', 'Erro inesperado.', null)
}
