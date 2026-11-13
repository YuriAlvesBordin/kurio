import type { ArtworkId } from '@/api/contracts'
import { cn } from '@/lib/utils'

interface NftImageProps {
  artwork: ArtworkId
  alt: string
  size?: 320 | 640 | 1254
  className?: string
  priority?: boolean
}

/**
 * Responsive artwork image with explicit dimensions to avoid layout shift.
 * @param props artwork id, alt text and display options
 */
export function NftImage({ artwork, alt, size = 640, className, priority = false }: NftImageProps) {
  const base = `/assets/img/${artwork}`
  return (
    <img
      src={`${base}-${size}.webp`}
      srcSet={`${base}-320.webp 320w, ${base}-640.webp 640w, ${base}-1254.webp 1254w`}
      sizes={size === 1254 ? '(min-width: 1024px) 560px, 100vw' : '(min-width: 1024px) 320px, 50vw'}
      alt={alt}
      width={640}
      height={640}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      className={cn('block aspect-square w-full object-cover', className)}
    />
  )
}
