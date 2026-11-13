import { useRouter } from '@tanstack/react-router'
import { Icon } from '@/components/Icon'

/**
 * Compact mobile header with a back button and a page title for inner screens.
 * @param props title text and optional fallback navigation
 */
export function BackHeader({ title, centered = false }: { title: string; centered?: boolean }) {
  const router = useRouter()
  const goBack = () => (window.history.length > 1 ? router.history.back() : void router.navigate({ to: '/' }))
  if (centered) {
    return (
      <div className="relative flex h-[88px] items-center justify-center px-7 pt-[10px] md:hidden">
        <button type="button" aria-label="Voltar" onClick={goBack} className="absolute left-7 top-[32px] flex h-9 w-9 items-center justify-center rounded-full border border-line-soft bg-raised">
          <Icon name="arrow-left" size={18} />
        </button>
        <p aria-hidden="true" className="text-xl font-bold leading-5 text-fg-strong">{title}</p>
      </div>
    )
  }
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-ink px-4 md:hidden">
      <button type="button" aria-label="Voltar" onClick={goBack} className="flex h-10 w-10 items-center justify-center bg-card">
        <Icon name="arrow-left" size={20} />
      </button>
      <p aria-hidden="true" className="text-base font-bold text-fg-strong">{title}</p>
    </div>
  )
}
