import { Icon } from '@/components/Icon'
import { toast } from 'sonner'
import { useState } from 'react'

const COLUMNS = [
  { title: 'Meu perfil', items: ['Meu perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'] },
  { title: 'Central de ajuda', items: ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'] },
  { title: 'Coleções', items: ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'] },
]

const PILLARS = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

const SOCIAL = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube']

/**
 * Shared page footer with pillars, newsletter, contact bar and link columns.
 * Links outside the scope of this challenge announce that they are not available yet.
 */
export function Footer() {
  const [email, setEmail] = useState('')
  const soon = () => toast.info('Em breve')

  return (
    <footer id="criadores" className="mt-24 pb-6">
      <div className="page-container">
        <div className="overflow-hidden">
          <div className="grid bg-card pb-[13px] pt-8 md:grid-cols-2 lg:grid-cols-[297px_266px_266px_minmax(0,1fr)]">
            {PILLARS.map((pillar, index) => (
              <div key={pillar.letter} className={`relative ${index === 0 ? 'lg:pl-12' : 'lg:pl-[17px]'} max-lg:px-8`}>
                {index > 0 ? <span aria-hidden="true" className="absolute left-0 top-0 hidden h-[202px] w-[2px] bg-[#80512f] lg:block" /> : null}
                <div className="mb-[11px] flex h-[74px] w-[74px] items-center justify-center rounded-full bg-primary text-[28px] font-bold text-ink" aria-hidden="true">
                  {pillar.letter}
                </div>
                <h3 className="mb-2 text-lg font-bold leading-6 tracking-[-0.035em] text-fg-strong">{pillar.title}</h3>
                <p className="max-w-[200px] text-sm leading-[22px] text-muted">{pillar.text}</p>
              </div>
            ))}
            <form
              className="relative flex flex-col max-lg:px-8 lg:pl-4"
              onSubmit={(event) => {
                event.preventDefault()
                soon()
              }}
            >
              <span aria-hidden="true" className="absolute left-0 top-0 hidden h-[202px] w-[2px] bg-[#80512f] lg:block" />
              <h3 className="max-w-[325px] text-lg font-bold leading-4 tracking-[-0.01em] text-fg-strong">Antecipe-se ao próximo lançamento</h3>
              <div className="mt-[14px] flex w-[325px] max-w-full overflow-hidden rounded">
                <label htmlFor="newsletter" className="sr-only">
                  E-mail para novidades
                </label>
                <input
                  id="newsletter"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="digite seu e-mail..."
                  className="h-10 min-w-0 flex-1 border-0 bg-dark px-3 text-sm"
                />
                <button type="submit" className="h-10 w-[85px] bg-primary text-lg font-bold text-ink">
                  Enviar
                </button>
              </div>
              <p className="mt-4 max-w-[325px] text-sm leading-[22px] text-muted">Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
            </form>
          </div>
          <div className="grid h-auto min-h-[88px] items-center gap-4 bg-dark py-4 pl-8 text-sm leading-[22px] md:grid-cols-4 lg:grid-cols-[303px_303px_303px_minmax(0,1fr)] lg:gap-x-0">
            <span className="text-base font-bold tracking-[0.025em] text-fg-strong">KURIO</span>
            <span className="max-w-[240px] text-fg">Feito para colecionadores, criadores e cultura</span>
            <span className="text-fg">contato@email.com</span>
            <span className="text-fg">+55 11 4002 8922</span>
          </div>
          <div className="grid gap-8 bg-card pb-[29px] pl-8 pt-[30px] md:grid-cols-4 lg:grid-cols-[303px_303px_303px_minmax(0,1fr)] lg:gap-x-0">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="mb-[3px] text-lg font-bold leading-6 text-fg-strong">{column.title}</h3>
                <ul>
                  {column.items.map((item) => (
                    <li key={item} className="flex h-[30px] items-center">
                      <button type="button" onClick={soon} className="text-left text-sm text-fg hover:text-accent">
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <h3 className="mb-[13px] text-lg font-bold leading-6 text-fg-strong">Redes sociais</h3>
              <div className="flex gap-2">
                {SOCIAL.map((name) => (
                  <button key={name} type="button" onClick={soon} aria-label={name} className="flex h-8 w-8 items-center justify-center">
                    <Icon name={`social-${name}`} size={32} />
                  </button>
                ))}
              </div>
              <h3 className="mb-[7px] mt-7 text-lg font-bold leading-6 text-fg-strong">Carteiras compatíveis</h3>
              <p className="flex h-[26px] w-[228px] items-center justify-center whitespace-nowrap rounded border border-[#4d321e] text-[9.2px] font-bold text-primary">METAMASK &nbsp;•&nbsp; WALLETCONNECT &nbsp;•&nbsp; COINBASE</p>
            </div>
          </div>
        </div>
        <p className="flex h-9 items-center justify-center text-sm text-fg">© 2026 Kurio. Propriedade digital para todos.</p>
      </div>
    </footer>
  )
}
