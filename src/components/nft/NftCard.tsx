import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/api/contracts'
import { Icon } from '@/components/Icon'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/authStore'
import { useOpenAuth } from '@/features/auth/useOpenAuth'
import { useFavorites, useToggleFavorite } from '@/hooks/queries'
import { NftImage } from './NftImage'
import { Price } from './Price'

/**
 * Catalog card with artwork, name, price and a favorite toggle.
 * @param props NFT summary and whether its image should load eagerly
 */
export function NftCard({ nft, priority = false }: { nft: NftSummary; priority?: boolean }) {
  const { user } = useAuth()
  const favorites = useFavorites()
  const toggle = useToggleFavorite()
  const openAuth = useOpenAuth()
  const active = favorites.data?.nftIds.includes(nft.id) ?? false
  const title = nft.name

  return (
    <li className="relative" data-testid="nft-card">
      <Link to="/nft/$id" params={{ id: nft.id }} className="block" aria-label={`${title}, ${nft.priceEth} ETH`}>
        <div className="relative rounded-[20px] bg-card px-1 pb-5 pt-3 md:rounded-none md:px-1 md:py-[25px]">
          {nft.badge ? <span className="absolute left-3 top-3 z-10 bg-primary px-3 py-1 text-xs font-bold text-ink md:hidden">{nft.badge}</span> : null}
          <NftImage artwork={nft.image} alt={`Arte do NFT ${title}`} size={640} sizes="(min-width: 1024px) 320px, (min-width: 768px) 50vw, calc(50vw - 40px)" className="rounded-2xl md:rounded-2xl" priority={priority} />
        </div>
        <div className="px-2 pt-[9px] md:px-0">
          <h3 className="text-sm text-fg md:text-base md:leading-4">{title}</h3>
          <Price value={nft.priceEth} compareAt={nft.compareAtPriceEth} className="text-[15px] leading-[18px] md:mt-3 md:text-lg md:leading-4" />
        </div>
      </Link>
      <button
        type="button"
        aria-label={active ? `Remover ${title} dos favoritos` : `Favoritar ${title}`}
        aria-pressed={active}
        onClick={() => (user ? toggle.mutate({ nftId: nft.id, active }) : openAuth('login'))}
        className="absolute right-3 top-3 z-10 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-ink/70 md:hidden"
      >
        <Icon name={active ? 'heart' : 'heart-sm'} size={16} />
      </button>
    </li>
  )
}

/**
 * Loading placeholder with the same footprint as a catalog card.
 */
export function NftCardSkeleton() {
  return (
    <li aria-hidden="true">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/3" />
    </li>
  )
}
