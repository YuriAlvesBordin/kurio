import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from '@/lib/toast'
import type { CartItem } from '@/api/contracts'
import { Icon } from '@/components/Icon'
import { BackHeader } from '@/components/layout/BackHeader'
import { Shell } from '@/components/layout/Shell'
import { RelatedRow, useRelatedItems } from '@/components/nft/RelatedRow'
import { NftImage } from '@/components/nft/NftImage'
import { QuantityStepper } from '@/components/QuantityStepper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/authStore'
import { useOpenAuth } from '@/features/auth/useOpenAuth'
import { useCart, useCartMutations, useQuote } from '@/hooks/queries'
import { formatEthLabel } from '@/lib/eth'
import { formatTokenId } from '@/lib/format'
import { SummaryRows } from './Summary'

/**
 * Cart screen with line editing, coupon handling and the order summary.
 */
export function CartPage() {
  const cart = useCart()
  const quote = useQuote()
  const mutations = useCartMutations()
  const { user } = useAuth()
  const navigate = useNavigate()
  const openAuth = useOpenAuth()
  const [code, setCode] = useState('')
  const [couponError, setCouponError] = useState<string | null>(null)
  const items = cart.data?.items ?? []
  const blocked = items.some((item) => item.state === 'sold_out' || item.state === 'insufficient')

  /**
   * Applies the typed coupon and shows the server reason when it is invalid or expired.
   */
  const applyCoupon = () => {
    setCouponError(null)
    mutations.applyCoupon.mutate(code, {
      onSuccess: () => {
        setCode('')
        toast.success('Cupom aplicado')
      },
      onError: (error) => setCouponError(error.message),
    })
  }

  /**
   * Continues to checkout, asking the guest to sign in first and resuming at the payment page afterwards.
   */
  const checkout = () => {
    if (!user) {
      void navigate({ to: '/', search: { auth: 'login', redirect: '/pagamento' } as never })
      return
    }
    void navigate({ to: '/pagamento' })
  }

  return (
    <Shell active="Mercado" tab="cart" hideMobileNav>
      <BackHeader title="Carrinho de NFTs" centered />
      <div className="page-container pb-[380px] md:pb-8 max-md:!px-7">
        <nav aria-label="Trilha" className="hidden pt-8 text-[15px] font-bold leading-4 text-fg-strong md:block">
          <Link to="/">Início</Link> / <span>Mercado</span> / <span>Carrinho</span>
        </nav>
        <div className="mt-0 grid gap-10 md:mt-4 lg:mt-3 lg:grid-cols-[minmax(0,1fr)_332px] lg:gap-x-[86px]">
          <section aria-labelledby="cart-title">
            <h1 id="cart-title" className="sr-only">
              Carrinho de NFTs
            </h1>
            <div className="hidden grid-cols-[311fr_138fr_136fr_148fr_24px] border-b border-[#4d321e] pb-[11px] pr-6 text-base font-bold leading-4 text-fg-strong lg:grid">
              <span>NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
              <span className="sr-only">Remover</span>
            </div>
            {cart.isPending ? (
              <div className="mt-3 flex flex-col gap-3" aria-busy="true" aria-label="Carregando carrinho">
                {[0, 1, 2].map((item) => (
                  <Skeleton key={item} className="h-[70px] w-full" />
                ))}
              </div>
            ) : cart.isError ? (
              <div role="alert" className="mt-6 flex flex-col items-start gap-3 bg-card p-6">
                <p>Não foi possível carregar o carrinho.</p>
                <Button onClick={() => void cart.refetch()}>Tentar novamente</Button>
              </div>
            ) : items.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-4 bg-card p-12 text-center" data-testid="empty-cart">
                <p className="text-lg font-bold text-fg-strong">Seu carrinho está vazio</p>
                <p className="text-sm text-muted">Explore o catálogo e adicione NFTs para continuar.</p>
                <Button asChild>
                  <Link to="/">Explorar NFTs</Link>
                </Button>
              </div>
            ) : (
              <ul className="mt-0 flex flex-col gap-5 lg:mt-3 lg:gap-3">
                {items.map((item) => (
                  <CartRow
                    key={item.id}
                    item={item}
                    pending={mutations.setQuantity.isPending || mutations.remove.isPending}
                    onQuantity={(quantity) =>
                      mutations.setQuantity.mutate({ itemId: item.id, quantity }, { onError: (error) => toast.error(error.message) })
                    }
                    onRemove={() => mutations.remove.mutate(item.id, { onError: (error) => toast.error(error.message) })}
                  />
                ))}
              </ul>
            )}
          </section>

          <aside aria-labelledby="summary-title" className="flex flex-col max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:max-h-[85vh] max-md:overflow-y-auto max-lg:mx-auto max-lg:max-w-[480px] max-lg:rounded-t-[40px] md:max-lg:mt-8 md:max-lg:w-full max-lg:bg-card max-lg:px-6 max-lg:pb-9 max-lg:pt-6">
            <h2 id="summary-title" className="max-lg:sr-only border-b border-[#4d321e] pb-[11px] text-lg font-bold leading-4 text-fg-strong">
              Resumo da carteira
            </h2>
            <div className="mt-6 max-lg:mt-0">
              <label htmlFor="coupon" className="mb-2 block max-lg:sr-only text-sm font-bold leading-4 text-fg-strong">
                Código promocional
              </label>
              {cart.data?.couponCode ? (
                <div className="flex items-center justify-between border border-primary bg-raised px-3 py-2 text-sm">
                  <span data-testid="applied-coupon">{cart.data.couponCode} aplicado</span>
                  <button type="button" className="text-xs text-accent underline" onClick={() => mutations.removeCoupon.mutate()}>
                    Remover
                  </button>
                </div>
              ) : (
                <form
                  className="flex max-lg:h-[50px] max-lg:overflow-hidden max-lg:rounded-full max-lg:border max-lg:border-line max-lg:bg-ink/60"
                  onSubmit={(event) => {
                    event.preventDefault()
                    applyCoupon()
                  }}
                >
                  <Input id="coupon" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Digite o código promocional..." aria-invalid={Boolean(couponError)} aria-describedby={couponError ? 'coupon-error' : undefined} className="h-10 flex-1 border-primary bg-ink px-2 text-xs max-lg:h-full max-lg:border-0 max-lg:bg-transparent max-lg:px-4" />
                  <Button type="submit" size="md" className="w-[102px] px-0 font-bold max-lg:h-full max-lg:w-[97px] max-lg:rounded-full max-lg:bg-gradient-to-r max-lg:from-[#a36b3b] max-lg:to-primary" disabled={mutations.applyCoupon.isPending || !items.length}>
                    Aplicar
                  </Button>
                </form>
              )}
              {couponError ? (
                <p id="coupon-error" role="alert" className="mt-2 text-xs text-danger">
                  {couponError}
                </p>
              ) : null}
            </div>
            <div className="mt-6 max-lg:mt-4"><SummaryRows quote={items.length ? quote.data : undefined} loading={Boolean(items.length) && quote.isPending} /></div>
            {quote.isError && items.length ? (
              <p role="alert" className="text-xs text-danger">
                Não foi possível calcular o resumo. <button type="button" className="underline" onClick={() => void quote.refetch()}>Tentar novamente</button>
              </p>
            ) : null}
            {blocked ? (
              <p role="alert" className="text-xs text-danger">
                Remova ou ajuste os itens sem estoque para continuar.
              </p>
            ) : null}
            <Button size="md" disabled={!items.length || blocked || quote.isPending} onClick={checkout} className="mt-6 w-full px-0 text-[15px] font-bold normal-case max-lg:mt-8 max-lg:h-[60px] max-lg:rounded-full max-lg:bg-gradient-to-r max-lg:from-[#c98a52] max-lg:to-primary max-lg:text-base">
              {user ? 'Conectar e finalizar' : 'Entrar e finalizar'}
            </Button>
            <Link to="/" className="mt-3 text-center text-[15px] leading-5 text-primary max-lg:hidden">
              Continuar explorando
            </Link>
            {!user ? (
              <button type="button" onClick={() => openAuth('login')} className="text-center text-xs text-muted underline">
                Já tenho conta
              </button>
            ) : null}
          </aside>
        </div>
        <div className="max-md:hidden"><Suggestions /></div>
      </div>
    </Shell>
  )
}

/**
 * One cart line with artwork, price, quantity stepper, total and remove action.
 * @param props the item and its handlers
 */
function CartRow({ item, onQuantity, onRemove, pending }: { item: CartItem; onQuantity: (quantity: number) => void; onRemove: () => void; pending: boolean }) {
  const problem = item.state === 'sold_out' ? 'Esgotado' : item.state === 'insufficient' ? `Apenas ${item.maxQuantity} disponíveis` : null
  const title = item.name
  return (
    <li data-testid="cart-row" className="relative flex h-[100px] items-stretch rounded-xl bg-card lg:grid lg:h-[70px] lg:grid-cols-[311fr_138fr_136fr_148fr_24px] lg:items-center lg:gap-0 lg:rounded-none lg:pr-6">
      <Link to="/nft/$id" params={{ id: item.nftId }} className="flex shrink-0 items-center gap-4 lg:col-span-1">
        <NftImage artwork={item.image} alt="" size={320} className="h-[100px] w-[100px] rounded-l-xl lg:h-[70px] lg:w-[70px] lg:rounded-md" />
        <span className="hidden lg:block">
          <span className="block text-base font-bold leading-4 text-fg-strong">{title}</span>
          <span className="mt-1.5 block text-sm leading-4 text-subtle">ID do token: {formatTokenId(item.tokenId)}</span>
        </span>
      </Link>
      <div className="relative min-w-0 flex-1 px-[9px] pt-[14px] lg:hidden">
        <p className="truncate text-sm font-bold leading-5 text-fg-strong">{title}</p>
        <p className="text-[13px] leading-5 text-subtle">Edição: {item.editionLabel}</p>
        <p className="absolute bottom-[14px] left-[9px] text-lg font-bold leading-5 text-accent">{formatEthLabel(item.lineTotalEth)}</p>
        <div className="absolute bottom-[36px] right-5">
          <QuantityStepper variant="round" value={item.quantity} max={Math.max(item.maxQuantity, item.quantity)} onChange={onQuantity} label={title} disabled={pending} />
        </div>
      </div>
      <p className="hidden text-base font-bold leading-4 text-muted lg:block">{formatEthLabel(item.unitPriceEth)}</p>
      <div className="hidden lg:block">
        <QuantityStepper variant="pill" value={item.quantity} max={Math.max(item.maxQuantity, item.quantity)} onChange={onQuantity} label={title} disabled={pending} />
        {problem ? <p role="alert" className="mt-1 text-[11px] text-danger">{problem}</p> : null}
      </div>
      <p className="hidden text-base font-bold leading-4 text-accent lg:block" data-testid="line-total">
        {formatEthLabel(item.lineTotalEth)}
      </p>
      <button type="button" aria-label={`Remover ${title} do carrinho`} onClick={onRemove} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center lg:static lg:h-6 lg:w-6 lg:justify-self-end">
        <Icon name="delete" size={20} />
      </button>
      {problem ? <p role="alert" className="absolute inset-x-[109px] bottom-1 text-[11px] text-danger lg:hidden">{problem}</p> : null}
    </li>
  )
}

/**
 * Suggested NFTs shown below the cart.
 */
function Suggestions() {
  const { items, pending } = useRelatedItems(undefined, 3)
  return <RelatedRow id="suggest-title" title="Colecionadores também viram" items={items} pending={pending} spacing="cart" className="mt-24" />
}
