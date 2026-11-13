import type { CatalogParams } from './contracts'

export const keys = {
  catalog: (params: CatalogParams) => ['catalog', params] as const,
  catalogRoot: ['catalog'] as const,
  nft: (id: string) => ['nft', id] as const,
  nftRoot: ['nft'] as const,
  cart: (owner: string) => ['cart', owner] as const,
  cartRoot: ['cart'] as const,
  privateRoot: ['private'] as const,
  favorites: (userId: string) => ['private', userId, 'favorites'] as const,
  quote: (userId: string) => ['private', userId, 'quote'] as const,
  wallets: (userId: string) => ['private', userId, 'wallets'] as const,
  connection: (userId: string) => ['private', userId, 'connection'] as const,
  order: (userId: string, id: string) => ['private', userId, 'order', id] as const,
  orders: (userId: string) => ['private', userId, 'orders'] as const,
}
