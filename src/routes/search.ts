import { categoryIds, networkIds, sortIds, tabIds, type CatalogParams, type CategoryId, type NetworkId, type SortId, type TabId } from '@/api/contracts'

export interface AuthSearch {
  auth?: 'login' | 'register'
  reason?: 'expired'
  redirect?: string
}

export interface CatalogSearch extends AuthSearch {
  q?: string
  collections?: string
  networks?: string
  min?: string
  max?: string
  sort?: SortId
  tab?: TabId
  page?: number
}

const PRICE = /^\d+(\.\d{1,18})?$/

/**
 * Keeps only values from an allowed list, preserving order and dropping duplicates.
 * @param value comma separated raw value
 * @param allowed accepted values
 */
function pickList<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  if (typeof value !== 'string') return []
  const wanted = new Set(value.split(',').map((entry) => entry.trim()))
  return allowed.filter((entry) => wanted.has(entry))
}

/**
 * Reads a search value as text because the router parses numeric looking values into numbers.
 * @param value raw search value
 */
function asText(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

/**
 * Validates the shared authentication search parameters of every route.
 * @param raw untyped search object
 */
export function validateAuthSearch(raw: Record<string, unknown>): AuthSearch {
  const result: AuthSearch = { auth: undefined, reason: undefined, redirect: undefined }
  if (raw.auth === 'login' || raw.auth === 'register') result.auth = raw.auth
  if (raw.reason === 'expired') result.reason = 'expired'
  if (typeof raw.redirect === 'string' && raw.redirect.startsWith('/') && !raw.redirect.startsWith('//')) result.redirect = raw.redirect
  return result
}

/**
 * Validates and normalizes catalog search parameters read from the URL.
 * Unknown or malformed values are dropped so a hand edited URL never breaks the page.
 * Every key is set explicitly because the router merges the raw parent search over the validated one.
 * @param raw untyped search object
 */
export function validateCatalogSearch(raw: Record<string, unknown>): CatalogSearch {
  const result: CatalogSearch = {
    ...validateAuthSearch(raw),
    q: undefined,
    collections: undefined,
    networks: undefined,
    min: undefined,
    max: undefined,
    sort: undefined,
    tab: undefined,
    page: undefined,
  }
  const query = asText(raw.q)?.trim()
  if (query) result.q = query.slice(0, 80)
  const collections = pickList<CategoryId>(raw.collections, categoryIds)
  if (collections.length) result.collections = collections.join(',')
  const networks = pickList<NetworkId>(raw.networks, networkIds)
  if (networks.length) result.networks = networks.join(',')
  const min = asText(raw.min)
  const max = asText(raw.max)
  if (min && PRICE.test(min)) result.min = min
  if (max && PRICE.test(max)) result.max = max
  if (typeof raw.sort === 'string' && (sortIds as readonly string[]).includes(raw.sort) && raw.sort !== 'recent') result.sort = raw.sort as SortId
  if (typeof raw.tab === 'string' && (tabIds as readonly string[]).includes(raw.tab) && raw.tab !== 'all') result.tab = raw.tab as TabId
  const page = Number(raw.page)
  if (Number.isInteger(page) && page > 1) result.page = page
  return result
}

/**
 * Converts URL search state into the typed parameters used by the catalog query.
 * @param search validated search
 */
export function toCatalogParams(search: CatalogSearch): CatalogParams {
  return {
    q: search.q,
    collections: search.collections ? pickList<CategoryId>(search.collections, categoryIds) : undefined,
    networks: search.networks ? pickList<NetworkId>(search.networks, networkIds) : undefined,
    min: search.min,
    max: search.max,
    sort: search.sort,
    tab: search.tab,
    page: search.page,
  }
}

/**
 * Rebuilds a relative URL without the authentication parameters so it can be used as a redirect target.
 * @param pathname current path
 * @param searchStr current raw search string including the leading question mark
 */
export function withoutAuthParams(pathname: string, searchStr: string): string {
  const params = new URLSearchParams(searchStr)
  params.delete('auth')
  params.delete('reason')
  params.delete('redirect')
  const rest = params.toString()
  return rest ? `${pathname}?${rest}` : pathname
}
