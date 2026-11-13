import type { ScenarioId } from '@/api/contracts'

export interface FailureRule {
  method?: string
  pattern: RegExp
  kind: 'network' | 'status'
  status?: number
  times: number
  code?: 'TRANSIENT_FAILURE' | 'INTERNAL_ERROR' | 'FORBIDDEN' | 'UNAUTHENTICATED'
}

export interface ScenarioFlags {
  emptyCatalog: boolean
  orderOutcome: 'confirmed' | 'rejected'
  orderTimeout: boolean
  priceChangeOnCheckout: boolean
  soldOutOnCheckout: boolean
  couponMode: 'normal' | 'invalid' | 'expired'
  registerConflict: boolean
  walletRejects: boolean
  expireSessionAfterAuthedCalls: number | null
  forbidProfileUpdate: boolean
}

export interface Scenario {
  id: ScenarioId
  label: string
  description: string
  latency: { minMs: number; maxMs: number; seed: number }
  rules: FailureRule[]
  flags: ScenarioFlags
}

const baseFlags: ScenarioFlags = {
  emptyCatalog: false,
  orderOutcome: 'confirmed',
  orderTimeout: false,
  priceChangeOnCheckout: false,
  soldOutOnCheckout: false,
  couponMode: 'normal',
  registerConflict: false,
  walletRejects: false,
  expireSessionAfterAuthedCalls: null,
  forbidProfileUpdate: false,
}

/**
 * Builds a scenario by overriding the default configuration.
 * @param id scenario identifier
 * @param label short title
 * @param description what the scenario demonstrates
 * @param override partial overrides
 */
function scenario(id: ScenarioId, label: string, description: string, override: Partial<Omit<Scenario, 'id' | 'label' | 'description' | 'flags'>> & { flags?: Partial<ScenarioFlags> } = {}): Scenario {
  return {
    id,
    label,
    description,
    latency: override.latency ?? { minMs: 60, maxMs: 140, seed: 7 },
    rules: override.rules ?? [],
    flags: { ...baseFlags, ...override.flags },
  }
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  default: scenario('default', 'Padrão', 'Sucesso com latência baixa e determinística.'),
  empty: scenario('empty', 'Resultado vazio', 'O catálogo responde sem nenhum NFT.', { flags: { emptyCatalog: true } }),
  slow: scenario('slow', 'Lentidão', 'Todas as respostas demoram cerca de dois segundos.', { latency: { minMs: 1800, maxMs: 2200, seed: 11 } }),
  jitter: scenario('jitter', 'Latência variável', 'Latência entre 50 ms e 1500 ms que pode inverter a ordem das respostas.', { latency: { minMs: 50, maxMs: 1500, seed: 3 } }),
  offline: scenario('offline', 'Sem conexão', 'Toda chamada REST falha com erro de rede.', { rules: [{ pattern: /\/api\//, kind: 'network', times: Infinity }] }),
  'server-errors': scenario('server-errors', 'Erros 5xx', 'As três primeiras consultas ao catálogo falham com 503 e depois o serviço volta.', {
    rules: [{ method: 'GET', pattern: /\/api\/nfts(\?|$)/, kind: 'status', status: 503, code: 'TRANSIENT_FAILURE', times: 3 }],
  }),
  'session-expired': scenario('session-expired', 'Sessão expirada', 'A sessão expira após três chamadas autenticadas.', { flags: { expireSessionAfterAuthedCalls: 3 } }),
  unauthorized: scenario('unauthorized', 'Acesso negado', 'A atualização de perfil responde 403.', { flags: { forbidProfileUpdate: true } }),
  'register-conflict': scenario('register-conflict', 'Conflito de cadastro', 'Todo cadastro novo responde 409 com campos em conflito.', { flags: { registerConflict: true } }),
  'coupon-invalid': scenario('coupon-invalid', 'Cupom inválido', 'Todo código promocional é recusado como inválido.', { flags: { couponMode: 'invalid' } }),
  'coupon-expired': scenario('coupon-expired', 'Cupom expirado', 'Todo código promocional é recusado como expirado.', { flags: { couponMode: 'expired' } }),
  'price-change': scenario('price-change', 'Preço alterado', 'O preço do primeiro item sobe durante a compra e exige nova confirmação.', { flags: { priceChangeOnCheckout: true } }),
  'sold-out': scenario('sold-out', 'Edição esgotada', 'A edição do primeiro item esgota durante a compra.', { flags: { soldOutOnCheckout: true } }),
  'order-timeout': scenario('order-timeout', 'Timeout após criar pedido', 'O pedido é criado mas a resposta nunca chega na primeira tentativa.', { flags: { orderTimeout: true } }),
  'order-rejected': scenario('order-rejected', 'Pagamento recusado', 'O pedido é criado e depois recusado.', { flags: { orderOutcome: 'rejected' } }),
  'wallet-rejected': scenario('wallet-rejected', 'Carteira recusa conexão', 'A simulação de conexão da carteira é recusada pelo usuário.', { flags: { walletRejects: true } }),
}

/**
 * Resolves a scenario id from raw text and falls back to the default scenario.
 * @param value candidate id
 */
export function resolveScenario(value: string | null | undefined): Scenario {
  if (value && value in SCENARIOS) return SCENARIOS[value as ScenarioId]
  return SCENARIOS.default
}
