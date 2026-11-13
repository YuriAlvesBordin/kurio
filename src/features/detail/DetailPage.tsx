import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useRouter } from '@tanstack/react-router'
import { toast } from '@/lib/toast'
import type { EditionId, NftDetail } from '@/api/contracts'
import { ClientError } from '@/api/errors'
import { Icon } from '@/components/Icon'
import { Shell } from '@/components/layout/Shell'
import { NftImage } from '@/components/nft/NftImage'
import { RelatedRow } from '@/components/nft/RelatedRow'
import { QuantityStepper } from '@/components/QuantityStepper'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/authStore'
import { useOpenAuth } from '@/features/auth/useOpenAuth'
import { useCart, useCartMutations, useCatalog, useFavorites, useNft, useToggleFavorite } from '@/hooks/queries'
import { formatEthLabel } from '@/lib/eth'
import { networkLabels } from '@/lib/labels'
import { formatTokenId } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Detail screen for one NFT: gallery, edition, quantity, favorite and purchase actions.
 */
export function DetailPage() {
  const { id } = useParams({ from: '/nft/$id' })
  const query = useNft(id)

  return (
    <Shell active="Mercado" hideMobileNav tab={null}>
      {query.isPending ? (
        <DetailSkeleton />
      ) : query.isError ? (
        <div role="alert" className="page-container flex flex-col items-center gap-4 py-24 text-center">
          <h1 className="text-xl font-bold text-fg-strong">{query.error instanceof ClientError && query.error.status === 404 ? 'NFT não encontrado' : 'Não foi possível carregar este NFT'}</h1>
          <p className="text-sm text-muted">{query.error.message}</p>
          <div className="flex gap-3">
            {query.error instanceof ClientError && query.error.status === 404 ? null : <Button onClick={() => void query.refetch()}>Tentar novamente</Button>}
            <Button asChild variant="outline">
              <Link to="/">Voltar ao catálogo</Link>
            </Button>
          </div>
        </div>
      ) : (
        <DetailContent nft={query.data} />
      )}
    </Shell>
  )
}

/**
 * Loading placeholder matching the detail layout.
 */
function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando NFT">
      <div className="px-7 pt-[66px] md:hidden">
        <Skeleton className="h-[361px] w-full rounded-[28px]" />
        <div className="mt-8 flex flex-col gap-4">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
      <div className="page-container hidden pt-[60px] md:block md:min-h-[1540px]">
        <div className="grid gap-8 lg:grid-cols-[573px_minmax(0,1fr)]">
          <div className="flex gap-7">
            <div className="flex w-[100px] shrink-0 flex-col gap-4">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-[100px] w-[100px]" />
              ))}
            </div>
            <Skeleton className="h-[444px] w-[444px]" />
          </div>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Interactive content of the detail screen once data is loaded.
 * @param props loaded NFT detail
 */
function DetailContent({ nft }: { nft: NftDetail }) {
  const navigate = useNavigate()
  const router = useRouter()
  const { user } = useAuth()
  const openAuth = useOpenAuth()
  const favorites = useFavorites()
  const toggle = useToggleFavorite()
  const cart = useCart()
  const { add } = useCartMutations()
  const [edition, setEdition] = useState<EditionId>(() => (nft.editions.find((entry) => entry.id === 'e50' && entry.available > 0) ?? nft.editions.find((entry) => entry.available > 0) ?? nft.editions[0]).id)
  const [quantity, setQuantity] = useState(1)
  const [image, setImage] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [tab, setTab] = useState<'details' | 'reviews'>('details')

  const selected = nft.editions.find((entry) => entry.id === edition) ?? nft.editions[0]
  const available = selected.available
  const inCart = cart.data?.items.find((item) => item.nftId === nft.id && item.editionId === selected.id)?.quantity ?? 0
  const room = Math.max(0, available - inCart)
  const title = nft.name
  const favorite = favorites.data?.nftIds.includes(nft.id) ?? false
  const soldOut = room === 0

  useEffect(() => {
    setQuantity((current) => Math.max(1, Math.min(current, Math.max(1, room))))
  }, [room])

  /**
   * Adds the selected edition and quantity to the cart and reports the outcome.
   * @param goToCart whether to continue to the cart afterwards
   */
  const addToCart = (goToCart: boolean) => {
    add.mutate(
      { nftId: nft.id, editionId: selected.id, quantity },
      {
        onSuccess: () => {
          if (goToCart) void navigate({ to: '/carrinho' })
          else toast.success(`${title} adicionado ao carrinho`)
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  const share = (target: 'linkedin' | 'message' | 'twitter') => {
    const url = encodeURIComponent(window.location.href)
    if (target === 'message') {
      void navigator.clipboard?.writeText(window.location.href).then(() => toast.success('Link copiado'), () => toast.error('Não foi possível copiar o link'))
      return
    }
    const base = target === 'linkedin' ? 'https://www.linkedin.com/sharing/share-offsite/?url=' : 'https://twitter.com/intent/tweet?url='
    window.open(`${base}${url}`, '_blank', 'noopener,noreferrer')
  }

  const mobileEditions = (
    <div role="radiogroup" aria-labelledby="edition-label-m" className="mt-3 flex flex-wrap gap-1.5">
      {nft.editions.map((entry) => (
        <button
          key={entry.id}
          type="button"
          role="radio"
          aria-checked={entry.id === selected.id}
          aria-label={entry.available === 0 ? `${entry.label}, esgotada` : `${entry.label}, ${entry.available} ${entry.available === 1 ? 'disponível' : 'disponíveis'}`}
          disabled={entry.available === 0}
          onClick={() => setEdition(entry.id)}
          className={cn('h-7 rounded-full border px-2.5 text-[13px] leading-4 disabled:line-through disabled:opacity-40', entry.id === selected.id ? 'border-primary font-bold text-accent' : 'border-line-soft text-muted')}
        >
          {entry.label}
        </button>
      ))}
    </div>
  )

  return (
    <>
      <div className="bg-[#271813] md:hidden">
        <div className="relative px-7 pt-[66px]">
          <button type="button" aria-label="Voltar" onClick={() => (window.history.length > 1 ? router.history.back() : void router.navigate({ to: '/' }))} className="absolute left-[27px] top-[22px] flex h-9 w-9 items-center justify-center rounded-full border border-primary/60 bg-raised">
            <Icon name="arrow-left" size={18} />
          </button>
          <button type="button" aria-label={favorite ? 'Remover dos favoritos' : 'Favoritar'} aria-pressed={favorite} onClick={() => (user ? toggle.mutate({ nftId: nft.id, active: favorite }) : openAuth('login'))} className="absolute right-[25px] top-[22px] flex h-9 w-9 items-center justify-center rounded-full border border-primary/60 bg-raised">
            <Icon name={favorite ? 'heart' : 'heart-sm'} size={18} />
          </button>
          <button type="button" aria-label="Ampliar imagem" onClick={() => setZoom(true)} className="block h-[361px] w-full overflow-hidden rounded-[28px]">
            <NftImage artwork={nft.gallery[image] ?? nft.image} alt={`Arte do NFT ${title}`} size={640} priority className="h-full w-full object-cover" />
          </button>
        </div>
        <div className="relative -mt-[35px] rounded-t-[40px] bg-card px-6 pb-8 pt-[33px]">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold leading-6 text-fg-strong">{title}</h1>
            <p className="flex h-[26px] shrink-0 items-center gap-1 rounded-full border border-primary px-2 text-[13px] font-bold leading-4 text-accent">
              <Icon name="star" size={12} />
              <span role="img" aria-label={`Nota ${nft.rating} de 5`}>
                {nft.rating.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
              </span>
              <span className="font-normal text-muted">({nft.reviewCount})</span>
            </p>
          </div>
          <p className="mt-3 text-[13px] leading-6 text-muted">{nft.description}</p>
          <h2 id="edition-label-m" className="mt-[11px] text-sm font-bold leading-4 text-fg-strong">
            Edição:
          </h2>
          {mobileEditions}
          <dl className="mt-2.5 space-y-2 text-sm leading-6 text-subtle">
            <div className="flex gap-2">
              <dt>ID do token:</dt>
              <dd>{formatTokenId(nft.tokenId)}</dd>
            </div>
            <div className="flex gap-2">
              <dt>Coleção:</dt>
              <dd>{nft.collection}</dd>
            </div>
            <div className="flex gap-2">
              <dt>Atributos:</dt>
              <dd>{nft.attributes.join(', ')}</dd>
            </div>
          </dl>
          <p role="status" className={cn('text-xs text-muted', available > 5 && inCart === 0 ? 'sr-only' : 'mt-2')}>
            {available === 0 ? 'Edição esgotada' : `${available} ${available === 1 ? 'disponível' : 'disponíveis'}${inCart ? `, ${inCart} no seu carrinho` : ''}`}
          </p>
        </div>
      </div>
    <div className="page-container pb-[180px] md:pb-0">
      <nav aria-label="Trilha" className="hidden pt-8 text-[15px] font-bold leading-4 text-fg-strong md:block">
        <Link to="/" className="hover:text-accent">
          Início
        </Link>{' '}
        / <span>Mercado</span>
      </nav>

      <div className="hidden gap-6 pt-4 md:grid md:pt-3 lg:grid-cols-[573px_minmax(0,1fr)] lg:gap-8">
        <div className="flex gap-7">
          <div className="hidden w-[100px] shrink-0 flex-col gap-4 md:flex" role="group" aria-label="Galeria">
            {nft.gallery.map((artwork, index) => (
              <button key={`${artwork}-${index}`} type="button" aria-label={`Ver imagem ${index + 1}`} aria-pressed={image === index} onClick={() => setImage(index)} className={cn('h-[100px] w-[100px] overflow-hidden rounded-md border', image === index ? 'border-primary' : 'border-transparent')}>
                <NftImage artwork={artwork} alt="" size={320} className="h-full w-full" />
              </button>
            ))}
          </div>

          <div className="relative mt-0.5 w-full max-w-[444px] bg-card p-5 md:h-[444px] md:w-[444px]">
            <NftImage artwork={nft.gallery[image] ?? nft.image} alt={`Arte do NFT ${title}`} size={640} priority className="rounded-3xl" />
            <button type="button" aria-label="Ampliar imagem" onClick={() => setZoom(true)} className="absolute right-3 top-[13px] flex h-[30px] w-[30px] items-center justify-center rounded-full bg-ink">
              <Icon name="zoom" size={20} />
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          <h1 className="text-2xl font-bold leading-[33px] text-fg-strong md:text-[28px]">{title}</h1>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p data-testid="detail-price" className="text-[22px] font-bold leading-5 text-primary">
              {formatEthLabel(nft.priceEth)}
            </p>
            <p className="flex items-center gap-1 text-[15px] leading-5 text-fg">
              <span role="img" aria-label={`Nota ${nft.rating} de 5`} className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon key={star} name="star" size={15} className={star <= Math.round(nft.rating) ? '' : 'opacity-60'} />
                ))}
              </span>
              {nft.reviewCount} avaliações de colecionadores
            </p>
          </div>
          <div className="mt-3 h-px w-full max-w-[573px] bg-[#4d321e]" />
          <h2 className="mt-[12.4px] text-sm font-bold leading-4 text-fg-strong">Sobre este NFT:</h2>
          <p className="mt-3 max-w-[574px] text-sm leading-[22px] text-muted">{nft.description}</p>

          <h2 id="edition-label" className="mt-[13.4px] text-sm font-bold leading-4 text-fg-strong">
            Edição:
          </h2>
          <div role="radiogroup" aria-labelledby="edition-label" className="mt-3 flex flex-wrap gap-1.5">
            {nft.editions.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="radio"
                aria-checked={entry.id === selected.id}
                aria-label={entry.available === 0 ? `${entry.label}, esgotada` : `${entry.label}, ${entry.available} ${entry.available === 1 ? 'disponível' : 'disponíveis'}`}
                disabled={entry.available === 0}
                onClick={() => setEdition(entry.id)}
                className={cn('h-7 rounded-full border px-[5px] text-sm leading-4 disabled:line-through disabled:opacity-40', entry.id === selected.id ? 'border-primary font-bold text-accent' : 'border-line-soft text-muted')}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <p role="status" className={cn('text-xs text-muted', available > 5 && inCart === 0 ? 'sr-only' : 'mt-2')}>
            {available === 0 ? 'Edição esgotada' : `${available} ${available === 1 ? 'disponível' : 'disponíveis'}${inCart ? `, ${inCart} no seu carrinho` : ''}`}
          </p>

          <div className="mt-[13.3px] hidden flex-wrap items-start justify-between gap-3 md:flex">
            <QuantityStepper variant="tall" value={quantity} max={Math.max(1, room)} onChange={setQuantity} label={title} disabled={soldOut} />
            <div className="flex gap-2">
              <Button size="sm" className="h-10 w-[130px] px-0 font-bold uppercase" disabled={soldOut || add.isPending} onClick={() => addToCart(true)}>
                {soldOut ? 'Esgotado' : 'Comprar'}
              </Button>
              <Button size="sm" variant="outline" className="h-10 w-[130px] px-0" aria-pressed={favorite} onClick={() => (user ? toggle.mutate({ nftId: nft.id, active: favorite }) : openAuth('login'))}>
                <Icon name={favorite ? 'heart' : 'heart-sm'} size={20} />
                {favorite ? 'Favoritado' : 'Favoritar'}
              </Button>
            </div>
          </div>

          <dl className="mt-[13.4px] space-y-3 text-[15px] leading-5 text-subtle">
            <div className="flex gap-1">
              <dt>ID do token:</dt>
              <dd>{formatTokenId(nft.tokenId)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Coleção:</dt>
              <dd>{nft.collection}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Atributos:</dt>
              <dd>{nft.attributes.join(', ')}</dd>
            </div>
          </dl>
          <div className="mt-3 flex h-[18px] items-center gap-2 text-[15px] font-bold leading-4 text-fg-strong">
            <span className="mr-1">Compartilhar este NFT:</span>
            {(['linkedin', 'message', 'twitter'] as const).map((target) => (
              <button key={target} type="button" aria-label={`Compartilhar via ${target === 'message' ? 'link copiado' : target}`} onClick={() => share(target)} className="flex h-[18px] w-[18px] items-center justify-center">
                <Icon name={`share-${target}`} size={target === 'message' ? 18 : 15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-24" aria-label="Informações do NFT">
        <div role="tablist" className="flex gap-8 border-b border-[#4d321e]">
          <button type="button" role="tab" aria-selected={tab === 'details'} onClick={() => setTab('details')} className={cn('h-[27px] text-left leading-4', tab === 'details' ? 'border-b-2 border-primary text-[18px] font-bold text-accent' : 'border-b-2 border-transparent text-[18px] text-fg')}>
            Detalhes do NFT
          </button>
          <button type="button" role="tab" aria-selected={tab === 'reviews'} onClick={() => setTab('reviews')} className={cn('h-[27px] text-left leading-4', tab === 'reviews' ? 'border-b-2 border-primary text-[17px] font-bold text-accent' : 'border-b-2 border-transparent text-[17px] text-fg')}>
            Avaliações de colecionadores ({nft.reviewCount})
          </button>
        </div>
        {tab === 'details' ? (
          <div role="tabpanel" className="pt-3 text-sm leading-6 text-muted">
            <div className="space-y-6">
              {nft.longDescription.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <p className="mt-3 font-bold text-fg-strong">Rede:</p>
            <p>Cunhado na {networkLabels[nft.network]} com procedência imutável e metadados armazenados no IPFS.</p>
            <p className="mt-3 font-bold text-fg-strong">Contrato:</p>
            <p>
              Direitos autorais do criador: {nft.royaltyPercent}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.
            </p>
            <p className="mt-3 font-bold text-fg-strong">Direitos autorais:</p>
            <p>
              {nft.contractAddress.slice(0, 6)}...{nft.contractAddress.slice(-4)} • Contrato inteligente ERC-721 verificado.
            </p>
          </div>
        ) : (
          <div role="tabpanel" className="pt-3 text-sm leading-6 text-muted">
            <p>
              Nota média {nft.rating.toLocaleString('pt-BR')} de 5 com base em {nft.reviewCount} avaliações de colecionadores. Os comentários individuais ainda não estão disponíveis.
            </p>
          </div>
        )}
      </section>

      <MoreFromCollection nft={nft} />

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] rounded-t-[40px] bg-card px-6 pb-8 pt-5 md:hidden" role="region" aria-label="Comprar">
        <div className="flex h-9 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-muted">Qtd.</span>
            <QuantityStepper variant="pill" value={quantity} max={Math.max(1, room)} onChange={setQuantity} label={title} disabled={soldOut} />
          </div>
          <p data-testid="detail-price" className="text-lg font-bold leading-5 text-accent">{formatEthLabel(nft.priceEth)}</p>
        </div>
        <div className="mt-4 flex gap-3">
          <Button size="lg" className="h-[60px] flex-1 rounded-full bg-gradient-to-r from-[#c98a52] to-primary text-base font-bold" disabled={soldOut || add.isPending} onClick={() => addToCart(true)}>
            {soldOut ? 'Esgotado' : 'Comprar NFT'}
          </Button>
          <button type="button" aria-label="Adicionar ao carrinho" disabled={soldOut || add.isPending} onClick={() => addToCart(false)} className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full border border-line-soft bg-raised disabled:opacity-40">
            <Icon name="cart" size={20} />
          </button>
        </div>
      </div>

      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-[min(92vw,720px)] bg-transparent p-0">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">Imagem ampliada</DialogDescription>
          <NftImage artwork={nft.gallery[image] ?? nft.image} alt={`Arte ampliada do NFT ${title}`} size={1254} className="rounded-2xl" />
        </DialogContent>
      </Dialog>
    </div>
    </>
  )
}

/**
 * Related NFTs from the same category, excluding the current one.
 * @param props current NFT
 */
function MoreFromCollection({ nft }: { nft: NftDetail }) {
  const query = useCatalog({})
  const others = query.data?.items.filter((entry) => entry.id !== nft.id) ?? []
  const items = others.length > 7 ? others.slice(2, 7) : others.slice(0, 5)
  if (query.isSuccess && items.length === 0) return null
  return <RelatedRow id="more-title" title="Mais desta coleção" items={items} pending={query.isPending} className="mt-[95px]" />
}
