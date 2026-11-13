import { z } from 'zod'

export const ethAmount = z.string().regex(/^\d+(\.\d+)?$/)

export const networkIds = ['ethereum', 'polygon', 'solana'] as const
export const networkSchema = z.enum(networkIds)
export type NetworkId = z.infer<typeof networkSchema>

export const categoryIds = [
  'digital-art',
  'photography',
  'music',
  '3d-art',
  'collectibles',
  'generative',
  'games',
  'subscriptions',
  'utility',
] as const
export const categorySchema = z.enum(categoryIds)
export type CategoryId = z.infer<typeof categorySchema>

export const artworkIds = ['ape-hoodie', 'ape-varsity', 'ape-blazer', 'ape-headphones'] as const
export const artworkSchema = z.enum(artworkIds)
export type ArtworkId = z.infer<typeof artworkSchema>

export const walletProviderIds = ['metamask', 'walletconnect', 'coinbase'] as const
export const walletProviderSchema = z.enum(walletProviderIds)
export type WalletProviderId = z.infer<typeof walletProviderSchema>

export const editionIds = ['e1', 'e10', 'e50', 'open'] as const
export const editionIdSchema = z.enum(editionIds)
export type EditionId = z.infer<typeof editionIdSchema>

export const sortIds = ['recent', 'price-asc', 'price-desc', 'name'] as const
export const sortSchema = z.enum(sortIds)
export type SortId = z.infer<typeof sortSchema>

export const tabIds = ['all', 'new', 'trending'] as const
export const tabSchema = z.enum(tabIds)
export type TabId = z.infer<typeof tabSchema>

export const errorCodes = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'EMAIL_TAKEN',
  'USERNAME_TAKEN',
  'INVALID_CREDENTIALS',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'OUT_OF_STOCK',
  'EDITION_UNAVAILABLE',
  'QUOTE_STALE',
  'WALLET_NOT_CONNECTED',
  'WALLET_REJECTED',
  'IDEMPOTENCY_KEY_REUSED',
  'TRANSIENT_FAILURE',
  'INTERNAL_ERROR',
] as const
export const errorCodeSchema = z.enum(errorCodes)
export type ErrorCode = z.infer<typeof errorCodeSchema>

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
    quote: z.lazy(() => quoteSchema).optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>

export const editionSchema = z.object({
  id: editionIdSchema,
  label: z.string(),
  supply: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
})
export type Edition = z.infer<typeof editionSchema>

export const nftSummarySchema = z.object({
  id: z.string(),
  tokenId: z.number().int(),
  name: z.string(),
  collection: z.string(),
  category: categorySchema,
  network: networkSchema,
  priceEth: ethAmount,
  compareAtPriceEth: ethAmount.nullable(),
  image: artworkSchema,
  badge: z.string().nullable(),
  isNew: z.boolean(),
  trendingScore: z.number().int(),
  createdAt: z.string(),
  version: z.number().int(),
})
export type NftSummary = z.infer<typeof nftSummarySchema>

export const nftDetailSchema = nftSummarySchema.extend({
  description: z.string(),
  longDescription: z.array(z.string()),
  attributes: z.array(z.string()),
  rating: z.number(),
  reviewCount: z.number().int(),
  gallery: z.array(artworkSchema),
  editions: z.array(editionSchema),
  contractAddress: z.string(),
  royaltyPercent: z.number(),
})
export type NftDetail = z.infer<typeof nftDetailSchema>

export const facetSchema = z.object({ id: z.string(), label: z.string(), count: z.number().int() })

export const nftListSchema = z.object({
  items: z.array(nftSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
  facets: z.object({ collections: z.array(facetSchema), networks: z.array(facetSchema) }),
  priceRange: z.object({ min: ethAmount, max: ethAmount }),
})
export type NftList = z.infer<typeof nftListSchema>

export const catalogParamsSchema = z.object({
  q: z.string().optional(),
  collections: z.array(categorySchema).optional(),
  networks: z.array(networkSchema).optional(),
  min: ethAmount.optional(),
  max: ethAmount.optional(),
  sort: sortSchema.optional(),
  tab: tabSchema.optional(),
  page: z.number().int().positive().optional(),
})
export type CatalogParams = z.infer<typeof catalogParamsSchema>

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  email: z.string(),
  ensName: z.string(),
  ensSuffix: z.string(),
  walletAlias: z.string(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof userSchema>

export const authResponseSchema = z.object({ user: userSchema, token: z.string(), expiresAt: z.string() })
export type AuthResponse = z.infer<typeof authResponseSchema>

export const sessionResponseSchema = z.object({ user: userSchema })
export type SessionResponse = z.infer<typeof sessionResponseSchema>

export const loginInputSchema = z.object({ email: z.string(), password: z.string() })
export type LoginInput = z.infer<typeof loginInputSchema>

export const registerInputSchema = z.object({ username: z.string(), email: z.string(), password: z.string() })
export type RegisterInput = z.infer<typeof registerInputSchema>

export const profileUpdateSchema = z.object({
  displayName: z.string(),
  username: z.string(),
  email: z.string(),
  ensName: z.string(),
  ensSuffix: z.string(),
  walletAlias: z.string(),
})
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>

export const passwordChangeSchema = z.object({ currentPassword: z.string(), newPassword: z.string() })
export type PasswordChange = z.infer<typeof passwordChangeSchema>

export const favoritesSchema = z.object({ nftIds: z.array(z.string()) })
export type Favorites = z.infer<typeof favoritesSchema>

export const cartItemInputSchema = z.object({
  nftId: z.string(),
  editionId: editionIdSchema,
  quantity: z.number().int().positive(),
})
export type CartItemInput = z.infer<typeof cartItemInputSchema>

export const cartItemStates = ['ok', 'price_changed', 'sold_out', 'insufficient'] as const

export const cartItemSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  tokenId: z.number().int(),
  name: z.string(),
  image: artworkSchema,
  editionId: editionIdSchema,
  editionLabel: z.string(),
  quantity: z.number().int().positive(),
  maxQuantity: z.number().int().nonnegative(),
  unitPriceEth: ethAmount,
  lineTotalEth: ethAmount,
  state: z.enum(cartItemStates),
})
export type CartItem = z.infer<typeof cartItemSchema>

export const cartSchema = z.object({
  items: z.array(cartItemSchema),
  itemCount: z.number().int().nonnegative(),
  couponCode: z.string().nullable(),
  version: z.number().int(),
})
export type Cart = z.infer<typeof cartSchema>

export const quoteIssueSchema = z.object({
  code: z.enum(['PRICE_CHANGED', 'OUT_OF_STOCK', 'INSUFFICIENT_STOCK']),
  itemId: z.string(),
  message: z.string(),
})

export const quoteSchema = z.object({
  revision: z.string(),
  items: z.array(cartItemSchema),
  subtotalEth: ethAmount,
  discountEth: ethAmount,
  discountLabel: z.string(),
  networkFeeEth: ethAmount,
  totalEth: ethAmount,
  couponCode: z.string().nullable(),
  issues: z.array(quoteIssueSchema),
  generatedAt: z.string(),
})
export type Quote = z.infer<typeof quoteSchema>

export const couponInputSchema = z.object({ code: z.string() })

export const walletSchema = z.object({
  displayName: z.string(),
  alias: z.string(),
  network: networkSchema,
  profileName: z.string(),
  address: z.string(),
  secondaryAddress: z.string(),
  type: walletProviderSchema,
  referralCode: z.string(),
  email: z.string(),
  ensName: z.string(),
  ensSuffix: z.string(),
})
export type Wallet = z.infer<typeof walletSchema>

export const walletsSchema = z.object({ primary: walletSchema.nullable(), secondary: walletSchema.nullable() })
export type Wallets = z.infer<typeof walletsSchema>

export const walletConnectionSchema = z.object({
  status: z.enum(['disconnected', 'connected']),
  provider: walletProviderSchema.nullable(),
  network: networkSchema.nullable(),
  address: z.string().nullable(),
})
export type WalletConnection = z.infer<typeof walletConnectionSchema>

export const walletConnectInputSchema = z.object({ provider: walletProviderSchema, network: networkSchema })
export type WalletConnectInput = z.infer<typeof walletConnectInputSchema>

export const orderStatuses = ['pending', 'confirmed', 'rejected'] as const
export const orderStatusSchema = z.enum(orderStatuses)
export type OrderStatus = z.infer<typeof orderStatusSchema>

export const orderCreateInputSchema = z.object({
  quoteRevision: z.string(),
  collector: z.object({
    displayName: z.string(),
    username: z.string(),
    email: z.string(),
    profileName: z.string(),
    referralCode: z.string(),
    ensName: z.string(),
    ensSuffix: z.string(),
    secondaryAddress: z.string(),
    note: z.string(),
  }),
  wallet: z.object({ provider: walletProviderSchema, network: networkSchema, address: z.string() }),
})
export type OrderCreateInput = z.infer<typeof orderCreateInputSchema>

export const orderSnapshotSchema = z.object({
  items: z.array(cartItemSchema),
  subtotalEth: ethAmount,
  discountEth: ethAmount,
  networkFeeEth: ethAmount,
  totalEth: ethAmount,
  couponCode: z.string().nullable(),
})

export const orderSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  txHash: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  wallet: z.object({ provider: walletProviderSchema, network: networkSchema, address: z.string() }),
  snapshot: orderSnapshotSchema,
})
export type Order = z.infer<typeof orderSchema>

export const ordersListSchema = z.object({ items: z.array(orderSchema) })

export const socketEventTypes = ['nft.updated', 'order.updated'] as const

export const nftUpdatedPayloadSchema = z.object({
  priceEth: ethAmount,
  compareAtPriceEth: ethAmount.nullable(),
  editions: z.array(z.object({ id: editionIdSchema, available: z.number().int().nonnegative() })),
})
export type NftUpdatedPayload = z.infer<typeof nftUpdatedPayloadSchema>

export const orderUpdatedPayloadSchema = z.object({
  status: orderStatusSchema,
  txHash: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  updatedAt: z.string(),
})
export type OrderUpdatedPayload = z.infer<typeof orderUpdatedPayloadSchema>

export const nftUpdatedEventSchema = z.object({
  eventId: z.string(),
  type: z.literal('nft.updated'),
  resource: z.object({ type: z.literal('nft'), id: z.string() }),
  version: z.number().int(),
  occurredAt: z.string(),
  payload: nftUpdatedPayloadSchema,
})

export const orderUpdatedEventSchema = z.object({
  eventId: z.string(),
  type: z.literal('order.updated'),
  resource: z.object({ type: z.literal('order'), id: z.string() }),
  version: z.number().int(),
  occurredAt: z.string(),
  payload: orderUpdatedPayloadSchema,
})

export const socketEventSchema = z.discriminatedUnion('type', [nftUpdatedEventSchema, orderUpdatedEventSchema])
export type SocketEvent = z.infer<typeof socketEventSchema>
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

export const scenarioIds = [
  'default',
  'empty',
  'slow',
  'jitter',
  'offline',
  'server-errors',
  'session-expired',
  'unauthorized',
  'register-conflict',
  'coupon-invalid',
  'coupon-expired',
  'price-change',
  'sold-out',
  'order-timeout',
  'order-rejected',
  'wallet-rejected',
] as const
export const scenarioIdSchema = z.enum(scenarioIds)
export type ScenarioId = z.infer<typeof scenarioIdSchema>
