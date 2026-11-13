import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { toast } from '@/lib/toast'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { sortIds, type SortId } from '@/api/contracts'
import { Icon } from '@/components/Icon'
import { Shell } from '@/components/layout/Shell'
import { NftCard, NftCardSkeleton } from '@/components/nft/NftCard'
import { NftImage } from '@/components/nft/NftImage'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCatalog } from '@/hooks/queries'
import { cn } from '@/lib/utils'
import { toCatalogParams, type CatalogSearch } from '@/routes/search'
import { Filters } from './Filters'

const TABS = [
  { id: 'all', label: 'Todos os NFTs' },
  { id: 'new', label: 'Novos lançamentos' },
  { id: 'trending', label: 'Em alta' },
] as const

const SORT_LABELS: Record<SortId, string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  name: 'Nome',
}

const BLOG = [
  { artwork: 'ape-blazer', date: '12 de setembro', read: 'Leitura de 6 min', title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.' },
  { artwork: 'ape-varsity', date: '13 de setembro', read: 'Leitura de 2 min', title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que moldam a cultura digital.' },
  { artwork: 'ape-hoodie', date: '15 de setembro', read: 'Leitura de 3 min', title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência, direitos autorais e utilidade.' },
  { artwork: 'ape-headphones', date: '15 de setembro', read: 'Leitura de 2 min', title: 'Como proteger sua carteira', text: 'Proteja sua carteira, seus ativos e sua identidade.' },
] as const

/**
 * Início screen: hero, filterable catalog backed by the URL, promotions and editorial blocks.
 */
export function HomePage() {
  const search = useSearch({ from: '/' }) as CatalogSearch
  const navigate = useNavigate()
  const params = toCatalogParams(search)
  const query = useCatalog(params)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [text, setText] = useState(search.q ?? '')

  useEffect(() => setText(search.q ?? ''), [search.q])

  /**
   * Writes a change to the URL. Any filter change resets pagination to the first page.
   * @param patch fields to change
   * @param keepPage true only for page navigation
   */
  const update = (patch: Partial<CatalogSearch>, keepPage = false) => {
    void navigate({
      to: '/',
      search: ((previous: CatalogSearch) => {
        const next = { ...previous, ...patch }
        if (!keepPage) delete next.page
        return next
      }) as never,
    })
  }

  useEffect(() => {
    if ((search.q ?? '') === text.trim()) return
    const handle = window.setTimeout(() => update({ q: text.trim() || undefined }), 350)
    return () => window.clearTimeout(handle)
  }, [text])

  const desktop = useIsDesktop()
  const data = query.data
  const filtered = Boolean(search.q || search.collections || search.networks || search.min || search.max)

  return (
    <Shell tab="home">
      {desktop ? (
      <section className="page-container mt-8 hidden md:block" aria-labelledby="hero-title">
        <div className="relative flex h-[450px] items-start justify-between pl-10 pt-[43px]">
          <div className="flex w-[600px] max-w-full flex-col">
            <p className="text-base leading-4 tracking-[0.015em] text-fg">Bem-vindo à Kurio</p>
            <h1 id="hero-title" className="mt-2 text-[44px] font-bold leading-[70px] tracking-[-0.014em] text-fg-strong">
              SEJA DONO DO FUTURO
              <br />
              DA ARTE DIGITAL
            </h1>
            <p className="mt-1 max-w-[557px] text-sm leading-6 text-muted">Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.</p>
            <Button asChild variant="primary" size="hero" className="mt-8 w-[140px]">
              <a href="#catalogo">EXPLORAR</a>
            </Button>
          </div>
          <img src="/assets/icons/hero-dots.svg" alt="" width={40} height={8} className="absolute left-[600px] top-[399px] hidden lg:block" />
          <div className="-mt-[43px] h-[450px] w-[450px] shrink-0">
            <NftImage artwork="ape-varsity" alt="Macaco de óculos escuros e jaqueta verde, arte em destaque" size={640} priority className="h-full rounded-[20px]" />
          </div>
        </div>
      </section>
      ) : (
      <div className="px-6 pt-10 md:hidden">
        <div className="flex gap-[7px]">
          <div role="search" className="flex h-[45px] min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-card px-3">
            <Icon name="search" size={20} className="opacity-70" />
            <input aria-label="Explorar coleções" value={text} onChange={(event) => setText(event.target.value)} placeholder="Explorar coleções" className="min-w-0 flex-1 bg-transparent text-[15px] font-bold text-fg-strong outline-none placeholder:text-muted/80" />
          </div>
          <button type="button" aria-label="Abrir filtros" onClick={() => setFiltersOpen(true)} className="flex h-[45px] w-[45px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#a36b3b] to-primary">
            <Icon name="filter" size={22} />
          </button>
        </div>
        <div className="relative mt-4 h-[190px] overflow-hidden rounded-3xl bg-gradient-to-br from-[#6b482c] to-[#46301f]">
          <span aria-hidden="true" className="absolute -left-10 top-[-60px] h-[330px] w-[330px] rounded-full bg-white/[0.04]" />
          <span aria-hidden="true" className="absolute left-[120px] top-[-20px] h-[260px] w-[260px] rounded-full bg-white/[0.04]" />
          <div className="relative pl-4 pt-1.5">
            <p className="text-xs leading-4 text-fg">Bem-vindo à Kurio</p>
            <h2 className="mt-[5px] max-w-[190px] text-lg font-bold leading-7 text-fg-strong">SEJA DONO DA CULTURA DIGITAL</h2>
            <p className="mt-2 max-w-[190px] text-xs leading-[18px] text-muted">Descubra NFTs selecionados de criadores do mundo todo.</p>
            <a href="#catalogo" className="-mt-1 inline-flex items-center gap-2 text-xs font-bold leading-4 text-accent">
              EXPLORAR <span aria-hidden="true">→</span>
            </a>
          </div>
          <NftImage artwork="ape-varsity" alt="Macaco de óculos escuros e jaqueta verde" size={320} priority className="absolute right-4 top-2.5 h-[139px] w-[138px] rounded-2xl" />
          <NftImage artwork="ape-hoodie" alt="" size={320} className="absolute right-[82px] top-[98px] h-[59px] w-[58px] rounded-[14px]" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-[5px] flex justify-center gap-2">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="h-2 w-2 rounded-full bg-primary" />
            ))}
          </div>
        </div>
      </div>
      )}

      <section id="catalogo" className="page-container max-md:!px-0 mt-[13px] grid gap-8 scroll-mt-4 md:mt-24 md:grid-cols-[minmax(0,230px)_minmax(0,1fr)] lg:grid-cols-[310px_minmax(0,1fr)] lg:gap-12" aria-label="Catálogo">
        {desktop ? (
        <aside className="hidden md:block" aria-label="Filtros">
          <Filters search={search} data={data} onChange={(patch) => update(patch)} idPrefix="desktop" />
          <div className="mt-6 h-[470px] bg-[#271a10] pt-8">
            <p className="px-5 text-2xl font-bold leading-8 tracking-[-0.02em] text-accent">NFT EM DESTAQUE</p>
            <p className="px-5 pt-3 text-center text-xl font-bold leading-7 text-fg-strong">OFERTA LIMITADA</p>
            <Link to="/nft/$id" params={{ id: 'nft-002' }} className="mt-[15px] block h-[366px] overflow-hidden rounded-[20px]">
              <NftImage artwork="ape-hoodie" alt="Sage Nomad em destaque, oferta limitada" size={640} className="h-full w-full object-cover" />
            </Link>
          </div>
        </aside>
        ) : null}

        <div className="min-w-0">
          <div className="mb-[17px] flex flex-wrap items-center justify-between gap-3 px-6 md:mb-[26px] md:px-0">
            <div role="tablist" aria-label="Seções do catálogo" className="flex gap-[5px] text-sm md:gap-5 md:text-[15px] max-md:[&>button:last-child]:ml-[11px]">
              {TABS.map((tab) => {
                const active = (search.tab ?? 'all') === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => update({ tab: tab.id === 'all' ? undefined : tab.id })}
                    className={cn('relative h-[22px] whitespace-nowrap text-left md:leading-4', active ? 'font-bold text-accent after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-[86%] after:bg-primary after:content-[""]' : 'text-fg')}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
            <div className="hidden items-center gap-1 text-[15px] md:flex">
              <span id="sort-label">Ordenar por:</span>
              <Select value={search.sort ?? 'recent'} onValueChange={(value) => update({ sort: value === 'recent' ? undefined : (value as SortId) })}>
                <SelectTrigger aria-labelledby="sort-label" iconSrc="/assets/icons/arrow-down.svg" iconSize={16} iconClassName="absolute right-[6px] top-1/2 -translate-y-1/2" className="h-6 w-[190px] justify-start whitespace-nowrap border-0 bg-transparent p-0 text-[15px] text-fg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortIds.map((id) => (
                    <SelectItem key={id} value={id}>
                      {SORT_LABELS[id]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div aria-live="polite" aria-busy={query.isFetching} className="px-6 md:px-0">
            {query.isError && !data ? (
              <div role="alert" className="flex flex-col items-center gap-4 bg-card p-10 text-center">
                <p className="text-fg-strong">Não foi possível carregar o catálogo.</p>
                <p className="text-sm text-muted">{query.error.message}</p>
                <Button onClick={() => void query.refetch()}>Tentar novamente</Button>
              </div>
            ) : query.isPending ? (
              <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-x-[34px] md:gap-y-[69px]" aria-label="Carregando NFTs">
                {Array.from({ length: 9 }, (_, index) => (
                  <NftCardSkeleton key={index} />
                ))}
              </ul>
            ) : data && data.items.length === 0 ? (
              <div className="flex flex-col items-center gap-4 bg-card p-10 text-center">
                <p className="text-lg font-bold text-fg-strong">Nenhum NFT encontrado</p>
                <p className="text-sm text-muted">Ajuste a busca ou os filtros para ver mais resultados.</p>
                {filtered || search.tab ? (
                  <Button variant="outline" onClick={() => void navigate({ to: '/', search: {} as never })}>
                    Limpar filtros
                  </Button>
                ) : null}
              </div>
            ) : data ? (
              <ul className={cn('grid grid-cols-2 gap-4 transition-opacity max-md:[&>li:nth-child(even)]:mt-8 md:grid-cols-3 md:gap-x-[34px] md:gap-y-[69px]', query.isPlaceholderData && 'opacity-60')}>
                {data.items.map((nft, index) => (
                  <NftCard key={nft.id} nft={nft} priority={index < 3} />
                ))}
              </ul>
            ) : null}
            {query.isError && data ? (
              <p role="alert" className="mt-4 text-sm text-danger">
                Falha ao atualizar. Exibindo o último resultado.{' '}
                <button type="button" className="underline" onClick={() => void query.refetch()}>
                  Tentar novamente
                </button>
              </p>
            ) : null}
          </div>

          {data && data.totalPages > 1 ? (
            <nav aria-label="Paginação" className="mt-10 flex justify-end gap-2 px-6 md:mt-[82px] md:px-0">
              {Array.from({ length: data.totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  aria-label={`Página ${page}`}
                  aria-current={page === data.page ? 'page' : undefined}
                  onClick={() => update({ page: page === 1 ? undefined : page }, true)}
                  className={cn('flex h-[35px] w-[35px] items-center justify-center rounded border text-base', page === data.page ? 'border-primary bg-primary font-bold text-ink' : 'border-line text-fg hover:border-primary')}
                >
                  {page}
                </button>
              ))}
              <button type="button" aria-label="Próxima página" disabled={data.page >= data.totalPages} onClick={() => update({ page: data.page + 1 }, true)} className="flex h-[35px] w-[35px] items-center justify-center rounded border border-line disabled:opacity-40">
                <Icon name="arrow-right-page" size={18} />
              </button>
            </nav>
          ) : null}
        </div>
      </section>

      {desktop ? (
      <section className="page-container mt-24 hidden gap-7 md:grid md:grid-cols-2" aria-label="Destaques">
        {([
          { artwork: 'ape-varsity', title: 'Lançamentos gênesis de edição limitada', text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.', titleWidth: 206, textWidth: 263, pad: 30 },
          { artwork: 'ape-blazer', title: 'Arte digital selecionada e muito mais', text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.', titleWidth: 260, textWidth: 252, pad: 35 },
        ] as const).map((promo) => (
          <div key={promo.title} className="relative flex h-[250px] overflow-hidden rounded-lg bg-card">
            <NftImage artwork={promo.artwork} alt="" size={320} className="h-full w-[287px] shrink-0 rounded-[20px] object-cover max-lg:w-[40%]" />
            <div className="flex min-w-0 flex-1 flex-col items-end pt-[37px] text-right" style={{ paddingRight: promo.pad }}>
              <h3 className="text-lg font-bold leading-6 tracking-[-0.01em] text-fg-strong" style={{ maxWidth: promo.titleWidth }}>
                {promo.title}
              </h3>
              <p className="mt-2 max-h-[72px] overflow-hidden text-sm leading-6 text-muted" style={{ maxWidth: promo.textWidth }}>
                {promo.text}
              </p>
              <Button size="hero" className="absolute bottom-[46px] w-[140px] text-sm" style={{ right: promo.pad }} onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>
                Explorar <Icon name="arrow-right" size={18} />
              </Button>
            </div>
          </div>
        ))}
      </section>
      ) : null}

      {desktop ? (
      <section id="diario" className="page-container mt-24 hidden scroll-mt-4 md:block" aria-labelledby="diario-title">
        <h2 id="diario-title" className="text-center text-[28px] font-bold leading-[37px] text-fg-strong">
          Diário da Cunhagem
        </h2>
        <p className="mb-10 mt-3 text-center text-sm leading-[18px] text-muted">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
        <div className="grid grid-cols-4 gap-6 lg:grid-cols-[repeat(4,268px)]">
          {BLOG.map((post) => (
            <article key={post.title} className="flex h-[369px] flex-col overflow-hidden rounded-lg bg-card">
              <NftImage artwork={post.artwork} alt="" size={320} className="h-[195px] shrink-0 object-cover object-center" />
              <div className="flex flex-1 flex-col px-4 pt-3">
                <p className="h-8 text-xs leading-4 text-muted">
                  {post.date}{'\u00a0\u00a0|\u00a0\u00a0'}{post.read}
                </p>
                <h3 className="mt-2 h-[42px] text-base font-bold leading-[21px] text-fg-strong">{post.title}</h3>
                <p className="mt-2 h-8 text-xs leading-4 text-muted">{post.text}</p>
                <button type="button" onClick={() => toast.info('Em breve')} className="mt-2 w-fit text-xs font-bold leading-4 text-accent">
                  Ler mais →
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      ) : null}

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="inset-x-0 bottom-0 top-auto h-auto max-h-[85dvh] translate-x-0 translate-y-0 left-0 md:hidden">
          <DialogTitle className="sr-only">Filtros</DialogTitle>
          <DialogDescription className="sr-only">Filtre o catálogo por coleção, preço e rede.</DialogDescription>
          <div className="flex items-center gap-3 px-4 pt-4 text-sm">
            <span id="sort-label-mobile">Ordenar por:</span>
            <Select value={search.sort ?? 'recent'} onValueChange={(value) => update({ sort: value === 'recent' ? undefined : (value as SortId) })}>
              <SelectTrigger aria-labelledby="sort-label-mobile" className="h-10 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[70]">
                {sortIds.map((id) => (
                  <SelectItem key={id} value={id}>
                    {SORT_LABELS[id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Filters search={search} data={data} onChange={(patch) => update(patch)} idPrefix="mobile" />
          <div className="p-4">
            <Button className="w-full" onClick={() => setFiltersOpen(false)}>
              Ver resultados
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  )
}
