import { cn } from '@/lib/utils'

interface CarouselDotsProps {
  count: number
  index: number
  onSelect: (index: number) => void
  label: string
  variant?: 'filled' | 'outline'
  className?: string
}

/**
 * Pagination dots for a carousel. Each dot is a real button, so the slides stay reachable by keyboard and pointer.
 * @param props number of slides, active index, selection handler, group label and the design variant
 */
export function CarouselDots({ count, index, onSelect, label, variant = 'filled', className }: CarouselDotsProps) {
  return (
    <div role="group" aria-label={label} className={cn('flex items-center', className)}>
      {Array.from({ length: count }, (_, dot) => (
        <button
          key={dot}
          type="button"
          aria-label={`Ir para ${dot + 1} de ${count}`}
          aria-current={dot === index ? 'true' : undefined}
          onClick={() => onSelect(dot)}
          className="group flex h-6 w-4 items-center justify-center"
        >
          <span
            aria-hidden="true"
            className={cn(
              'block rounded-full transition-opacity',
              variant === 'filled' ? 'h-2 w-2 bg-primary' : 'h-3 w-3 border-[1.5px] border-accent',
              variant === 'filled' && dot !== index && 'opacity-45',
              variant === 'outline' && dot === index && 'bg-accent',
            )}
          />
        </button>
      ))}
    </div>
  )
}
