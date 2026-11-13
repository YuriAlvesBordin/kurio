import type {
  Cart,
  CartItem,
  CartItemInput,
  CatalogParams,
  EditionId,
  NftList,
  Order,
  OrderCreateInput,
  Quote,
} from '@/api/contracts'
import { categoryIds, networkIds } from '@/api/contracts'
import { categoryLabels, networkLabels } from '@/lib/labels'
import { compareEth, mulEth, percentOfEth, subEth, sumEth, toEthString, parseEth } from '@/lib/eth'
import { db, nextCounter, persist, type MockCart, type MockOrder } from './db'
import { ApiError } from './errors'
import { COUPONS, NETWORK_FEE_ETH } from './fixtures'
import { hexDigest } from './random'
import { publishNftUpdated, publishOrderUpdated } from './realtime'
import { current, settings } from './runtime'

export const PAGE_SIZE = 9

export interface Identity {
  userId: string | null
  guestId: string | null
}

/**
 * Applies the catalog query: search, filters, tab, sort and pagination, returning facets and price range.
 * @param params normalized query parameters
 */
export function queryCatalog(params: CatalogParams): NftList {
  const all = current().scenario.flags.emptyCatalog ? [] : Object.values(db().nfts)
  const text = (params.q ?? '').trim().toLowerCase()
  const min = params.min ?? null
  const max = params.max ?? null

  const matches = (skip: 'collections' | 'networks' | null) => (nft: (typeof all)[number]) => {
    if (text && !`${nft.name} ${nft.collection} ${nft.tokenId}`.toLowerCase().includes(text)) return false
    if (skip !== 'collections' && params.collections?.length && !params.collections.includes(nft.category)) return false
    if (skip !== 'networks' && params.networks?.length && !params.networks.includes(nft.network)) return false
    if (min && compareEth(nft.priceEth, min) < 0) return false
    if (max && compareEth(nft.priceEth, max) > 0) return false
    if (params.tab === 'new' && !nft.isNew) return false
    if (params.tab === 'trending' && nft.trendingScore < 100) return false
    return true
  }

  const filtered = all.filter(matches(null))
  const sort = params.sort ?? (params.tab === 'trending' ? undefined : 'recent')
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'price-asc') return compareEth(a.priceEth, b.priceEth) || a.id.localeCompare(b.id)
    if (sort === 'price-desc') return compareEth(b.priceEth, a.priceEth) || a.id.localeCompare(b.id)
    if (sort === 'name') return a.name.localeCompare(b.name)
    if (!sort) return b.trendingScore - a.trendingScore || a.id.localeCompare(b.id)
    return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)
  })

  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(Math.max(1, params.page ?? 1), totalPages)
  const items = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((nft) => ({
    id: nft.id,
    tokenId: nft.tokenId,
    name: nft.name,
    collection: nft.collection,
    category: nft.category,
    network: nft.network,
    priceEth: nft.priceEth,
    compareAtPriceEth: nft.compareAtPriceEth,
    image: nft.image,
    badge: nft.badge,
    isNew: nft.isNew,
    trendingScore: nft.trendingScore,
    createdAt: nft.createdAt,
    version: nft.version,
  }))

  const forCollections = all.filter(matches('collections'))
  const forNetworks = all.filter(matches('networks'))
  const prices = Object.values(db().nfts).map((nft) => nft.priceEth).sort(compareEth)

  return {
    items,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages,
    facets: {
      collections: categoryIds.map((id) => ({ id, label: categoryLabels[id], count: forCollections.filter((nft) => nft.category === id).length })),
      networks: networkIds.map((id) => ({ id, label: networkLabels[id], count: forNetworks.filter((nft) => nft.network === id).length })),
    },
    priceRange: { min: prices[0] ?? '0', max: prices[prices.length - 1] ?? '0' },
  }
}

/**
 * Finds the cart for an identity, creating it on first use.
 * @param identity authenticated user or guest identifier
 */
export function cartFor(identity: Identity): MockCart {
  const key = identity.userId ? `user:${identity.userId}` : `guest:${identity.guestId ?? 'anonymous'}`
  const carts = db().carts
  if (!carts[key]) carts[key] = { lines: [], couponCode: null, version: 1 }
  return carts[key]
}

/**
 * Builds the enriched cart view from raw lines using the current catalog state.
 * @param cart stored cart
 */
export function cartView(cart: MockCart): Cart {
  const items: CartItem[] = []
  for (const line of cart.lines) {
    const nft = db().nfts[line.nftId]
    if (!nft) continue
    const edition = nft.editions.find((entry) => entry.id === line.editionId)
    if (!edition) continue
    const state = edition.available === 0 ? 'sold_out' : line.quantity > edition.available ? 'insufficient' : 'ok'
    items.push({
      id: `${line.nftId}:${line.editionId}`,
      nftId: nft.id,
      tokenId: nft.tokenId,
      name: nft.name,
      image: nft.image,
      editionId: line.editionId,
      editionLabel: edition.label,
      quantity: line.quantity,
      maxQuantity: edition.available,
      unitPriceEth: nft.priceEth,
      lineTotalEth: mulEth(nft.priceEth, line.quantity),
      state,
    })
  }
  return {
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    couponCode: cart.couponCode,
    version: cart.version,
  }
}

/**
 * Validates a coupon code against the catalog of simulated coupons and the active scenario.
 * @param code raw code typed by the user
 */
export function validateCoupon(code: string): { code: string; basisPoints: number; label: string } {
  const normalized = code.trim().toUpperCase()
  if (!normalized) throw new ApiError(422, 'VALIDATION_ERROR', 'Informe um código promocional.', { fields: { code: 'Informe um código promocional.' } })
  const mode = current().scenario.flags.couponMode
  if (mode === 'expired') throw new ApiError(410, 'COUPON_EXPIRED', 'Este cupom expirou.')
  if (mode === 'invalid') throw new ApiError(422, 'COUPON_INVALID', 'Código promocional inválido.')
  const coupon = COUPONS[normalized]
  if (!coupon) throw new ApiError(422, 'COUPON_INVALID', 'Código promocional inválido.')
  if (coupon.expired) throw new ApiError(410, 'COUPON_EXPIRED', 'Este cupom expirou.')
  return { code: normalized, basisPoints: coupon.basisPoints, label: coupon.label }
}

/**
 * Computes the authoritative quote for a cart: subtotal, discount, network fee, total and issues.
 * @param cart stored cart
 */
export function buildQuote(cart: MockCart): Quote {
  const view = cartView(cart)
  const subtotal = sumEth(view.items.map((item) => item.lineTotalEth))
  let discount = '0'
  let discountLabel = 'Desconto do lançamento'
  if (cart.couponCode && COUPONS[cart.couponCode] && !COUPONS[cart.couponCode].expired) {
    discount = percentOfEth(subtotal, COUPONS[cart.couponCode].basisPoints)
    discountLabel = COUPONS[cart.couponCode].label
  }
  const fee = view.items.length ? NETWORK_FEE_ETH : '0'
  const total = sumEth([subEth(subtotal, discount), fee])
  const issues: Quote['issues'] = []
  for (const item of view.items) {
    if (item.state === 'sold_out') issues.push({ code: 'OUT_OF_STOCK', itemId: item.id, message: `${item.name} esgotou.` })
    if (item.state === 'insufficient') {
      issues.push({ code: 'INSUFFICIENT_STOCK', itemId: item.id, message: `${item.name} tem apenas ${item.maxQuantity} unidade(s) disponíveis.` })
    }
  }
  const revision = hexDigest(
    JSON.stringify([view.items.map((item) => [item.id, item.quantity, item.unitPriceEth, item.state]), cart.couponCode, fee]),
    12,
  )
  return {
    revision,
    items: view.items,
    subtotalEth: subtotal,
    discountEth: discount,
    discountLabel,
    networkFeeEth: fee,
    totalEth: total,
    couponCode: cart.couponCode,
    issues,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Adds an item to the cart or raises its quantity, respecting edition availability.
 * @param cart stored cart
 * @param input item to add
 */
export function addCartLine(cart: MockCart, input: CartItemInput): void {
  const nft = db().nfts[input.nftId]
  if (!nft) throw new ApiError(404, 'NOT_FOUND', 'NFT não encontrado.')
  const edition = nft.editions.find((entry) => entry.id === input.editionId)
  if (!edition) throw new ApiError(404, 'NOT_FOUND', 'Edição não encontrada.')
  if (edition.available === 0) throw new ApiError(409, 'EDITION_UNAVAILABLE', 'Esta edição está esgotada.')
  const existing = cart.lines.find((line) => line.nftId === input.nftId && line.editionId === input.editionId)
  const quantity = (existing?.quantity ?? 0) + input.quantity
  if (quantity > edition.available) {
    throw new ApiError(409, 'OUT_OF_STOCK', `Limite de ${edition.available} unidade(s) para esta edição.`)
  }
  if (existing) existing.quantity = quantity
  else cart.lines.push({ nftId: input.nftId, editionId: input.editionId, quantity })
  cart.version += 1
}

/**
 * Splits a composite cart item id back into NFT and edition identifiers.
 * @param itemId id shaped as "nft-001:e50"
 */
export function parseItemId(itemId: string): { nftId: string; editionId: EditionId } {
  const [nftId, editionId] = itemId.split(':')
  return { nftId, editionId: editionId as EditionId }
}

/**
 * Reserves stock for every line of a quote and publishes the resulting nft.updated events.
 * @param lines purchased lines
 */
function reserveStock(lines: CartItemInput[]): void {
  const touched = new Set<string>()
  for (const line of lines) {
    const nft = db().nfts[line.nftId]
    const edition = nft?.editions.find((entry) => entry.id === line.editionId)
    if (!nft || !edition) continue
    edition.available = Math.max(0, edition.available - line.quantity)
    touched.add(nft.id)
  }
  for (const id of touched) publishNftUpdated(db().nfts[id])
}

/**
 * Releases previously reserved stock after a rejected order.
 * @param lines lines to restore
 */
function releaseStock(lines: CartItemInput[]): void {
  const touched = new Set<string>()
  for (const line of lines) {
    const nft = db().nfts[line.nftId]
    const edition = nft?.editions.find((entry) => entry.id === line.editionId)
    if (!nft || !edition) continue
    edition.available = Math.min(edition.supply, edition.available + line.quantity)
    touched.add(nft.id)
  }
  for (const id of touched) publishNftUpdated(db().nfts[id])
}

/**
 * Applies the scenario driven price or availability change right before an order is accepted.
 * @param cart stored cart of the buyer
 */
export function applyCheckoutTurbulence(cart: MockCart): void {
  const flags = current().scenario.flags
  const first = cart.lines[0]
  if (!first) return
  const nft = db().nfts[first.nftId]
  if (!nft) return
  if (flags.priceChangeOnCheckout && !current().priceChangeUsed) {
    current().priceChangeUsed = true
    nft.priceEth = toEthString(parseEth(nft.priceEth) + parseEth(nft.priceEth) / 10n)
    publishNftUpdated(nft)
  }
  if (flags.soldOutOnCheckout && !current().soldOutUsed) {
    current().soldOutUsed = true
    const edition = nft.editions.find((entry) => entry.id === first.editionId)
    if (edition) edition.available = 0
    publishNftUpdated(nft)
  }
}

/**
 * Creates a pending order from a validated quote, reserving stock and scheduling settlement.
 * @param userId order owner
 * @param cart buyer cart
 * @param quote quote accepted by the buyer
 * @param input order payload
 */
export function createOrder(userId: string, cart: MockCart, quote: Quote, input: OrderCreateInput): MockOrder {
  const now = new Date().toISOString()
  const id = `ORD-${String(nextCounter('order')).padStart(5, '0')}`
  const lines = quote.items.map((item) => ({ nftId: item.nftId, editionId: item.editionId, quantity: item.quantity }))
  const order: MockOrder = {
    id,
    userId,
    status: 'pending',
    version: 1,
    createdAt: now,
    updatedAt: now,
    txHash: null,
    rejectionReason: null,
    wallet: input.wallet,
    snapshot: {
      items: quote.items,
      subtotalEth: quote.subtotalEth,
      discountEth: quote.discountEth,
      networkFeeEth: quote.networkFeeEth,
      totalEth: quote.totalEth,
      couponCode: quote.couponCode,
    },
    stockReserved: lines,
    settleAt: null,
  }
  reserveStock(lines)
  db().orders[id] = order
  void cart
  scheduleSettlement(order)
  persist()
  return order
}

/**
 * Schedules the pending order to reach its terminal state according to the scenario.
 * @param order pending order
 */
export function scheduleSettlement(order: MockOrder): void {
  if (settings.manualSettlement || order.status !== 'pending') return
  const settleAt = order.settleAt ?? new Date(Date.now() + settings.orderSettleMs).toISOString()
  order.settleAt = settleAt
  const wait = Math.max(0, new Date(settleAt).getTime() - Date.now())
  setTimeout(() => {
    settleOrder(order.id, current().scenario.flags.orderOutcome)
  }, wait)
}

/**
 * Moves a pending order to confirmed or rejected exactly once and notifies the owner.
 * @param orderId order identifier
 * @param outcome terminal state
 */
export function settleOrder(orderId: string, outcome: 'confirmed' | 'rejected'): MockOrder | null {
  const order = db().orders[orderId]
  if (!order || order.status !== 'pending') return order ?? null
  order.status = outcome
  order.version += 1
  order.updatedAt = new Date().toISOString()
  order.settleAt = null
  if (outcome === 'confirmed') {
    order.txHash = `0x${hexDigest(`${order.id}:${order.createdAt}`, 64)}`
    const cart = db().carts[`user:${order.userId}`]
    if (cart) {
      for (const bought of order.stockReserved) {
        const line = cart.lines.find((entry) => entry.nftId === bought.nftId && entry.editionId === bought.editionId)
        if (!line) continue
        line.quantity -= bought.quantity
      }
      cart.lines = cart.lines.filter((line) => line.quantity > 0)
      cart.version += 1
    }
  } else {
    order.rejectionReason = 'O pagamento foi recusado pela carteira.'
    releaseStock(order.stockReserved)
  }
  persist()
  publishOrderUpdated(order)
  return order
}

/**
 * Restarts settlement timers for pending orders after the page reloads.
 */
export function resumePendingOrders(): void {
  for (const order of Object.values(db().orders)) {
    if (order.status === 'pending') scheduleSettlement(order)
  }
}

/**
 * Strips server only fields before an order leaves the mock backend.
 * @param order stored order
 */
export function publicOrder(order: MockOrder): Order {
  const { userId, stockReserved, settleAt, ...rest } = order
  void userId
  void stockReserved
  void settleAt
  return rest
}
