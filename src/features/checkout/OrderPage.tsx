import { useEffect } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import { keys } from '@/api/keys'
import { ClientError } from '@/api/errors'
import { Icon } from '@/components/Icon'
import { BackHeader } from '@/components/layout/BackHeader'
import { Shell } from '@/components/layout/Shell'
import { NftImage } from '@/components/nft/NftImage'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/authStore'
import { useOrder } from '@/hooks/queries'
import { formatEth, formatEthLabel } from '@/lib/eth'
import { formatReceiptDate, formatTokenId, shortHash } from '@/lib/format'
import { networkLabels, providerLabels } from '@/lib/labels'
import { clearDraft } from './draft'

/**
 * Order screen. Pending orders show progress, confirmed orders show the immutable receipt
 * and rejected orders explain the failure while the cart stays intact.
 */
export function OrderPage() {
  const { orderId } = useParams({ from: '/pedido/$orderId' })
  const { user } = useAuth()
  const navigate = useNavigate()
  const query = useOrder(orderId)
  const order = query.data

  const client = useQueryClient()
  useEffect(() => {
    if (order?.status === 'confirmed' && user) clearDraft(user.id)
    if (order && order.status !== 'pending') void client.invalidateQueries({ queryKey: keys.cartRoot })
  }, [order, user, client])

  return (
    <Shell tab="cart" active="Mercado" hideFooter>
      <BackHeader title="Pedido" />
      <div className="page-container flex min-h-[70dvh] items-start justify-center py-10 md:pb-16 md:pt-24">
        {query.isPending ? (
          <div className="w-full max-w-[578px] bg-card p-8" aria-busy="true" aria-label="Carregando pedido">
            <Skeleton className="mx-auto h-20 w-20" />
            <Skeleton className="mt-6 h-6 w-full" />
            <Skeleton className="mt-4 h-40 w-full" />
          </div>
        ) : query.isError ? (
          <div role="alert" className="flex w-full max-w-[578px] flex-col items-center gap-4 bg-card p-10 text-center">
            <h1 className="text-lg font-bold text-fg-strong">{query.error instanceof ClientError && query.error.status === 404 ? 'Pedido não encontrado' : 'Não foi possível carregar o pedido'}</h1>
            <p className="text-sm text-muted">{query.error.message}</p>
            <div className="flex gap-3">
              {query.error instanceof ClientError && query.error.status === 404 ? null : <Button onClick={() => void query.refetch()}>Tentar novamente</Button>}
              <Button asChild variant="outline">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </div>
          </div>
        ) : order?.status === 'pending' ? (
          <div role="status" aria-live="polite" data-testid="order-pending" className="flex w-full max-w-[578px] flex-col items-center gap-4 bg-card p-10 text-center">
            <Skeleton className="h-2 w-48" />
            <h1 className="text-lg font-bold text-fg-strong">Processando seu pagamento</h1>
            <p className="text-sm text-muted">Pedido {order.id}. Aguarde a confirmação da rede. Você pode recarregar a página, o pedido continua sendo acompanhado.</p>
          </div>
        ) : order?.status === 'rejected' ? (
          <div role="alert" data-testid="order-rejected" className="flex w-full max-w-[578px] flex-col items-center gap-4 bg-card p-10 text-center">
            <Icon name="danger" size={48} />
            <h1 className="text-lg font-bold text-fg-strong">Pagamento recusado</h1>
            <p className="text-sm text-muted">{order.rejectionReason ?? 'O pagamento não foi concluído.'}</p>
            <p className="text-xs text-muted">Seus itens continuam no carrinho e nenhum valor foi cobrado.</p>
            <div className="flex gap-3">
              <Button onClick={() => void navigate({ to: '/pagamento' })}>Tentar novamente</Button>
              <Button asChild variant="outline">
                <Link to="/carrinho">Voltar ao carrinho</Link>
              </Button>
            </div>
          </div>
        ) : order ? (
          <article data-testid="order-confirmed" aria-labelledby="receipt-title" className="relative w-full max-w-[578px] bg-card">
            <Link to="/" aria-label="Fechar" className="absolute right-[18px] top-[18px] flex h-4 w-4 items-center justify-center">
              <span aria-hidden="true" className="absolute h-px w-[18px] rotate-45 bg-primary" />
              <span aria-hidden="true" className="absolute h-px w-[18px] -rotate-45 bg-primary" />
            </Link>
            <div className="flex flex-col items-center border-b border-primary px-6 pb-[19px] pt-5">
              <Icon name="thank-you" size={82} />
              <h1 id="receipt-title" className="mt-[16px] text-center text-[17px] font-bold leading-5 text-muted">
                Seus NFTs agora estão na sua carteira
              </h1>
            </div>
            <dl className="grid grid-cols-2 gap-y-3 border-b border-primary px-9 py-4 text-sm leading-4 md:h-[66px] md:grid-cols-[145px_144px_126px_1fr] md:gap-y-0 md:py-4">
              <div className="md:pt-px">
                <dt className="font-bold text-muted">ID da transação</dt>
                <dd className="mt-0.5 text-subtle">{order.txHash ? shortHash(order.txHash) : order.id}</dd>
              </div>
              <div className="md:h-[34px] md:border-l md:border-primary md:pl-[17px]">
                <dt className="text-muted">Data</dt>
                <dd className="mt-0.5 text-subtle">{formatReceiptDate(order.updatedAt)}</dd>
              </div>
              <div className="md:h-[34px] md:border-l md:border-primary md:pl-[17px]">
                <dt className="text-muted">Total</dt>
                <dd className="mt-0.5 text-subtle">{formatEthLabel(order.snapshot.totalEth)}</dd>
              </div>
              <div className="md:h-[34px] md:border-l md:border-primary md:pl-[17px]">
                <dt className="font-bold text-muted">Carteira</dt>
                <dd className="mt-0.5 text-subtle">{providerLabels[order.wallet.provider]}</dd>
              </div>
            </dl>
            <div className="px-6 pb-4 pt-5 md:px-11">
              <h2 className="text-[15px] font-bold leading-5 text-fg-strong">Detalhes da transação</h2>
              <div className="mt-[9px] grid grid-cols-[1fr_auto] border-b border-rule pb-[10px] text-base font-bold leading-4 text-fg-strong md:grid-cols-[1fr_90px_115px]">
                <span>NFTs</span>
                <span className="hidden text-center md:block">Edições</span>
                <span className="text-right">Subtotal</span>
              </div>
              <ul className="mt-[12px] flex flex-col gap-3">
                {order.snapshot.items.map((item) => (
                  <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 md:h-[70px] md:grid-cols-[1fr_90px_115px] md:gap-x-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <NftImage artwork={item.image} alt="" size={320} className="h-[70px] w-[70px] shrink-0 rounded-lg" />
                      <div className="min-w-0">
                        <p className="text-base font-bold leading-4 text-fg-strong">{item.name}</p>
                        <p className="mt-1.5 text-sm leading-4 text-subtle">ID do token: {formatTokenId(item.tokenId)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 md:contents">
                      <span className="text-sm text-muted md:text-center">(x {item.quantity})</span>
                      <span className="whitespace-nowrap text-lg font-bold text-accent md:text-right">{formatEth(item.lineTotalEth)} ETH</span>
                    </div>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 flex flex-col gap-2.5 border-b border-rule pb-[9px] text-[15px] leading-5 md:pl-[169px]">
                {order.snapshot.discountEth !== '0' ? (
                  <div className="flex justify-between">
                    <dt>Desconto</dt>
                    <dd>(-) {formatEth(order.snapshot.discountEth)} ETH</dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <dt>Taxa de rede</dt>
                  <dd className="text-lg leading-4">{formatEth(order.snapshot.networkFeeEth)} ETH</dd>
                </div>
                <div className="flex items-center justify-between font-bold">
                  <dt>Total</dt>
                  <dd className="text-lg leading-4 text-accent">{formatEth(order.snapshot.totalEth)} ETH</dd>
                </div>
              </dl>
              <p className="mx-auto mt-3 max-w-[430px] text-center text-sm leading-[22px] text-muted">
                Transação confirmada na {networkLabels[order.wallet.network]}. A propriedade foi transferida para sua carteira conectada e registrada na rede.
              </p>
              <div className="mt-5 flex flex-col items-center">
                <Button size="lg" className="font-bold" onClick={() => toast.info('Transação simulada, sem registro em explorador público')}>
                  Ver no Etherscan
                </Button>
                <Link to="/" className="mt-3 text-sm leading-5 text-primary">
                  Continuar explorando
                </Link>
              </div>
            </div>
            <div className="h-2.5 bg-primary" />
          </article>
        ) : null}
      </div>
    </Shell>
  )
}
