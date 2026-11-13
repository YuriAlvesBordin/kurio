import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from '@/lib/toast'
import { useAuth } from '@/features/auth/authStore'
import { useOpenAuth } from '@/features/auth/useOpenAuth'
import { useCart } from '@/hooks/queries'

const ICONS = '/assets/icons'

/**
 * Scan glyph from the design: a horizontal bar and four corner brackets laid out on a 26.82 by 24 grid.
 */
function ScanIcon() {
  const part = (file: string, left: number, top: number, width: number, height: number) => (
    <img src={`${ICONS}/${file}.svg`} alt="" width={width} height={height} className="absolute max-w-none" style={{ left, top, width, height }} draggable={false} />
  )
  return (
    <span aria-hidden="true" className="absolute left-[calc(50%-13.41px)] top-[21px] block h-6 w-[26.82px]">
      {part('tabbar-scan-line', 0, 11.1, 26.82, 1.79)}
      {part('tabbar-scan-bl', 1.3, 13.7, 10.35, 10.31)}
      {part('tabbar-scan-tr', 15.1, 0.08, 10.39, 10.3)}
      {part('tabbar-scan-br', 15.1, 13.7, 10.32, 10.25)}
      {part('tabbar-scan-tl', 1.3, 0, 10.39, 10.31)}
    </span>
  )
}

/**
 * Bottom tab bar shown on small screens with home, favorites, scan, cart and account, following the 414 by 126 design frame.
 * @param props the active tab id
 */
export function MobileNav({ active }: { active: 'home' | 'favorites' | 'cart' | 'account' | null }) {
  const { user } = useAuth()
  const cart = useCart()
  const navigate = useNavigate()
  const openAuth = useOpenAuth()
  const count = cart.data?.itemCount ?? 0
  const slot = 'pointer-events-auto absolute top-[59px] flex h-11 w-11 -translate-x-1/2 items-center justify-center'

  return (
    <nav aria-label="Navegação principal" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div className="relative mx-auto h-[126px] max-w-[414px]">
        <div aria-hidden="true" className="absolute inset-[24.6%_0_0.04%_0]">
          <img src={`${ICONS}/tabbar-bar.svg`} alt="" className="absolute inset-[-42.13%_-7.25%_-21.06%_-7.25%] block h-[184.5%] w-[114.5%] max-w-none" draggable={false} />
        </div>
        <Link to="/" aria-label="Início" aria-current={active === 'home' ? 'page' : undefined} className={`${slot} left-[11.1%]`}>
          <img src={`${ICONS}/home.svg`} alt="" width={20} height={20} draggable={false} />
        </Link>
        <button
          type="button"
          aria-label="Favoritos"
          className={`${slot} left-[28.5%]`}
          onClick={() => (user ? toast.info('Em breve') : openAuth('login'))}
        >
          <img src={`${ICONS}/tabbar-heart.svg`} alt="" width={20} height={17.8} draggable={false} />
        </button>
        <button
          type="button"
          aria-label="Escanear"
          onClick={() => toast.info('Em breve')}
          className="pointer-events-auto absolute left-1/2 top-0 size-[65px] -translate-x-1/2 rounded-full"
        >
          <img src={`${ICONS}/tabbar-circle.svg`} alt="" width={65} height={65} className="absolute inset-0 block" draggable={false} />
          <ScanIcon />
        </button>
        <Link to="/carrinho" aria-label={`Carrinho, ${count} itens`} aria-current={active === 'cart' ? 'page' : undefined} className={`${slot} left-[72.9%]`}>
          <img src={`${ICONS}/tabbar-shop.svg`} alt="" width={20} height={20} draggable={false} />
          {count > 0 ? <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center bg-primary px-1 text-[10px] font-bold text-ink">{count}</span> : null}
        </Link>
        <button
          type="button"
          aria-label={user ? 'Perfil' : 'Entrar'}
          className={`${slot} left-[87.9%]`}
          onClick={() => (user ? void navigate({ to: '/perfil' }) : openAuth('login'))}
        >
          <img src={`${ICONS}/user-filled.svg`} alt="" width={20} height={20} draggable={false} />
        </button>
      </div>
    </nav>
  )
}
