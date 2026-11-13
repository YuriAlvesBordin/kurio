import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Icon } from '@/components/Icon'
import { BackHeader } from '@/components/layout/BackHeader'
import { Shell } from '@/components/layout/Shell'
import { authStore } from '@/features/auth/authStore'
import { cn } from '@/lib/utils'

const SOON = [
  { label: 'Atividade', icon: 'shopping' },
  { label: 'Lista de interesse', icon: 'heart-sm' },
  { label: 'Ofertas', icon: 'activity' },
  { label: 'Arquivos baixados', icon: 'download' },
  { label: 'Suporte', icon: 'danger' },
] as const

/**
 * Two column account frame with the sidebar from the design. Sections outside the scope say "Em breve".
 * @param props active section and page content
 */
export function AccountLayout({ section, title, children }: { section: 'profile' | 'wallets'; title: string; children: ReactNode }) {
  const navigate = useNavigate()
  const link = (active: boolean) => cn('flex h-[45px] items-center gap-3.5 border-l-[6px] pl-[11px] pr-4 text-[15px] text-accent', active ? 'border-primary' : 'border-transparent hover:text-fg-strong')

  const logout = async () => {
    await navigate({ to: '/' })
    await authStore.logout()
    toast.success('Você saiu da conta')
  }

  return (
    <Shell active="Início" tab="account" hideFooter>
      <BackHeader title={title} />
      <div className="page-container grid gap-8 py-8 lg:grid-cols-[310px_minmax(0,1fr)] lg:gap-x-[28px]">
        <nav aria-label="Conta" className="h-fit bg-card pb-2 pt-4">
          <h2 className="mb-2 px-[17px] text-lg font-bold leading-5 text-fg-strong">Meu perfil</h2>
          <ul>
            <li>
              <Link to="/perfil" className={link(section === 'profile')} aria-current={section === 'profile' ? 'page' : undefined}>
                <Icon name="user" size={16} />
                Dados do perfil
              </Link>
            </li>
            <li>
              <Link to="/perfil/carteiras" className={link(section === 'wallets')} aria-current={section === 'wallets' ? 'page' : undefined}>
                <Icon name="location" size={16} />
                Carteiras
              </Link>
            </li>
            {SOON.map((item) => (
              <li key={item.label}>
                <button type="button" onClick={() => toast.info('Em breve')} className={cn(link(false), 'w-full text-left')}>
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => void logout()} className="flex h-[41px] w-full items-center gap-3.5 border-t border-[#583824] px-[17px] text-left text-[15px] font-bold text-accent">
            <Icon name="logout" size={16} />
            Sair
          </button>
        </nav>
        <div>{children}</div>
      </div>
    </Shell>
  )
}
