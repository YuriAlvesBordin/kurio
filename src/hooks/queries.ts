import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Cart, CatalogParams, Order, Wallet } from '@/api/contracts'
import { api } from '@/api/endpoints'
import type { ClientError } from '@/api/errors'
import { keys } from '@/api/keys'
import { mulEth } from '@/lib/eth'
import { useAuth } from '@/features/auth/authStore'

/**
 * Returns the identifier that scopes cart and quote caches: the user id or "guest".
 */
export function useOwner(): string {
  return useAuth().user?.id ?? 'guest'
}

/**
 * Loads one catalog page and keeps the previous page visible while the next one loads.
 * The query key contains every parameter so out of order responses can never overwrite a newer view.
 * @param params catalog parameters read from the URL
 */
export function useCatalog(params: CatalogParams) {
  return useQuery({
    queryKey: keys.catalog(params),
    queryFn: ({ signal }) => api.catalog(params, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * Loads the detail of one NFT.
 * @param id NFT id
 */
export function useNft(id: string) {
  return useQuery({ queryKey: keys.nft(id), queryFn: ({ signal }) => api.nft(id, signal), staleTime: 15_000 })
}

/**
 * Loads the cart of the current owner, anonymous or authenticated.
 */
export function useCart() {
  const owner = useOwner()
  return useQuery({ queryKey: keys.cart(owner), queryFn: ({ signal }) => api.cart(signal), staleTime: 10_000 })
}

/**
 * Loads the authoritative quote for the current cart.
 */
export function useQuote() {
  const owner = useOwner()
  const cart = useCart()
  return useQuery({
    queryKey: [...keys.quote(owner), cart.data?.version ?? 0],
    queryFn: ({ signal }) => api.quote(signal),
    enabled: cart.isSuccess,
    staleTime: 0,
  })
}

/**
 * Builds cart mutations that update the cached cart immediately and roll back on failure.
 */
export function useCartMutations() {
  const client = useQueryClient()
  const owner = useOwner()
  const key = keys.cart(owner)

  const settle = () => {
    void client.invalidateQueries({ queryKey: keys.cart(owner) })
    void client.invalidateQueries({ queryKey: keys.quote(owner) })
  }

  const snapshot = async () => {
    await client.cancelQueries({ queryKey: key })
    return client.getQueryData<Cart>(key)
  }

  const rollback = (_error: unknown, _vars: unknown, previous: Cart | undefined) => {
    if (previous) client.setQueryData(key, previous)
  }

  return {
    add: useMutation({
      mutationFn: (input: Parameters<typeof api.addCartItem>[0]) => api.addCartItem(input),
      onSuccess: (cart) => client.setQueryData(key, cart),
      onSettled: settle,
    }),
    setQuantity: useMutation<Cart, ClientError, { itemId: string; quantity: number }, Cart | undefined>({
      mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => api.setCartQuantity(itemId, quantity),
      onMutate: async ({ itemId, quantity }) => {
        const previous = await snapshot()
        if (previous) {
          client.setQueryData<Cart>(key, {
            ...previous,
            items: previous.items.map((item) =>
              item.id === itemId ? { ...item, quantity, lineTotalEth: mulEth(item.unitPriceEth, quantity) } : item,
            ),
            itemCount: previous.items.reduce((sum, item) => sum + (item.id === itemId ? quantity : item.quantity), 0),
          })
        }
        return previous
      },
      onError: rollback,
      onSettled: settle,
    }),
    remove: useMutation<Cart, ClientError, string, Cart | undefined>({
      mutationFn: (itemId: string) => api.removeCartItem(itemId),
      onMutate: async (itemId) => {
        const previous = await snapshot()
        if (previous) {
          const items = previous.items.filter((item) => item.id !== itemId)
          client.setQueryData<Cart>(key, { ...previous, items, itemCount: items.reduce((sum, item) => sum + item.quantity, 0) })
        }
        return previous
      },
      onError: rollback,
      onSettled: settle,
    }),
    applyCoupon: useMutation({
      mutationFn: (code: string) => api.applyCoupon(code),
      onSuccess: (cart) => client.setQueryData(key, cart),
      onSettled: settle,
    }),
    removeCoupon: useMutation({
      mutationFn: () => api.removeCoupon(),
      onSuccess: (cart) => client.setQueryData(key, cart),
      onSettled: settle,
    }),
  }
}

/**
 * Loads the favorite ids of the signed in user.
 */
export function useFavorites() {
  const { user } = useAuth()
  return useQuery({
    queryKey: keys.favorites(user?.id ?? 'none'),
    queryFn: ({ signal }) => api.favorites(signal),
    enabled: Boolean(user),
  })
}

/**
 * Toggles a favorite with an optimistic update that rolls back when the server rejects it.
 */
export function useToggleFavorite() {
  const client = useQueryClient()
  const { user } = useAuth()
  const key = keys.favorites(user?.id ?? 'none')
  return useMutation({
    mutationFn: ({ nftId, active }: { nftId: string; active: boolean }) => (active ? api.removeFavorite(nftId) : api.addFavorite(nftId)),
    onMutate: async ({ nftId, active }) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<{ nftIds: string[] }>(key)
      const ids = previous?.nftIds ?? []
      client.setQueryData(key, { nftIds: active ? ids.filter((id) => id !== nftId) : [...ids, nftId] })
      return previous
    },
    onError: (_error, _vars, previous) => {
      if (previous) client.setQueryData(key, previous)
      else client.resetQueries({ queryKey: key, exact: true })
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  })
}

/**
 * Loads primary and secondary wallets.
 */
export function useWallets() {
  const { user } = useAuth()
  return useQuery({ queryKey: keys.wallets(user?.id ?? 'none'), queryFn: ({ signal }) => api.wallets(signal), enabled: Boolean(user) })
}

/**
 * Saves a wallet slot and refreshes the wallet list.
 */
export function useSaveWallet() {
  const client = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: ({ slot, wallet }: { slot: 'primary' | 'secondary'; wallet: Wallet }) => api.saveWallet(slot, wallet),
    onSuccess: (wallets) => client.setQueryData(keys.wallets(user?.id ?? 'none'), wallets),
  })
}

/**
 * Loads the simulated wallet connection state for checkout.
 */
export function useWalletConnection() {
  const { user } = useAuth()
  return useQuery({ queryKey: keys.connection(user?.id ?? 'none'), queryFn: ({ signal }) => api.walletConnection(signal), enabled: Boolean(user), staleTime: 60_000 })
}

/**
 * Loads one order and polls it while it is pending so a missed socket event still converges.
 * @param id order id
 */
export function useOrder(id: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: keys.order(user?.id ?? 'none', id),
    queryFn: ({ signal }) => api.order(id, signal),
    enabled: Boolean(user),
    staleTime: 0,
    refetchInterval: (query) => ((query.state.data as Order | undefined)?.status === 'pending' ? 2500 : false),
  })
}
