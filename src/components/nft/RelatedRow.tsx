import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/api/contracts'
import { NftCardSkeleton } from '@/components/nft/NftCard'
import { NftImage } from '@/components/nft/NftImage'
import { formatEthLabel } from '@/lib/eth'
import { cn } from '@/lib/utils'

interface RelatedRowProps {
  id: string
  title: string
  items: NftSummary[]
  pending: boolean
  spacing?: 'detail' | 'cart'
  className?: string
}

/**
 * Section with a heading, five compact NFT cards and decorative carousel dots, shared by detail and cart.
 * @param props section id, heading, items, loading flag and the text spacing variant
 */
export function RelatedRow({ id, title, items, pending, spacing = 'detail', className }: RelatedRowProps) {
  return (
    <section className={className} aria-labelledby={id}>
      <h2 id={id} className="border-b border-[#4d321e] pb-[11px] text-[17px] font-bold leading-4 text-accent">
        {title}
      </h2>
      <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 lg:gap-x-[26px]">
        {pending ? Array.from({ length: 5 }, (_, index) => <NftCardSkeleton key={index} />) : items.map((entry) => <RelatedCard key={entry.id} nft={entry} spacing={spacing} />)}
      </ul>
      <div className="mt-8 hidden justify-center gap-2 md:flex" aria-hidden="true">
        {[0, 1, 2].map((dot) => (
          <span key={dot} className={cn('h-3 w-3 rounded-full border-[1.5px] border-accent', dot === 1 && 'bg-accent')} />
        ))}
      </div>
    </section>
  )
}

/**
 * Compact catalog card with artwork panel, name and price.
 * @param props catalog item and text spacing variant
 */
function RelatedCard({ nft, spacing }: { nft: NftSummary; spacing: 'detail' | 'cart' }) {
  return (
    <li>
      <Link to="/nft/$id" params={{ id: nft.id }} className="block">
        <div className="bg-card px-1 py-5 md:h-[255px]">
          <NftImage artwork={nft.image} alt="" size={320} className="rounded-2xl" />
        </div>
        <p className={cn('text-[15px] text-fg', spacing === 'detail' ? 'mt-[15px] leading-4' : 'mt-2 leading-5')}>{nft.name}</p>
        <p className={cn('text-base font-bold leading-4 text-accent', spacing === 'detail' ? 'mt-px' : 'mt-2')}>{formatEthLabel(nft.priceEth)}</p>
      </Link>
    </li>
  )
}
