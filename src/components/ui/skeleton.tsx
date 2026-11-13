import { cn } from '@/lib/utils'

/**
 * Placeholder block with a shimmer that stops under prefers-reduced-motion.
 * @param props standard div props
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn('skeleton', className)} {...props} />
}
