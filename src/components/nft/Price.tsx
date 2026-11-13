import { formatEthLabel } from '@/lib/eth'
import { cn } from '@/lib/utils'

interface PriceProps {
  value: string
  compareAt?: string | null
  className?: string
}

/**
 * Displays an ETH amount in the accent color with an optional struck comparison price.
 * @param props amount as decimal string and optional compare price
 */
export function Price({ value, compareAt, className }: PriceProps) {
  return (
    <p className={cn('font-bold text-accent', className)}>
      {formatEthLabel(value)}
      {compareAt ? <span className="ml-3 font-normal text-subtle">{formatEthLabel(compareAt)}</span> : null}
    </p>
  )
}
