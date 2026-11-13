import { Outlet, createRootRoute, createRoute, createRouter, lazyRouteComponent, redirect, useRouter, useSearch } from '@tanstack/react-router'
import { lazy, Suspense, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Shell } from '@/components/layout/Shell'
import { Toaster } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'
import { authStore } from '@/features/auth/authStore'
import { HomePage } from '@/features/catalog/HomePage'
import { RealtimeProvider } from '@/realtime/RealtimeProvider'
import { RequireAuth } from './RequireAuth'
import { validateAuthSearch, validateCatalogSearch, withoutAuthParams } from './search'

/**
 * Root layout: realtime lifecycle, global modal, toasts and session expiry reaction.
 */
function RootLayout() {
  const router = useRouter()
  const authOpen = Boolean((useSearch({ strict: false }) as { auth?: string }).auth)

  useEffect(() => {
    void authStore.bootstrap()
    authStore.onRejected((reason) => {
      const location = router.state.location
      const next = withoutAuthParams(location.pathname, location.searchStr)
      void router.navigate({
        to: location.pathname,
        search: { ...(location.search as Record<string, unknown>), auth: 'login', reason: reason === 'expired' ? 'expired' : undefined, redirect: next === '/' ? undefined : next },
        replace: true,
      } as never)
    })
    return () => authStore.onRejected(null)
  }, [router])

  return (
    <>
      <RealtimeProvider />
      <Outlet />
      {authOpen ? (
        <Suspense fallback={null}>
          <AuthDialog />
        </Suspense>
      ) : null}
      <Toaster />
    </>
  )
}

/**
 * Friendly page for unknown URLs.
 */
function NotFound() {
  return (
    <Shell>
      <div className="page-container flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-fg-strong">Página não encontrada</h1>
        <p className="text-sm text-muted">O endereço que você abriu não existe.</p>
        <Button asChild>
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    </Shell>
  )
}

const AuthDialog = lazy(() => import('@/features/auth/AuthDialog').then((module) => ({ default: module.AuthDialog })))
const ProfilePage = lazyRouteComponent(() => import('@/features/account/ProfilePage'), 'ProfilePage')
const WalletsPage = lazyRouteComponent(() => import('@/features/account/WalletsPage'), 'WalletsPage')
const CartPage = lazyRouteComponent(() => import('@/features/cart/CartPage'), 'CartPage')
const CheckoutPage = lazyRouteComponent(() => import('@/features/checkout/CheckoutPage'), 'CheckoutPage')
const OrderPage = lazyRouteComponent(() => import('@/features/checkout/OrderPage'), 'OrderPage')
const DetailPage = lazyRouteComponent(() => import('@/features/detail/DetailPage'), 'DetailPage')

const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: NotFound, validateSearch: validateAuthSearch })

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage, validateSearch: validateCatalogSearch })
const detailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/nft/$id', component: DetailPage })
const cartRoute = createRoute({ getParentRoute: () => rootRoute, path: '/carrinho', component: CartPage })

/**
 * Redirects guests before the route renders so private pages never flash.
 * @param location target location
 */
function guard(location: { pathname: string; searchStr: string; search: Record<string, unknown> }) {
  const state = authStore.get()
  if (state.status === 'guest' && state.notice !== 'expired' && !location.search.auth) {
    throw redirect({ to: '/', search: { auth: 'login', redirect: `${location.pathname}${location.searchStr}` } as never })
  }
}

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pagamento',
  beforeLoad: ({ location }) => guard(location as never),
  component: () => (
    <RequireAuth>
      <CheckoutPage />
    </RequireAuth>
  ),
})
const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pedido/$orderId',
  beforeLoad: ({ location }) => guard(location as never),
  component: () => (
    <RequireAuth>
      <OrderPage />
    </RequireAuth>
  ),
})
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/perfil',
  beforeLoad: ({ location }) => guard(location as never),
  component: () => (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
})
const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/perfil/carteiras',
  beforeLoad: ({ location }) => guard(location as never),
  component: () => (
    <RequireAuth>
      <WalletsPage />
    </RequireAuth>
  ),
})

const routeTree = rootRoute.addChildren([indexRoute, detailRoute, cartRoute, checkoutRoute, orderRoute, profileRoute, walletsRoute])

export const router = createRouter({ routeTree, defaultPreload: 'intent', scrollRestoration: true })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
