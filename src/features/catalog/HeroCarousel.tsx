import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type TouchEvent } from 'react'
import type { ArtworkId } from '@/api/contracts'
import { CarouselDots } from '@/components/CarouselDots'
import { NftImage } from '@/components/nft/NftImage'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

interface Slide {
  eyebrow: string
  desktopTitle: [string, string]
  mobileTitle: [string, string]
  desktopText: string
  mobileText: string
  main: ArtworkId
  small: ArtworkId
  alt: string
}

const SLIDES: Slide[] = [
  {
    eyebrow: 'Bem-vindo à Kurio',
    desktopTitle: ['SEJA DONO DO FUTURO', 'DA ARTE DIGITAL'],
    mobileTitle: ['SEJA DONO DA', 'CULTURA DIGITAL'],
    desktopText: 'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
    mobileText: 'Descubra NFTs selecionados de criadores do mundo todo.',
    main: 'ape-varsity',
    small: 'ape-hoodie',
    alt: 'Macaco de óculos escuros e jaqueta verde, arte em destaque',
  },
  {
    eyebrow: 'Novidades na Kurio',
    desktopTitle: ['NOVOS CRIADORES', 'NOVAS COLEÇÕES'],
    mobileTitle: ['NOVOS CRIADORES', 'NOVAS COLEÇÕES'],
    desktopText: 'Conheça artistas emergentes e coleções verificadas que acabaram de chegar ao mercado, prontas para entrar na sua coleção.',
    mobileText: 'Conheça os artistas que acabaram de chegar ao mercado.',
    main: 'ape-hoodie',
    small: 'ape-blazer',
    alt: 'Macaco de chapéu e moletom roxo, arte em destaque',
  },
  {
    eyebrow: 'Edições raras',
    desktopTitle: ['EDIÇÕES LIMITADAS', 'DISPONÍVEIS AGORA'],
    mobileTitle: ['EDIÇÕES RARAS', 'DISPONÍVEIS AGORA'],
    desktopText: 'Garanta peças raras diretamente dos criadores antes que a edição esgote e complete a sua coleção.',
    mobileText: 'Garanta peças raras antes que a edição esgote.',
    main: 'ape-headphones',
    small: 'ape-varsity',
    alt: 'Macaco com fones de ouvido e jaqueta bege, arte em destaque',
  },
]

const AUTOPLAY_MS = Number(import.meta.env.VITE_HERO_AUTOPLAY_MS ?? 6000)

/**
 * Index state and behavior shared by the hero carousels: autoplay that pauses on hover, focus and touch, never runs with
 * reduced motion, waits until the other slides are mounted, and supports swipe and arrow keys.
 */
function useHeroCarousel() {
  const [index, setIndex] = useState(0)
  const [leaving, setLeaving] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [paused, setPaused] = useState(false)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const touchStart = useRef<number | null>(null)
  const count = SLIDES.length

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 2500)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!ready || paused || reduced || AUTOPLAY_MS <= 0) return
    const timer = window.setInterval(() => go(index + 1), AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [ready, paused, reduced, count, index])

  const go = (next: number) => {
    const target = ((next % count) + count) % count
    if (target === index) return
    setLeaving(index)
    setIndex(target)
  }

  useEffect(() => {
    if (leaving === null) return
    const timer = window.setTimeout(() => setLeaving(null), 900)
    return () => window.clearTimeout(timer)
  }, [leaving])
  const bind = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocus: () => setPaused(true),
    onBlur: () => setPaused(false),
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') go(index + 1)
      if (event.key === 'ArrowLeft') go(index - 1)
    },
    onTouchStart: (event: TouchEvent) => {
      setPaused(true)
      touchStart.current = event.touches[0]?.clientX ?? null
    },
    onTouchEnd: (event: TouchEvent) => {
      setPaused(false)
      const start = touchStart.current
      touchStart.current = null
      const end = event.changedTouches[0]?.clientX
      if (start === null || end === undefined || Math.abs(end - start) < 40) return
      go(end < start ? index + 1 : index - 1)
    },
  }
  return { index, leaving, go, ready, bind }
}

type SlideState = 'active' | 'leaving' | 'idle'

/**
 * One stacked slide. The active slide sits on top and animates in, the previous one stays underneath, opaque, until the
 * entrance finishes (so the artwork never turns translucent), and idle slides are hidden and not focusable.
 */
function SlideFrame({ state, children }: { state: SlideState; children: ReactNode }) {
  return (
    <div
      data-state={state}
      aria-hidden={state !== 'active'}
      inert={state !== 'active'}
      className={cn('group/slide col-start-1 row-start-1', state === 'active' && 'relative z-10', state === 'leaving' && 'pointer-events-none relative z-0', state === 'idle' && 'invisible pointer-events-none')}
    >
      {children}
    </div>
  )
}

const EASE = 'ease-[cubic-bezier(0.22,0.8,0.3,1)]'

const DELAYS = [
  'group-data-[state=active]/slide:delay-[150ms]',
  'group-data-[state=active]/slide:delay-[250ms]',
  'group-data-[state=active]/slide:delay-[350ms]',
  'group-data-[state=active]/slide:delay-[450ms]',
]

/**
 * Staggered text entrance: fades up in order when the slide becomes active and fades out fast when it leaves.
 */
function Reveal({ order, children, className }: { order: 0 | 1 | 2 | 3; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        `translate-y-4 opacity-0 transition-[opacity,transform] duration-300 group-data-[state=active]/slide:translate-y-0 group-data-[state=active]/slide:opacity-100 group-data-[state=active]/slide:duration-700 group-data-[state=active]/slide:${EASE} motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none`,
        DELAYS[order],
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * Artwork wrapper: the incoming image is revealed from the right with a gentle zoom while staying fully opaque.
 */
function ArtReveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        `overflow-hidden transition-[clip-path] duration-[900ms] motion-reduce:transition-none ${EASE} [clip-path:inset(0_0_0_100%)] group-data-[state=active]/slide:[clip-path:inset(0)] group-data-[state=leaving]/slide:[clip-path:inset(0)] group-data-[state=idle]/slide:transition-none`,
        className,
      )}
    >
      <div className={`h-full w-full scale-110 transition-transform duration-[1100ms] motion-reduce:transition-none ${EASE} group-data-[state=active]/slide:scale-100 group-data-[state=leaving]/slide:scale-100 group-data-[state=idle]/slide:transition-none motion-reduce:scale-100`}>{children}</div>
    </div>
  )
}

function stateOf(position: number, index: number, leaving: number | null): SlideState {
  if (position === index) return 'active'
  return position === leaving ? 'leaving' : 'idle'
}

/**
 * Desktop and tablet hero: a three slide carousel with the large artwork, title, text and call to action.
 */
export function DesktopHero() {
  const { index, leaving, go, ready, bind } = useHeroCarousel()
  return (
    <section className="page-container mt-8 hidden md:block" aria-roledescription="carousel" aria-label="Destaques da Kurio" {...bind}>
      <div className="relative grid touch-pan-y md:min-h-[340px] lg:h-[450px]" aria-live="off">
        {SLIDES.map((slide, position) => {
          if (position > 0 && !ready) return null
          const Heading = position === 0 ? 'h1' : 'h2'
          return (
            <SlideFrame key={slide.main + position} state={stateOf(position, index, leaving)}>
              <div role="group" aria-roledescription="slide" aria-label={`${position + 1} de ${SLIDES.length}`} className="flex items-start justify-between gap-6 pl-10 pt-[43px] lg:gap-0">
                <div className="flex min-w-0 flex-1 flex-col lg:w-[600px] lg:flex-none">
                  <Reveal order={0}>
                    <p className="text-base leading-4 tracking-[0.015em] text-fg">{slide.eyebrow}</p>
                  </Reveal>
                  <Reveal order={1}>
                    <Heading id={position === 0 ? 'hero-title' : undefined} className="mt-2 text-[30px] font-bold leading-[44px] tracking-[-0.014em] text-fg-strong lg:text-[44px] lg:leading-[70px]">
                      {slide.desktopTitle[0]}
                      <br />
                      {slide.desktopTitle[1]}
                    </Heading>
                  </Reveal>
                  <Reveal order={2}>
                    <p className="mt-1 max-w-[557px] text-sm leading-6 text-muted">{slide.desktopText}</p>
                  </Reveal>
                  <Reveal order={3}>
                    <Button asChild variant="primary" size="hero" className="mt-8 w-[140px]">
                      <a href="#catalogo">EXPLORAR</a>
                    </Button>
                  </Reveal>
                </div>
                <ArtReveal className="-mt-[43px] h-[300px] w-[300px] shrink-0 rounded-[20px] lg:h-[450px] lg:w-[450px]">
                  <NftImage artwork={slide.main} alt={slide.alt} size={640} priority={position === 0} className="h-full rounded-[20px]" />
                </ArtReveal>
              </div>
            </SlideFrame>
          )
        })}
        <CarouselDots count={SLIDES.length} index={index} onSelect={go} label="Destaques" className="absolute bottom-6 left-10 z-20 lg:bottom-[35px] lg:left-[596px]" />
      </div>
    </section>
  )
}

/**
 * Phone banner: the design background (rounded card with two soft circles) stays fixed while the slides animate over it.
 */
export function MobileBanner() {
  const { index, leaving, go, ready, bind } = useHeroCarousel()
  return (
    <div className="relative mt-4 overflow-hidden rounded-[30px]" aria-roledescription="carousel" aria-label="Destaques da Kurio" {...bind}>
      <img src="/assets/icons/hero-bg-mobile.svg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full max-w-none" draggable={false} />
      <div className="relative grid min-h-[190px] touch-pan-y" aria-live="off">
        {SLIDES.map((slide, position) => {
          if (position > 0 && !ready) return null
          return (
            <SlideFrame key={slide.main + position} state={stateOf(position, index, leaving)}>
              <div role="group" aria-roledescription="slide" aria-label={`${position + 1} de ${SLIDES.length}`} className="relative h-full">
                <div className="relative pl-4 pt-1.5 max-[413px]:pb-9">
                  <Reveal order={0}>
                    <p className="text-xs leading-4 text-fg">{slide.eyebrow}</p>
                  </Reveal>
                  <Reveal order={1}>
                    <h2 className="mt-1.5 max-w-[190px] text-lg font-bold leading-[29px] text-fg-strong max-[413px]:max-w-[min(190px,calc(100%-160px))] max-[374px]:max-w-[calc(100%-140px)]">
                      {slide.mobileTitle[0]} {slide.mobileTitle[1]}
                    </h2>
                  </Reveal>
                  <Reveal order={2}>
                    <p className="mt-1.5 max-w-[188px] text-xs leading-[18px] text-muted max-[413px]:max-w-[min(188px,calc(100%-160px))] max-[374px]:max-w-[calc(100%-140px)]">{slide.mobileText}</p>
                  </Reveal>
                  <Reveal order={3}>
                    <a href="#catalogo" className="flex h-4 w-fit items-center gap-2 text-xs font-bold leading-[14px] text-accent">
                      EXPLORAR
                      <span aria-hidden="true" className="relative block size-4">
                        <img src="/assets/icons/hero-arrow.svg" alt="" width={9.53} height={11.5} className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-90" draggable={false} />
                      </span>
                    </a>
                  </Reveal>
                </div>
                <ArtReveal className="absolute right-4 top-2.5 h-[139px] w-[138px] rounded-2xl max-[413px]:h-[120px] max-[413px]:w-[120px] max-[374px]:h-[100px] max-[374px]:w-[100px]">
                  <NftImage artwork={slide.main} alt={slide.alt.replace(', arte em destaque', '')} size={320} priority={position === 0} className="h-full rounded-2xl object-cover" />
                </ArtReveal>
                <ArtReveal className="absolute right-[82px] top-[98px] h-[59px] w-[58px] rounded-2xl max-[413px]:right-[72px] max-[413px]:top-[86px] max-[413px]:h-[50px] max-[413px]:w-[50px] max-[374px]:right-16 max-[374px]:top-[74px] max-[374px]:h-[42px] max-[374px]:w-[42px]">
                  <NftImage artwork={slide.small} alt="" size={320} className="h-full rounded-2xl object-cover" />
                </ArtReveal>
              </div>
            </SlideFrame>
          )
        })}
      </div>
      <CarouselDots count={SLIDES.length} index={index} onSelect={go} label="Destaques" className="absolute inset-x-0 bottom-[-3px] z-20 justify-center" />
    </div>
  )
}
