import { useEffect, useState } from 'react'
import { categoryIds, networkIds, type NftList } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { categoryLabels, networkLabels } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { CatalogSearch } from '@/routes/search'

interface FiltersProps {
  search: CatalogSearch
  data: NftList | undefined
  onChange: (patch: Partial<CatalogSearch>) => void
  idPrefix: string
}

/**
 * Toggles one value inside a comma separated URL list.
 * @param current existing csv or undefined
 * @param value value to toggle
 */
function toggleCsv(current: string | undefined, value: string): string | undefined {
  const list = current ? current.split(',') : []
  const next = list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]
  return next.length ? next.join(',') : undefined
}

/**
 * Sidebar with collection, price range and network filters. Every control writes to the URL.
 * @param props current search, facet data and change callback
 */
export function Filters({ search, data, onChange, idPrefix }: FiltersProps) {
  const lo = Number(data?.priceRange.min ?? '0.02')
  const hi = Number(data?.priceRange.max ?? '12.30')
  const [min, setMin] = useState(search.min ?? lo.toFixed(2))
  const [max, setMax] = useState(search.max ?? hi.toFixed(2))

  useEffect(() => {
    setMin(search.min ?? lo.toFixed(2))
    setMax(search.max ?? hi.toFixed(2))
  }, [search.min, search.max, lo, hi])

  const selectedCollections = search.collections?.split(',') ?? []
  const selectedNetworks = search.networks?.split(',') ?? []
  const facetCount = (list: { id: string; count: number }[] | undefined, id: string) => list?.find((entry) => entry.id === id)?.count ?? 0

  const row = (active: boolean) => cn('flex h-10 w-full items-center justify-between text-left text-base tracking-[-0.025em] hover:text-accent', active ? 'text-accent' : 'text-muted')

  return (
    <div className="bg-card pb-[19px] pt-4 text-base">
      <section aria-labelledby={`${idPrefix}-collections`}>
        <h2 id={`${idPrefix}-collections`} className="mb-[10px] px-5 text-lg font-bold leading-6 text-fg">
          Coleções
        </h2>
        <ul>
          {categoryIds.map((id) => {
            const active = selectedCollections.includes(id)
            return (
              <li key={id}>
                <button type="button" aria-pressed={active} onClick={() => onChange({ collections: toggleCsv(search.collections, id) })} className={cn(row(active), 'pl-8 pr-8')}>
                  <span>{categoryLabels[id]}</span>
                  <span className={cn('font-bold', active ? 'text-accent' : 'text-fg')}>({facetCount(data?.facets.collections, id)})</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby={`${idPrefix}-price`} className="mt-[35px]">
        <h2 id={`${idPrefix}-price`} className="px-5 text-lg font-bold leading-6 text-fg">
          Faixa de preço
        </h2>
        <div className="px-8">
          <div className="dual-range mt-[7px]">
            <span aria-hidden="true" className="dual-range-track" />
            <label className="sr-only" htmlFor={`${idPrefix}-min`}>
              Preço mínimo em ETH
            </label>
            <input id={`${idPrefix}-min`} type="range" min={lo} max={hi} step={0.01} value={Number(min)} onChange={(event) => setMin(Math.min(Number(event.target.value), Number(max)).toFixed(2))} />
            <label className="sr-only" htmlFor={`${idPrefix}-max`}>
              Preço máximo em ETH
            </label>
            <input id={`${idPrefix}-max`} type="range" min={lo} max={hi} step={0.01} value={Number(max)} onChange={(event) => setMax(Math.max(Number(event.target.value), Number(min)).toFixed(2))} />
          </div>
          <p className="mt-[9px] text-base leading-6 text-fg">
            Preço: {min.replace('.', ',')} - {max.replace('.', ',')} ETH
          </p>
          <Button size="filter" className="mt-[10px]" onClick={() => onChange({ min: Number(min) <= lo ? undefined : min, max: Number(max) >= hi ? undefined : max })}>
            Aplicar
          </Button>
        </div>
      </section>

      <section aria-labelledby={`${idPrefix}-network`} className="mt-[37px]">
        <h2 id={`${idPrefix}-network`} className="mb-[10px] px-5 text-lg font-bold leading-6 text-fg">
          Rede
        </h2>
        <ul>
          {networkIds.map((id) => {
            const active = selectedNetworks.includes(id)
            return (
              <li key={id}>
                <button type="button" aria-pressed={active} onClick={() => onChange({ networks: toggleCsv(search.networks, id) })} className={cn(row(active), 'pl-8 pr-5')}>
                  <span>{networkLabels[id]}</span>
                  <span className={active ? 'text-accent' : 'text-muted'}>({facetCount(data?.facets.networks, id)})</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
