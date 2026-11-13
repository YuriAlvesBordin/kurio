import { Icon } from '@/components/Icon'
import { cn } from '@/lib/utils'

type StepperVariant = 'default' | 'tall' | 'pill' | 'round'

interface QuantityStepperProps {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  label: string
  disabled?: boolean
  className?: string
  variant?: StepperVariant
}

const BUTTON_SIZE: Record<StepperVariant, string> = {
  default: 'h-8 w-8',
  tall: 'h-[50px] w-[33px]',
  pill: 'h-[30px] w-5',
  round: 'h-[26px] w-[26px] bg-dark',
}

const ICON_SIZE: Record<StepperVariant, number> = { default: 14, tall: 26, pill: 16, round: 16 }

const VALUE_SIZE: Record<StepperVariant, string> = {
  default: 'min-w-5 text-sm',
  tall: 'min-w-[13px] text-xl',
  pill: 'min-w-[11px] text-base',
  round: 'min-w-[13px] text-base',
}

/**
 * Integer stepper with accessible buttons. The value is always clamped to [min, max].
 * @param props current value, bounds, change callback, accessible label and visual variant
 */
export function QuantityStepper({ value, min = 1, max, onChange, label, disabled, className, variant = 'default' }: QuantityStepperProps) {
  const clamp = (next: number) => Math.max(min, Math.min(max, Math.trunc(next)))
  const button = cn('flex items-center justify-center rounded-full bg-primary disabled:opacity-40', BUTTON_SIZE[variant])
  return (
    <div role="group" aria-label={label} className={cn('inline-flex items-center', variant === 'round' ? 'gap-2' : 'gap-3', className)}>
      <button type="button" aria-label={`Diminuir quantidade de ${label}`} disabled={disabled || value <= min} onClick={() => onChange(clamp(value - 1))} className={button}>
        <Icon name="minus" size={ICON_SIZE[variant]} className={variant === 'round' ? 'invert' : undefined} />
      </button>
      <output aria-live="polite" data-testid="quantity" className={cn('text-center text-fg-strong', VALUE_SIZE[variant])}>
        {value}
      </output>
      <button type="button" aria-label={`Aumentar quantidade de ${label}`} disabled={disabled || value >= max} onClick={() => onChange(clamp(value + 1))} className={button}>
        <Icon name="plus" size={ICON_SIZE[variant]} className={variant === 'round' ? 'invert' : undefined} />
      </button>
    </div>
  )
}
