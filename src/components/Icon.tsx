import { cn } from '@/lib/utils'

interface IconProps {
  name: string
  size?: number
  className?: string
}

/**
 * Renders a decorative icon from the exported Figma icon set.
 * @param props icon file name without extension, pixel size and class
 */
export function Icon({ name, size = 20, className }: IconProps) {
  return <img src={`/assets/icons/${name}.svg`} alt="" width={size} height={size} className={cn('shrink-0', className)} draggable={false} />
}
