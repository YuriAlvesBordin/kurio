import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Icon } from '@/components/Icon'
import { useAuth } from '@/features/auth/authStore'
import { useOpenAuth } from '@/features/auth/useOpenAuth'
import { useCart } from '@/hooks/queries'

/**
 * Bottom tab bar shown on small screens with home, favorites, scan, cart and account.
 * @param props the active tab id
 */
export function MobileNav({ active }: { active: 'home' | 'favorites' | 'cart' | 'account' | null }) {
  const { user } = useAuth()
  const cart = useCart()
  const navigate = useNavigate()
  const openAuth = useOpenAuth()
  const count = cart.data?.itemCount ?? 0
  const tab = (isActive: boolean) => `flex h-12 w-12 items-center justify-center ${isActive ? 'text-accent' : 'text-muted'}`

  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div className="relative mx-auto flex h-24 max-w-[480px] items-start justify-between rounded-t-[40px] bg-card px-[22px] pt-[28px]">
        <Link to="/" aria-label="Início" aria-current={active === 'home' ? 'page' : undefined} className={tab(active === 'home')}>
          <Icon name="home" size={24} />
        </Link>
        <button
          type="button"
          aria-label="Favoritos"
          className={tab(active === 'favorites')}
          onClick={() => (user ? toast.info('Em breve') : openAuth('login'))}
        >
          <Icon name="heart" size={24} />
        </button>
        <button
          type="button"
          aria-label="Escanear"
          onClick={() => toast.info('Em breve')}
          className="absolute left-1/2 top-[-29px] ring-[10px] ring-ink flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-ink"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
            <path d="M8 12h8" />
          </svg>
        </button>
        <span className="w-12" aria-hidden="true" />
        <Link to="/carrinho" aria-label={`Carrinho, ${count} itens`} aria-current={active === 'cart' ? 'page' : undefined} className={`relative ${tab(active === 'cart')}`}>
          <Icon name="cart" size={20} />
          {count > 0 ? <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center bg-primary px-1 text-[10px] font-bold text-ink">{count}</span> : null}
        </Link>
        <button
          type="button"
          aria-label={user ? 'Perfil' : 'Entrar'}
          className={tab(active === 'account')}
          onClick={() => (user ? void navigate({ to: '/perfil' }) : openAuth('login'))}
        >
          <Icon name="user-filled" size={24} />
        </button>
      </div>
    </nav>
  )
}
