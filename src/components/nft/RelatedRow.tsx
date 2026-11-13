import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/api/contracts'
import { CarouselDots } from '@/components/CarouselDots'
import { NftCardSkeleton } from '@/components/nft/NftCard'
import { NftImage } from '@/components/nft/NftImage'
import { useCatalog } from '@/hooks/queries'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { formatEthLabel } from '@/lib/eth'
import { cn } from '@/lib/utils'

const MAX_ITEMS = 15
const SCROLL_MS = 650

/**
 * Scrolls a snap track with an ease in out curve. Snapping is switched off while the animation runs, because the
 * browser would otherwise fight every frame and make the motion stutter.
 * @param track scroll container
 * @param left target scrollLeft
 */
function animateScroll(track: HTMLElement, left: number) {
  const from = track.scrollLeft
  const delta = left - from
  if (!delta) return
  const start = performance.now()
  track.style.scrollSnapType = 'none'
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / SCROLL_MS)
    const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
    track.scrollLeft = from + delta * eased
    if (t < 1) requestAnimationFrame(frame)
    else track.style.scrollSnapType = ''
  }
  requestAnimationFrame(frame)
}

/**
 * Catalog items for the related carousels: two catalog pages, minus the current NFT, rotated by an offset so each page
 * of the app suggests a different starting point.
 * @param excludeId NFT to leave out
 * @param offset rotation applied before taking the items
 */
export function useRelatedItems(excludeId: string | undefined, offset: number) {
  const first = useCatalog({})
  const second = useCatalog({ page: 2 })
  const all = [...(first.data?.items ?? []), ...(second.data?.items ?? [])].filter((entry) => entry.id !== excludeId)
  const start = all.length > offset ? offset : 0
  return { items: [...all.slice(start), ...all.slice(0, start)].slice(0, MAX_ITEMS), pending: first.isPending, empty: first.isSuccess && all.length === 0 }
}

interface RelatedRowProps {
  id: string
  title: string
  items: NftSummary[]
  pending: boolean
  spacing?: 'detail' | 'cart'
  className?: string
}

/**
 * Section with a heading and a carousel of compact NFT cards, shared by detail and cart. The track scrolls with touch or
 * trackpad swipes and snaps to cards, and the dots (and arrow keys) move one page of cards at a time.
 * @param props section id, heading, items, loading flag and the text spacing variant
 */
export function RelatedRow({ id, title, items, pending, spacing = 'detail', className }: RelatedRowProps) {
  const large = useMediaQuery('(min-width: 1024px)')
  const medium = useMediaQuery('(min-width: 768px)')
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const perView = large ? 5 : medium ? 3 : 2
  const pages = Math.max(1, Math.ceil(items.length / perView))
  const track = useRef<HTMLUListElement>(null)
  const [page, setPage] = useState(0)

  const step = useCallback(() => {
    const list = track.current
    const first = list?.firstElementChild as HTMLElement | null
    if (!list || !first) return 0
    return first.offsetWidth + (parseFloat(getComputedStyle(list).columnGap) || 0)
  }, [])

  const sync = useCallback(() => {
    const list = track.current
    const width = step()
    if (!list || !width) return
    setPage(Math.min(pages - 1, Math.max(0, Math.round(list.scrollLeft / width / perView))))
  }, [pages, perView, step])

  useEffect(() => {
    sync()
  }, [sync])

  const go = (target: number) => {
    const list = track.current
    if (!list) return
    const next = Math.min(pages - 1, Math.max(0, target))
    const left = next * perView * step()
    if (reduced) list.scrollLeft = left
    else animateScroll(list, left)
    setPage(next)
  }

  return (
    <section className={className} aria-labelledby={id} aria-roledescription="carousel">
      <h2 id={id} className="border-b border-[#4d321e] pb-[11px] text-[17px] font-bold leading-4 text-accent">
        {title}
      </h2>
      <ul
        ref={track}
        onScroll={sync}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') go(page + 1)
          if (event.key === 'ArrowLeft') go(page - 1)
        }}
        className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] lg:gap-x-[26px] [&::-webkit-scrollbar]:hidden"
      >
        {pending
          ? Array.from({ length: 5 }, (_, index) => (
              <li key={index} aria-hidden="true" className={ITEM}>
                <NftCardSkeleton />
              </li>
            ))
          : items.map((entry) => <RelatedCard key={entry.id} nft={entry} spacing={spacing} />)}
      </ul>
      {pages > 1 ? <CarouselDots count={pages} index={page} onSelect={go} label="Páginas de sugestões" variant="outline" className="-mb-1.5 mt-[26px] hidden justify-center gap-0 md:flex" /> : null}
    </section>
  )
}

const ITEM = 'shrink-0 snap-start basis-[calc((100%-16px)/2)] md:basis-[calc((100%-32px)/3)] lg:basis-[calc((100%-104px)/5)]'

/**
 * Compact catalog card with artwork panel, name and price.
 * @param props catalog item and text spacing variant
 */
function RelatedCard({ nft, spacing }: { nft: NftSummary; spacing: 'detail' | 'cart' }) {
  return (
    <li className={ITEM}>
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
