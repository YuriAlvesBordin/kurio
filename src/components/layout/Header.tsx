import { useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/authStore'
import { useCart } from '@/hooks/queries'
import { useOpenAuth } from '@/features/auth/useOpenAuth'

const NAV = [
  { label: 'Início', to: '/', hash: undefined },
  { label: 'Mercado', to: '/', hash: 'catalogo' },
  { label: 'Criadores', to: '/', hash: 'criadores' },
  { label: 'Aprenda', to: '/', hash: 'diario' },
] as const

/**
 * Desktop and tablet top bar with navigation, search, cart and account entry.
 * @param props optional section override, otherwise the active link follows the URL hash
 */
export function Header({ active }: { active?: string }) {
  const hash = useRouterState({ select: (state) => state.location.hash })
  const current = active ?? NAV.find((item) => item.hash && item.hash === hash.replace(/^#/, ''))?.label ?? 'Início'
  const { user } = useAuth()
  const cart = useCart()
  const navigate = useNavigate()
  const openAuth = useOpenAuth()
  const [searching, setSearching] = useState(false)
  const [text, setText] = useState('')
  const count = cart.data?.itemCount ?? 0

  return (
    <header className="hidden md:block">
      <div className="page-container pt-6">
        <div className="grid h-[45px] grid-cols-[auto_1fr_auto] items-start border-b border-[#4d321e] lg:grid-cols-[376px_1fr_auto]">
          <Link to="/" className="flex h-[35px] items-center text-base font-bold text-fg-strong" aria-label="Kurio, página inicial">
            KURIO
          </Link>
          <nav aria-label="Principal" className="flex items-start justify-center gap-10 lg:justify-start">
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.hash ? `/#${item.hash}` : '/'}
                aria-current={current === item.label ? 'page' : undefined}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
                  event.preventDefault()
                  void navigate({ to: '/', hash: item.hash })
                }}
                className={`-mb-px flex h-[45px] items-start border-b-[3px] text-base leading-6 tracking-[0.01em] ${current === item.label ? 'border-primary font-bold text-accent' : 'border-transparent text-fg hover:text-accent'}`}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex h-[35px] items-center gap-[26px]">
            {searching ? (
              <form
                role="search"
                onSubmit={(event) => {
                  event.preventDefault()
                  void navigate({ to: '/', search: { q: text.trim() || undefined } })
                  setSearching(false)
                }}
              >
                <input
                  autoFocus
                  aria-label="Buscar NFTs"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onBlur={() => setSearching(false)}
                  placeholder="Buscar NFTs"
                  className="h-9 w-48 border border-line-soft bg-card px-3 text-sm"
                />
              </form>
            ) : (
              <button type="button" aria-label="Buscar" onClick={() => setSearching(true)} className="flex h-6 w-6 items-center justify-center">
                <Icon name="search" size={22} />
              </button>
            )}
            <Link to="/carrinho" aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`} className="relative flex h-6 w-6 items-center justify-center">
              <Icon name="cart" size={24} />
              {count > 0 ? (
                <span data-testid="cart-count" className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-ink">
                  {count}
                </span>
              ) : null}
            </Link>
            {user ? (
              <Button asChild size="header">
                <Link to="/perfil">
                  <Icon name="user" size={20} className="brightness-0" />
                  {user.displayName.split(' ')[0]}
                </Link>
              </Button>
            ) : (
              <Button size="header" onClick={() => openAuth('login')}>
                <Icon name="login" size={20} />
                Entrar
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
