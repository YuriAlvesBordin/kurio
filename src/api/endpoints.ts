import {
  authResponseSchema,
  cartSchema,
  favoritesSchema,
  nftDetailSchema,
  nftListSchema,
  orderSchema,
  ordersListSchema,
  quoteSchema,
  sessionResponseSchema,
  walletConnectionSchema,
  walletsSchema,
  type CatalogParams,
  type CartItemInput,
  type LoginInput,
  type OrderCreateInput,
  type PasswordChange,
  type ProfileUpdate,
  type RegisterInput,
  type Wallet,
  type WalletConnectInput,
} from './contracts'
import { http } from './http'

/**
 * Serializes catalog parameters into the query string used by GET /nfts.
 * @param params catalog parameters
 */
export function catalogQuery(params: CatalogParams): Record<string, string> {
  const query: Record<string, string> = {}
  if (params.q) query.q = params.q
  if (params.collections?.length) query.collections = params.collections.join(',')
  if (params.networks?.length) query.networks = params.networks.join(',')
  if (params.min) query.min = params.min
  if (params.max) query.max = params.max
  if (params.sort) query.sort = params.sort
  if (params.tab && params.tab !== 'all') query.tab = params.tab
  if (params.page && params.page > 1) query.page = String(params.page)
  return query
}

export const api = {
  async catalog(params: CatalogParams, signal?: AbortSignal) {
    const { data } = await http.get('/nfts', { params: catalogQuery(params), signal })
    return nftListSchema.parse(data)
  },
  async nft(id: string, signal?: AbortSignal) {
    const { data } = await http.get(`/nfts/${id}`, { signal })
    return nftDetailSchema.parse(data)
  },
  async register(input: RegisterInput) {
    const { data } = await http.post('/auth/register', input)
    return authResponseSchema.parse(data)
  },
  async login(input: LoginInput) {
    const { data } = await http.post('/auth/login', input)
    return authResponseSchema.parse(data)
  },
  async logout(token: string) {
    await http.post('/auth/logout', undefined, { headers: { Authorization: `Bearer ${token}` } })
  },
  async session(signal?: AbortSignal) {
    const { data } = await http.get('/session', { signal })
    return sessionResponseSchema.parse(data)
  },
  async updateProfile(input: ProfileUpdate) {
    const { data } = await http.patch('/profile', input)
    return sessionResponseSchema.parse(data)
  },
  async changePassword(input: PasswordChange) {
    await http.post('/profile/password', input)
  },
  async updateAvatar(avatarUrl: string | null) {
    const { data } = await http.put('/profile/avatar', { avatarUrl })
    return sessionResponseSchema.parse(data)
  },
  async favorites(signal?: AbortSignal) {
    const { data } = await http.get('/favorites', { signal })
    return favoritesSchema.parse(data)
  },
  async addFavorite(nftId: string) {
    const { data } = await http.put(`/favorites/${nftId}`)
    return favoritesSchema.parse(data)
  },
  async removeFavorite(nftId: string) {
    const { data } = await http.delete(`/favorites/${nftId}`)
    return favoritesSchema.parse(data)
  },
  async cart(signal?: AbortSignal) {
    const { data } = await http.get('/cart', { signal })
    return cartSchema.parse(data)
  },
  async addCartItem(input: CartItemInput) {
    const { data } = await http.post('/cart/items', input)
    return cartSchema.parse(data)
  },
  async setCartQuantity(itemId: string, quantity: number) {
    const { data } = await http.patch(`/cart/items/${encodeURIComponent(itemId)}`, { quantity })
    return cartSchema.parse(data)
  },
  async removeCartItem(itemId: string) {
    const { data } = await http.delete(`/cart/items/${encodeURIComponent(itemId)}`)
    return cartSchema.parse(data)
  },
  async applyCoupon(code: string) {
    const { data } = await http.post('/cart/coupon', { code })
    return cartSchema.parse(data)
  },
  async removeCoupon() {
    const { data } = await http.delete('/cart/coupon')
    return cartSchema.parse(data)
  },
  async mergeCart() {
    const { data } = await http.post('/cart/merge')
    return cartSchema.parse(data)
  },
  async quote(signal?: AbortSignal) {
    const { data } = await http.get('/cart/quote', { signal })
    return quoteSchema.parse(data)
  },
  async wallets(signal?: AbortSignal) {
    const { data } = await http.get('/wallets', { signal })
    return walletsSchema.parse(data)
  },
  async saveWallet(slot: 'primary' | 'secondary', wallet: Wallet) {
    const { data } = await http.put(`/wallets/${slot}`, wallet)
    return walletsSchema.parse(data)
  },
  async removeSecondaryWallet() {
    const { data } = await http.delete('/wallets/secondary')
    return walletsSchema.parse(data)
  },
  async walletConnection(signal?: AbortSignal) {
    const { data } = await http.get('/wallet-connection', { signal })
    return walletConnectionSchema.parse(data)
  },
  async connectWallet(input: WalletConnectInput) {
    const { data } = await http.post('/wallet-connection', input)
    return walletConnectionSchema.parse(data)
  },
  async disconnectWallet() {
    await http.delete('/wallet-connection')
  },
  async createOrder(input: OrderCreateInput, idempotencyKey: string) {
    const { data } = await http.post('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey } })
    return orderSchema.parse(data)
  },
  async order(id: string, signal?: AbortSignal) {
    const { data } = await http.get(`/orders/${id}`, { signal })
    return orderSchema.parse(data)
  },
  async orders(signal?: AbortSignal) {
    const { data } = await http.get('/orders', { signal })
    return ordersListSchema.parse(data)
  },
}

export type Api = typeof api
