import type { CartItemInput, NftDetail, Order, User, Wallet, WalletConnection } from '@/api/contracts'
import { buildCatalog, SEED_USERS } from './fixtures'
import { hexDigest } from './random'

export interface MockUser extends User {
  passwordHash: string
  salt: string
}

export interface MockCart {
  lines: CartItemInput[]
  couponCode: string | null
  version: number
}

export interface MockToken {
  userId: string
  expiresAt: string
  expired: boolean
}

export interface MockOrder extends Order {
  userId: string
  stockReserved: CartItemInput[]
  settleAt: string | null
}

export interface MockDb {
  schema: number
  nfts: Record<string, NftDetail>
  users: Record<string, MockUser>
  tokens: Record<string, MockToken>
  favorites: Record<string, string[]>
  carts: Record<string, MockCart>
  wallets: Record<string, { primary: Wallet | null; secondary: Wallet | null }>
  connections: Record<string, WalletConnection>
  orders: Record<string, MockOrder>
  idempotency: Record<string, { fingerprint: string; orderId: string }>
  counters: { order: number; event: number; token: number }
}

const STORAGE_KEY = 'kurio.mock.db'
const SCHEMA = 3

/**
 * Hashes a password with SHA-256 so plain passwords are never stored.
 * @param salt per user salt
 * @param password plain password
 */
export async function hashPassword(salt: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Builds the known initial state shared by demo, development and tests.
 */
async function seed(): Promise<MockDb> {
  const nfts: Record<string, NftDetail> = {}
  for (const nft of buildCatalog()) nfts[nft.id] = nft
  const users: Record<string, MockUser> = {}
  const wallets: MockDb['wallets'] = {}
  const favorites: MockDb['favorites'] = {}
  for (const entry of SEED_USERS) {
    const salt = hexDigest(entry.id, 16)
    users[entry.id] = {
      id: entry.id,
      username: entry.username,
      email: entry.email,
      displayName: entry.displayName,
      ensName: entry.ensName,
      ensSuffix: '.eth',
      walletAlias: entry.walletAlias,
      avatarUrl: null,
      salt,
      passwordHash: await hashPassword(salt, entry.password),
    }
    wallets[entry.id] = {
      primary: {
        displayName: entry.displayName,
        alias: entry.walletAlias,
        network: 'ethereum',
        profileName: entry.username,
        address: `0x${hexDigest(`${entry.id}-primary`, 40)}`,
        secondaryAddress: '',
        type: 'metamask',
        referralCode: 'KURIO-2026',
        email: entry.email,
        ensName: entry.ensName,
        ensSuffix: '.eth',
      },
      secondary: null,
    }
    favorites[entry.id] = entry.id === 'user-ana' ? ['nft-002'] : []
  }
  return {
    schema: SCHEMA,
    nfts,
    users,
    tokens: {},
    favorites,
    carts: {},
    wallets,
    connections: {},
    orders: {},
    idempotency: {},
    counters: { order: 0, event: 0, token: 0 },
  }
}

let state: MockDb | null = null

/**
 * Returns the loaded database and fails loudly when it was not initialized.
 */
export function db(): MockDb {
  if (!state) throw new Error('Mock database accessed before initialization')
  return state
}

/**
 * Loads persisted state from localStorage or seeds a fresh database.
 */
export async function initDb(): Promise<void> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb
      if (parsed.schema === SCHEMA) {
        state = parsed
        return
      }
    }
  } catch {
    state = null
  }
  state = await seed()
  persist()
}

/**
 * Restores the known seeded state and clears persisted mock data.
 */
export async function resetDb(): Promise<void> {
  state = await seed()
  persist()
}

/**
 * Writes the current state to localStorage so refreshes keep the simulated backend consistent.
 */
export function persist(): void {
  if (!state) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    return
  }
}

/**
 * Allocates the next sequential number for a named counter.
 * @param name counter name
 */
export function nextCounter(name: keyof MockDb['counters']): number {
  const data = db()
  data.counters[name] += 1
  return data.counters[name]
}
