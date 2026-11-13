import { formatEth } from '@/lib/eth'
import type { Quote } from '@/api/contracts'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Subtotal, discount, network fee and total rows shared by the cart and checkout.
 * @param props quote or undefined while loading and the layout variant
 */
export function SummaryRows({ quote, loading, variant = 'cart' }: { quote: Quote | undefined; loading: boolean; variant?: 'cart' | 'checkout' }) {
  if (loading || !quote) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando resumo">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-7 w-full" />
      </div>
    )
  }
  return (
    <dl className="flex flex-col text-sm leading-5 lg:text-[15px]">
      <div className="flex items-center justify-between">
        <dt>Subtotal</dt>
        <dd data-testid="subtotal" className="text-[15px] leading-4 lg:text-lg">
          {formatEth(quote.subtotalEth)} ETH
        </dd>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <dt>{quote.couponCode ? `Desconto (${quote.couponCode})` : 'Desconto do lançamento'}</dt>
        <dd data-testid="discount">(-) {formatEth(quote.discountEth)}</dd>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <dt>Taxa de rede</dt>
        <dd data-testid="fee" className="text-[15px] leading-4 lg:text-lg">
          {formatEth(quote.networkFeeEth)} ETH
        </dd>
      </div>
      <p className={cn('mt-0 text-xs leading-4 text-primary lg:mt-3', variant === 'checkout' ? 'text-center' : 'text-right')}>Taxa estimada</p>
      <div className={cn('flex items-center justify-between text-[15px] font-bold leading-4 lg:text-base', variant === 'checkout' ? 'mt-[11px] border-t border-rule px-[42px] pt-3' : 'mt-3 lg:mt-6')}>
        <dt>Total</dt>
        <dd data-testid="total" className="text-[17px] leading-4 text-accent lg:text-lg">
          {formatEth(quote.totalEth)} ETH
        </dd>
      </div>
    </dl>
  )
}
