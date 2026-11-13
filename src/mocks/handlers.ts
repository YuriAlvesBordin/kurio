import { http, HttpResponse, delay, type HttpHandler } from 'msw'
import {
  catalogParamsSchema,
  couponInputSchema,
  cartItemInputSchema,
  loginInputSchema,
  orderCreateInputSchema,
  passwordChangeSchema,
  profileUpdateSchema,
  registerInputSchema,
  walletConnectInputSchema,
  walletSchema,
  type CatalogParams,
  type User,
} from '@/api/contracts'
import { db, hashPassword, nextCounter, persist, type MockUser } from './db'
import {
  PAGE_SIZE,
  addCartLine,
  applyCheckoutTurbulence,
  buildQuote,
  cartFor,
  cartView,
  createOrder,
  parseItemId,
  publicOrder,
  queryCatalog,
  validateCoupon,
  type Identity,
} from './domain'
import { ApiError, errorResponse } from './errors'
import { hexDigest } from './random'
import { current, nextLatencyMs, settings } from './runtime'

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const AVATAR_LIMIT = 600000

interface Context {
  request: Request
  params: Record<string, string | readonly string[] | undefined>
  identity: Identity
  userId: string | null
  token: string | null
}

type Handler = (context: Context) => Promise<Response> | Response

/**
 * Removes private fields from a stored user before it is sent to the client.
 * @param user stored user
 */
function publicUser(user: MockUser): User {
  const { passwordHash, salt, ...rest } = user
  void passwordHash
  void salt
  return rest
}

/**
 * Resolves the caller from the bearer token and applies the session expiry rules of the scenario.
 * @param request incoming request
 * @param counted whether this call counts toward the scenario session expiry budget
 */
function resolveSession(request: Request, counted: boolean): { userId: string | null; token: string | null } {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return { userId: null, token: null }
  const token = header.slice(7)
  const entry = db().tokens[token]
  if (!entry) throw new ApiError(401, 'UNAUTHENTICATED', 'Sessão inválida. Entre novamente.')
  if (entry.expired || new Date(entry.expiresAt).getTime() < Date.now()) {
    throw new ApiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
  }
  const limit = current().scenario.flags.expireSessionAfterAuthedCalls
  if (counted && limit !== null) {
    if (current().authedCalls >= limit) {
      entry.expired = true
      persist()
      throw new ApiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
    }
    current().authedCalls += 1
  }
  return { userId: entry.userId, token }
}

/**
 * Applies the failure rules of the active scenario to a request, returning a response when one fires.
 * @param request incoming request
 */
function applyFailureRules(request: Request): Response | null {
  const url = new URL(request.url)
  const target = `${url.pathname}${url.search}`
  const rules = current().scenario.rules
  for (let index = 0; index < rules.length; index += 1) {
    const rule = rules[index]
    if (rule.method && rule.method !== request.method) continue
    if (!rule.pattern.test(target)) continue
    const hits = current().ruleHits.get(index) ?? 0
    if (hits >= rule.times) continue
    current().ruleHits.set(index, hits + 1)
    if (rule.kind === 'network') return HttpResponse.error()
    return errorResponse(new ApiError(rule.status ?? 503, rule.code ?? 'TRANSIENT_FAILURE', 'Serviço temporariamente indisponível. Tente novamente.'))
  }
  return null
}

/**
 * Wraps a route with latency, scenario failures, identity resolution and error mapping.
 * @param method HTTP method
 * @param path route path relative to the API root
 * @param options authentication requirement and expiry counting
 * @param handler route logic
 */
function route(method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, options: { auth: 'required' | 'optional' | 'none' }, handler: Handler): HttpHandler {
  return http[method](`*/api${path}`, async ({ request, params }) => {
    await delay(nextLatencyMs())
    const failure = applyFailureRules(request)
    if (failure) return failure
    try {
      const session = options.auth === 'none' ? { userId: null, token: null } : resolveSession(request, true)
      if (options.auth === 'required' && !session.userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Entre para continuar.')
      const guestId = request.headers.get('x-guest-id')
      return await handler({ request, params, identity: { userId: session.userId, guestId }, userId: session.userId, token: session.token })
    } catch (error) {
      if (error instanceof ApiError) return errorResponse(error)
      return errorResponse(new ApiError(500, 'INTERNAL_ERROR', 'Erro interno inesperado.'))
    }
  })
}

/**
 * Reads and validates a JSON body with a zod schema, raising a field aware validation error.
 * @param request incoming request
 * @param schema zod schema
 */
async function readBody<T>(request: Request, schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } } }): Promise<T> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Corpo da requisição inválido.')
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = 'Valor inválido.'
    throw new ApiError(422, 'VALIDATION_ERROR', 'Verifique os campos informados.', { fields })
  }
  return parsed.data
}

/**
 * Parses the catalog query string into typed parameters.
 * @param url request URL
 */
function readCatalogParams(url: URL): CatalogParams {
  const list = (key: string) => url.searchParams.get(key)?.split(',').filter(Boolean)
  const raw = {
    q: url.searchParams.get('q') || undefined,
    collections: list('collections'),
    networks: list('networks'),
    min: url.searchParams.get('min') || undefined,
    max: url.searchParams.get('max') || undefined,
    sort: url.searchParams.get('sort') || undefined,
    tab: url.searchParams.get('tab') || undefined,
    page: url.searchParams.has('page') ? Number(url.searchParams.get('page')) : undefined,
  }
  const parsed = catalogParamsSchema.safeParse(raw)
  if (!parsed.success) throw new ApiError(422, 'VALIDATION_ERROR', 'Parâmetros de catálogo inválidos.')
  return parsed.data
}

/**
 * Issues a new bearer token for a user.
 * @param userId token owner
 */
function issueToken(userId: string): { token: string; expiresAt: string } {
  const token = `tok_${hexDigest(`${userId}:${nextCounter('token')}:${Date.now()}`, 32)}`
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()
  db().tokens[token] = { userId, expiresAt, expired: false }
  persist()
  return { token, expiresAt }
}

/**
 * Checks that a password meets the minimum policy.
 * @param password candidate password
 */
function passwordProblem(password: string): string | null {
  if (password.length < 8) return 'A senha precisa ter ao menos 8 caracteres.'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use letras e números na senha.'
  return null
}

/**
 * Requires a user record for an authenticated request.
 * @param userId authenticated user id
 */
function requireUser(userId: string | null): MockUser {
  const user = userId ? db().users[userId] : undefined
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Entre para continuar.')
  return user
}

const asString = (value: string | readonly string[] | undefined): string => (Array.isArray(value) ? value[0] : (value as string)) ?? ''

export const handlers: HttpHandler[] = [
  route('get', '/nfts', { auth: 'none' }, ({ request }) => HttpResponse.json(queryCatalog(readCatalogParams(new URL(request.url))))),

  route('get', '/nfts/:id', { auth: 'none' }, ({ params }) => {
    const nft = db().nfts[asString(params.id)]
    if (!nft || current().scenario.flags.emptyCatalog) throw new ApiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    return HttpResponse.json(nft)
  }),

  route('post', '/auth/register', { auth: 'none' }, async ({ request }) => {
    const input = await readBody(request, registerInputSchema)
    const fields: Record<string, string> = {}
    if (input.username.trim().length < 3) fields.username = 'Use ao menos 3 caracteres.'
    if (!EMAIL_PATTERN.test(input.email)) fields.email = 'Informe um e-mail válido.'
    const problem = passwordProblem(input.password)
    if (problem) fields.password = problem
    if (Object.keys(fields).length) throw new ApiError(422, 'VALIDATION_ERROR', 'Verifique os campos informados.', { fields })
    const users = Object.values(db().users)
    const emailTaken = users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())
    if (emailTaken || current().scenario.flags.registerConflict) {
      throw new ApiError(409, 'EMAIL_TAKEN', 'Este e-mail já está cadastrado.', { fields: { email: 'Este e-mail já está cadastrado.' } })
    }
    if (users.some((user) => user.username.toLowerCase() === input.username.toLowerCase())) {
      throw new ApiError(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', { fields: { username: 'Este nome de usuário já está em uso.' } })
    }
    const id = `user-${hexDigest(`${input.email}:${Date.now()}`, 10)}`
    const salt = hexDigest(id, 16)
    const user: MockUser = {
      id,
      username: input.username.trim(),
      email: input.email.trim(),
      displayName: input.username.trim(),
      ensName: input.username.trim().toLowerCase(),
      ensSuffix: '.eth',
      walletAlias: 'Principal',
      avatarUrl: null,
      salt,
      passwordHash: await hashPassword(salt, input.password),
    }
    db().users[id] = user
    db().favorites[id] = []
    db().wallets[id] = { primary: null, secondary: null }
    persist()
    return HttpResponse.json({ user: publicUser(user), ...issueToken(id) }, { status: 201 })
  }),

  route('post', '/auth/login', { auth: 'none' }, async ({ request }) => {
    const input = await readBody(request, loginInputSchema)
    const user = Object.values(db().users).find((entry) => entry.email.toLowerCase() === input.email.trim().toLowerCase())
    const valid = user ? (await hashPassword(user.salt, input.password)) === user.passwordHash : false
    if (!user || !valid) throw new ApiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    current().authedCalls = 0
    return HttpResponse.json({ user: publicUser(user), ...issueToken(user.id) })
  }),

  route('post', '/auth/logout', { auth: 'none' }, ({ request }) => {
    const header = request.headers.get('authorization')
    if (header?.startsWith('Bearer ')) {
      delete db().tokens[header.slice(7)]
      persist()
    }
    return new HttpResponse(null, { status: 204 })
  }),

  route('get', '/session', { auth: 'required' }, ({ userId }) => HttpResponse.json({ user: publicUser(requireUser(userId)) })),

  route('patch', '/profile', { auth: 'required' }, async ({ request, userId }) => {
    const user = requireUser(userId)
    if (current().scenario.flags.forbidProfileUpdate) throw new ApiError(403, 'FORBIDDEN', 'Você não tem permissão para alterar este perfil.')
    const input = await readBody(request, profileUpdateSchema)
    const fields: Record<string, string> = {}
    if (input.displayName.trim().length < 2) fields.displayName = 'Informe seu nome.'
    if (input.username.trim().length < 3) fields.username = 'Use ao menos 3 caracteres.'
    if (!EMAIL_PATTERN.test(input.email)) fields.email = 'Informe um e-mail válido.'
    if (Object.keys(fields).length) throw new ApiError(422, 'VALIDATION_ERROR', 'Verifique os campos informados.', { fields })
    const others = Object.values(db().users).filter((entry) => entry.id !== user.id)
    if (others.some((entry) => entry.email.toLowerCase() === input.email.toLowerCase())) {
      throw new ApiError(409, 'EMAIL_TAKEN', 'Este e-mail já está cadastrado.', { fields: { email: 'Este e-mail já está cadastrado.' } })
    }
    if (others.some((entry) => entry.username.toLowerCase() === input.username.toLowerCase())) {
      throw new ApiError(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', { fields: { username: 'Este nome de usuário já está em uso.' } })
    }
    Object.assign(user, input)
    persist()
    return HttpResponse.json({ user: publicUser(user) })
  }),

  route('post', '/profile/password', { auth: 'required' }, async ({ request, userId }) => {
    const user = requireUser(userId)
    const input = await readBody(request, passwordChangeSchema)
    if ((await hashPassword(user.salt, input.currentPassword)) !== user.passwordHash) {
      throw new ApiError(422, 'VALIDATION_ERROR', 'Senha atual incorreta.', { fields: { currentPassword: 'Senha atual incorreta.' } })
    }
    const problem = passwordProblem(input.newPassword)
    if (problem) throw new ApiError(422, 'VALIDATION_ERROR', problem, { fields: { newPassword: problem } })
    user.passwordHash = await hashPassword(user.salt, input.newPassword)
    persist()
    return new HttpResponse(null, { status: 204 })
  }),

  route('put', '/profile/avatar', { auth: 'required' }, async ({ request, userId }) => {
    const user = requireUser(userId)
    const body = (await request.json().catch(() => null)) as { avatarUrl?: string | null } | null
    const value = body?.avatarUrl ?? null
    if (value !== null && (typeof value !== 'string' || !value.startsWith('data:image/') || value.length > AVATAR_LIMIT)) {
      throw new ApiError(422, 'VALIDATION_ERROR', 'Imagem inválida ou grande demais.', { fields: { avatar: 'Use uma imagem de até 400 KB.' } })
    }
    user.avatarUrl = value
    persist()
    return HttpResponse.json({ user: publicUser(user) })
  }),

  route('get', '/favorites', { auth: 'required' }, ({ userId }) => HttpResponse.json({ nftIds: db().favorites[requireUser(userId).id] ?? [] })),

  route('put', '/favorites/:nftId', { auth: 'required' }, ({ userId, params }) => {
    const user = requireUser(userId)
    const nftId = asString(params.nftId)
    if (!db().nfts[nftId]) throw new ApiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    const list = db().favorites[user.id] ?? []
    if (!list.includes(nftId)) list.push(nftId)
    db().favorites[user.id] = list
    persist()
    return HttpResponse.json({ nftIds: list })
  }),

  route('delete', '/favorites/:nftId', { auth: 'required' }, ({ userId, params }) => {
    const user = requireUser(userId)
    db().favorites[user.id] = (db().favorites[user.id] ?? []).filter((id) => id !== asString(params.nftId))
    persist()
    return HttpResponse.json({ nftIds: db().favorites[user.id] })
  }),

  route('get', '/cart', { auth: 'optional' }, ({ identity }) => HttpResponse.json(cartView(cartFor(identity)))),

  route('post', '/cart/items', { auth: 'optional' }, async ({ request, identity }) => {
    const input = await readBody(request, cartItemInputSchema)
    const cart = cartFor(identity)
    addCartLine(cart, input)
    persist()
    return HttpResponse.json(cartView(cart), { status: 201 })
  }),

  route('patch', '/cart/items/:itemId', { auth: 'optional' }, async ({ request, identity, params }) => {
    const body = (await request.json().catch(() => null)) as { quantity?: unknown } | null
    const quantity = body?.quantity
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
      throw new ApiError(422, 'VALIDATION_ERROR', 'A quantidade precisa ser um inteiro positivo.', { fields: { quantity: 'Quantidade inválida.' } })
    }
    const { nftId, editionId } = parseItemId(asString(params.itemId))
    const cart = cartFor(identity)
    const line = cart.lines.find((entry) => entry.nftId === nftId && entry.editionId === editionId)
    if (!line) throw new ApiError(404, 'NOT_FOUND', 'Item não encontrado no carrinho.')
    const edition = db().nfts[nftId]?.editions.find((entry) => entry.id === editionId)
    if (edition && quantity > edition.available) {
      throw new ApiError(409, 'OUT_OF_STOCK', `Limite de ${edition.available} unidade(s) para esta edição.`)
    }
    line.quantity = quantity
    cart.version += 1
    persist()
    return HttpResponse.json(cartView(cart))
  }),

  route('delete', '/cart/items/:itemId', { auth: 'optional' }, ({ identity, params }) => {
    const { nftId, editionId } = parseItemId(asString(params.itemId))
    const cart = cartFor(identity)
    cart.lines = cart.lines.filter((entry) => !(entry.nftId === nftId && entry.editionId === editionId))
    cart.version += 1
    persist()
    return HttpResponse.json(cartView(cart))
  }),

  route('post', '/cart/coupon', { auth: 'optional' }, async ({ request, identity }) => {
    const input = await readBody(request, couponInputSchema)
    const coupon = validateCoupon(input.code)
    const cart = cartFor(identity)
    cart.couponCode = coupon.code
    cart.version += 1
    persist()
    return HttpResponse.json(cartView(cart))
  }),

  route('delete', '/cart/coupon', { auth: 'optional' }, ({ identity }) => {
    const cart = cartFor(identity)
    cart.couponCode = null
    cart.version += 1
    persist()
    return HttpResponse.json(cartView(cart))
  }),

  route('post', '/cart/merge', { auth: 'required' }, ({ request, userId }) => {
    const guestId = request.headers.get('x-guest-id')
    const target = cartFor({ userId, guestId: null })
    if (guestId) {
      const key = `guest:${guestId}`
      const guest = db().carts[key]
      if (guest) {
        for (const line of guest.lines) {
          const nft = db().nfts[line.nftId]
          const edition = nft?.editions.find((entry) => entry.id === line.editionId)
          if (!edition || edition.available === 0) continue
          const existing = target.lines.find((entry) => entry.nftId === line.nftId && entry.editionId === line.editionId)
          const quantity = Math.min((existing?.quantity ?? 0) + line.quantity, edition.available)
          if (existing) existing.quantity = quantity
          else target.lines.push({ ...line, quantity })
        }
        if (!target.couponCode && guest.couponCode) target.couponCode = guest.couponCode
        target.version += 1
        delete db().carts[key]
        persist()
      }
    }
    return HttpResponse.json(cartView(target))
  }),

  route('get', '/cart/quote', { auth: 'optional' }, ({ identity }) => HttpResponse.json(buildQuote(cartFor(identity)))),

  route('get', '/wallets', { auth: 'required' }, ({ userId }) => HttpResponse.json(db().wallets[requireUser(userId).id] ?? { primary: null, secondary: null })),

  route('put', '/wallets/:slot', { auth: 'required' }, async ({ request, userId, params }) => {
    const user = requireUser(userId)
    const slot = asString(params.slot)
    if (slot !== 'primary' && slot !== 'secondary') throw new ApiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
    const input = await readBody(request, walletSchema)
    const current_ = db().wallets[user.id] ?? { primary: null, secondary: null }
    current_[slot] = input
    db().wallets[user.id] = current_
    persist()
    return HttpResponse.json(current_)
  }),

  route('delete', '/wallets/secondary', { auth: 'required' }, ({ userId }) => {
    const user = requireUser(userId)
    const wallets = db().wallets[user.id] ?? { primary: null, secondary: null }
    wallets.secondary = null
    db().wallets[user.id] = wallets
    persist()
    return HttpResponse.json(wallets)
  }),

  route('get', '/wallet-connection', { auth: 'required' }, ({ userId }) =>
    HttpResponse.json(db().connections[requireUser(userId).id] ?? { status: 'disconnected', provider: null, network: null, address: null }),
  ),

  route('post', '/wallet-connection', { auth: 'required' }, async ({ request, userId }) => {
    const user = requireUser(userId)
    const input = await readBody(request, walletConnectInputSchema)
    if (current().scenario.flags.walletRejects) throw new ApiError(409, 'WALLET_REJECTED', 'A carteira recusou a conexão.')
    const connection = {
      status: 'connected' as const,
      provider: input.provider,
      network: input.network,
      address: `0x${hexDigest(`${user.id}:${input.provider}:${input.network}`, 40)}`,
    }
    db().connections[user.id] = connection
    persist()
    return HttpResponse.json(connection)
  }),

  route('delete', '/wallet-connection', { auth: 'required' }, ({ userId }) => {
    delete db().connections[requireUser(userId).id]
    persist()
    return new HttpResponse(null, { status: 204 })
  }),

  route('post', '/orders', { auth: 'required' }, async ({ request, userId, identity }) => {
    const user = requireUser(userId)
    const key = request.headers.get('idempotency-key')
    if (!key) throw new ApiError(422, 'VALIDATION_ERROR', 'O cabeçalho Idempotency-Key é obrigatório.', { fields: { 'Idempotency-Key': 'Obrigatório.' } })
    const input = await readBody(request, orderCreateInputSchema)
    const fingerprint = hexDigest(JSON.stringify([user.id, input]), 24)
    const scoped = `${user.id}:${key}`
    const previous = db().idempotency[scoped]
    if (previous) {
      if (previous.fingerprint !== fingerprint) {
        throw new ApiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Esta chave de idempotência já foi usada com outro conteúdo.')
      }
      return HttpResponse.json(publicOrder(db().orders[previous.orderId]), { status: 200 })
    }
    const connection = db().connections[user.id]
    if (!connection || connection.status !== 'connected' || connection.address !== input.wallet.address) {
      throw new ApiError(409, 'WALLET_NOT_CONNECTED', 'Conecte uma carteira antes de pagar.')
    }
    const cart = cartFor(identity)
    if (!cart.lines.length) throw new ApiError(422, 'VALIDATION_ERROR', 'Seu carrinho está vazio.')
    applyCheckoutTurbulence(cart)
    const quote = buildQuote(cart)
    if (quote.issues.length || quote.revision !== input.quoteRevision) {
      throw new ApiError(409, 'QUOTE_STALE', 'Os valores mudaram. Revise o pedido antes de confirmar.', { quote })
    }
    const order = createOrder(user.id, cart, quote, input)
    db().idempotency[scoped] = { fingerprint, orderId: order.id }
    persist()
    const flags = current().scenario.flags
    if (flags.orderTimeout && !current().orderTimeoutUsed) {
      current().orderTimeoutUsed = true
      await delay(settings.orderTimeoutHangMs)
    }
    return HttpResponse.json(publicOrder(order), { status: 201 })
  }),

  route('get', '/orders', { auth: 'required' }, ({ userId }) => {
    const user = requireUser(userId)
    const items = Object.values(db().orders)
      .filter((order) => order.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(publicOrder)
    return HttpResponse.json({ items })
  }),

  route('get', '/orders/:id', { auth: 'required' }, ({ userId, params }) => {
    const user = requireUser(userId)
    const order = db().orders[asString(params.id)]
    if (!order || order.userId !== user.id) throw new ApiError(404, 'NOT_FOUND', 'Pedido não encontrado.')
    return HttpResponse.json(publicOrder(order))
  }),
]

export { PAGE_SIZE }
