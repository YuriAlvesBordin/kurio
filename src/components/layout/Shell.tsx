import type { ReactNode } from 'react'
import { Footer } from './Footer'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

interface ShellProps {
  children: ReactNode
  active?: string
  tab?: 'home' | 'favorites' | 'cart' | 'account' | null
  hideFooter?: boolean
  hideMobileNav?: boolean
}

/**
 * Page frame with the desktop header, the shared footer and the mobile tab bar.
 * @param props page content and which navigation item is active
 */
export function Shell({ children, active, tab = null, hideFooter, hideMobileNav }: ShellProps) {
  return (
    <div className="min-h-dvh">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[80] focus:bg-primary focus:px-3 focus:py-2 focus:text-ink">
        Ir para o conteúdo
      </a>
      <Header active={active} />
      <main id="conteudo" className={hideMobileNav ? undefined : 'pb-36 md:pb-0'}>
        {children}
      </main>
      {hideFooter ? null : <div className="hidden md:block"><Footer /></div>}
      {hideMobileNav ? null : <MobileNav active={tab} />}
    </div>
  )
}
