import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { networkIds, walletProviderIds, type NetworkId, type Quote, type WalletProviderId } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { ClientError } from '@/api/errors'
import { keys } from '@/api/keys'
import { BackHeader } from '@/components/layout/BackHeader'
import { Shell } from '@/components/layout/Shell'
import { NftImage } from '@/components/nft/NftImage'
import { Button } from '@/components/ui/button'
import { TextAreaField, LabelText, TextField } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Icon } from '@/components/Icon'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/authStore'
import { useCart, useQuote, useWalletConnection, useWallets } from '@/hooks/queries'
import type { Wallet, Wallets } from "@/api/contracts"
import { formatEth, formatEthLabel } from '@/lib/eth'
import { formatTokenId } from '@/lib/format'
import { networkLabels, providerLabels } from '@/lib/labels'
import { SummaryRows } from '@/features/cart/Summary'
import { clearIdempotencyKey, fingerprintOf, idempotencyKeyFor, retryWithSameKey } from './idempotency'
import { loadDraft, saveDraft } from './draft'

const schema = z.object({
  displayName: z.string().min(2, 'Informe seu nome de exibição.'),
  username: z.string().min(3, 'Use ao menos 3 caracteres.'),
  email: z.string().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
  profileName: z.string().min(2, 'Informe o nome do perfil.'),
  referralCode: z.string().min(2, 'Informe o código de indicação.'),
  ensName: z.string().min(2, 'Informe o nome ENS.'),
  ensSuffix: z.string(),
  secondaryAddress: z.string(),
  note: z.string().max(280, 'Use até 280 caracteres.'),
  network: z.enum(networkIds, { message: 'Selecione uma rede.' }),
  provider: z.enum(walletProviderIds, { message: 'Selecione uma carteira.' }),
})

type FormValues = z.infer<typeof schema>

const MOBILE_ORDER: Record<WalletProviderId, string> = { walletconnect: 'max-lg:order-1', metamask: 'max-lg:order-2', coinbase: 'max-lg:order-3' }

/**
 * Checkout screen: collector data, simulated wallet connection, review and order submission.
 * Totals always come from the server quote and any change requires explicit re-confirmation.
 */
export function CheckoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const client = useQueryClient()
  const cart = useCart()
  const quote = useQuote()
  const wallets = useWallets()
  const connection = useWalletConnection()
  const [acknowledged, setAcknowledged] = useState<Quote | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const userId = user?.id ?? ''

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: '',
      username: '',
      email: '',
      profileName: '',
      referralCode: '',
      ensName: '',
      ensSuffix: '.eth',
      secondaryAddress: '',
      note: '',
      network: undefined,
      provider: undefined,
    },
  })

  const prefilled = useRef(false)
  useEffect(() => {
    if (prefilled.current || !user || wallets.isPending || connection.isPending) return
    prefilled.current = true
    const primary = wallets.data?.primary
    const draft = loadDraft(user.id)
    form.reset({
      displayName: draft?.displayName ?? user.displayName,
      username: draft?.username ?? user.username,
      email: draft?.email ?? user.email,
      profileName: draft?.profileName ?? primary?.profileName ?? user.username,
      referralCode: draft?.referralCode ?? primary?.referralCode ?? '',
      ensName: draft?.ensName ?? user.ensName,
      ensSuffix: draft?.ensSuffix ?? user.ensSuffix,
      secondaryAddress: draft?.secondaryAddress ?? '',
      note: draft?.note ?? '',
      network: (draft?.network as NetworkId | undefined) ?? connection.data?.network ?? undefined,
      provider: (draft?.provider as WalletProviderId | undefined) ?? connection.data?.provider ?? undefined,
    })
  }, [user, wallets.isPending, wallets.data, connection.isPending, connection.data, form])

  useEffect(() => {
    if (!userId) return
    const subscription = form.watch((values) => saveDraft(userId, values as Partial<FormValues>))
    return () => subscription.unsubscribe()
  }, [form, userId])

  useEffect(() => {
    if (quote.data && !acknowledged) setAcknowledged(quote.data)
  }, [quote.data, acknowledged])

  const connected = connection.data?.status === 'connected' ? connection.data : null
  const network = form.watch('network')
  const provider = form.watch('provider')
  const connectionMatches = Boolean(connected && connected.network === network && connected.provider === provider)

  const connect = useMutation({
    mutationFn: () => api.connectWallet({ provider: provider as WalletProviderId, network: network as NetworkId }),
    onSuccess: (data) => {
      client.setQueryData(keys.connection(userId), data)
      toast.success('Carteira conectada')
    },
    onError: (error: ClientError) => toast.error(error.message),
  })

  const order = useMutation({
    mutationFn: async (values: FormValues) => {
      const fresh = await client.fetchQuery({ queryKey: [...keys.quote(userId), 'fresh'], queryFn: ({ signal }) => api.quote(signal), staleTime: 0 })
      if (acknowledged && fresh.revision !== acknowledged.revision) {
        client.setQueryData([...keys.quote(userId), cart.data?.version ?? 0], fresh)
        throw new ClientError('QUOTE_STALE', 'Os valores mudaram. Revise o pedido antes de confirmar.', 409, { quote: fresh })
      }
      const payload = {
        quoteRevision: (acknowledged ?? fresh).revision,
        collector: {
          displayName: values.displayName,
          username: values.username,
          email: values.email,
          profileName: values.profileName,
          referralCode: values.referralCode,
          ensName: values.ensName,
          ensSuffix: values.ensSuffix,
          secondaryAddress: values.secondaryAddress,
          note: values.note,
        },
        wallet: { provider: values.provider, network: values.network, address: connected?.address ?? '' },
      }
      const key = idempotencyKeyFor(userId, fingerprintOf(payload))
      return retryWithSameKey(() => api.createOrder(payload, key))
    },
    onSuccess: (created) => {
      clearIdempotencyKey(userId)
      void client.invalidateQueries({ queryKey: keys.cartRoot })
      void navigate({ to: '/pedido/$orderId', params: { orderId: created.id } })
    },
    onError: (error: ClientError) => {
      if (error.code === 'QUOTE_STALE' && error.quote) {
        client.setQueryData([...keys.quote(userId), cart.data?.version ?? 0], error.quote)
        void client.invalidateQueries({ queryKey: keys.cartRoot })
        setSubmitError('Os valores mudaram. Revise o resumo e confirme novamente.')
        return
      }
      setSubmitError(error.message)
    },
  })

  const current = quote.data
  const changed = Boolean(current && acknowledged && current.revision !== acknowledged.revision)
  const issues = current?.issues ?? []
  const items = cart.data?.items ?? []
  const empty = cart.isSuccess && items.length === 0

  const submit = form.handleSubmit((values) => {
    setSubmitError(null)
    if (!connectionMatches) {
      setSubmitError('Conecte a carteira selecionada antes de confirmar.')
      return
    }
    order.mutate(values)
  })

  return (
    <Shell active="Mercado" tab="cart" hideMobileNav>
      <BackHeader title="Pagamento com carteira" centered />
      <div className="page-container pb-10 max-md:!px-7">
        <nav aria-label="Trilha" className="hidden pt-8 text-[15px] font-bold leading-4 text-fg-strong md:block">
          <Link to="/">Início</Link> / <span>Mercado</span> / <span>Pagamento</span>
        </nav>

        {empty ? (
          <div className="mt-10 flex flex-col items-center gap-4 bg-card p-12 text-center">
            <p className="text-lg font-bold text-fg-strong">Não há itens para pagar</p>
            <Button asChild>
              <Link to="/">Explorar NFTs</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-0 flex flex-col gap-5 max-lg:[&>*:nth-child(n+6)]:mt-5 md:gap-10 md:mt-6 lg:mt-[30px] lg:grid lg:grid-cols-[minmax(0,1fr)_405px] lg:gap-x-[31px] lg:gap-y-0">
            <SavedWallets wallets={wallets.data} network={network} onSelect={(wallet) => { form.setValue('network', wallet.network, { shouldDirty: true }); form.setValue('provider', wallet.type, { shouldDirty: true }) }} />
            <section aria-labelledby="collector-title" className="grid content-start max-lg:order-6 gap-x-6 gap-y-4 sm:grid-cols-2 lg:gap-y-[19px]">
              <h1 id="collector-title" className="text-[17px] font-bold leading-5 text-fg-strong sm:col-span-2 lg:-mb-0.5">
                Perfil do colecionador
              </h1>
              <TextField floating label="Nome de exibição *" error={form.formState.errors.displayName?.message} {...form.register('displayName')} />
              <TextField floating label="Nome de usuário *" error={form.formState.errors.username?.message} {...form.register('username')} />
              <div className="relative flex flex-col gap-1.5">
                <Label htmlFor="network-select"><LabelText text="Rede *" /></Label>
                <Controller
                  control={form.control}
                  name="network"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id="network-select" aria-invalid={Boolean(form.formState.errors.network)}>
                        <SelectValue placeholder="Selecione uma rede" />
                      </SelectTrigger>
                      <SelectContent>
                        {networkIds.map((id) => (
                          <SelectItem key={id} value={id}>
                            {networkLabels[id]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.network ? (
                  <p role="alert" className="absolute left-0 top-full mt-0.5 text-xs leading-4 text-danger">
                    {form.formState.errors.network.message}
                  </p>
                ) : null}
              </div>
              <TextField floating label="Nome do perfil *" error={form.formState.errors.profileName?.message} {...form.register('profileName')} />
              <TextField floating className="[&_input]:pl-[22px]" label="Endereço da carteira *" readOnly value={connectionMatches ? (connected?.address ?? '') : ''} placeholder="Endereço 0x da carteira" hint={connectionMatches ? 'Carteira conectada.' : 'Conecte a carteira para preencher.'} />
              <TextField floating hideLabel className="[&_input]:pl-[22px]" label="Carteira secundária (opcional)" placeholder="ENS ou carteira secundária (opcional)" {...form.register('secondaryAddress')} />
              <div className="relative flex flex-col gap-1.5">
                <Label htmlFor="provider-select"><LabelText text="Tipo de carteira *" /></Label>
                <Controller
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id="provider-select" aria-invalid={Boolean(form.formState.errors.provider)}>
                        <SelectValue placeholder="Selecione uma carteira" />
                      </SelectTrigger>
                      <SelectContent>
                        {walletProviderIds.map((id) => (
                          <SelectItem key={id} value={id}>
                            {providerLabels[id]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.provider ? (
                  <p role="alert" className="absolute left-0 top-full mt-0.5 text-xs leading-4 text-danger">
                    {form.formState.errors.provider.message}
                  </p>
                ) : null}
              </div>
              <TextField floating label="Código de indicação *" error={form.formState.errors.referralCode?.message} {...form.register('referralCode')} />
              <TextField floating label="E-mail *" type="email" error={form.formState.errors.email?.message} {...form.register('email')} />
              <div className="grid grid-cols-[1fr_78px] items-end gap-2">
                <TextField floating label="Nome ENS *" error={form.formState.errors.ensName?.message} {...form.register('ensName')} />
                <span className="flex h-10 items-center justify-center border border-line text-sm">.eth</span>
              </div>
              <TextAreaField textareaClassName="mt-1.5 h-[151px] w-full resize-none lg:w-[350px]" className="sm:col-span-2 lg:mt-[48px]" label="Observação do colecionador (opcional)" error={form.formState.errors.note?.message} {...form.register('note')} />
            </section>

            <aside aria-labelledby="your-nfts" className="flex flex-col max-lg:contents">
              <div className="flex flex-col max-lg:order-7">
              <h2 id="your-nfts" className="mt-px text-[17px] font-bold leading-5 text-fg-strong">
                Seus NFTs
              </h2>
              <div className="mt-[9px] flex justify-between border-b border-rule pb-[11px] text-base leading-4 text-fg">
                <span>NFTs</span>
                <span>Subtotal</span>
              </div>
              {cart.isPending ? (
                <Skeleton className="mt-3 h-[70px] w-full" />
              ) : (
                <ul className="mt-3 flex flex-col gap-3">
                  {(current?.items ?? items).map((item) => (
                    <li key={item.id} data-testid="checkout-row" className="flex h-[70px] items-center gap-2 bg-card pl-[3px] pr-[11px]">
                      <NftImage artwork={item.image} alt="" size={320} className="h-[70px] w-[70px] rounded-md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold leading-4 text-fg-strong">{item.name}</p>
                        <p className="mt-1.5 text-sm leading-4 text-subtle">ID do token: {formatTokenId(item.tokenId)}</p>
                      </div>
                      <span className="text-sm text-fg">(x {item.quantity})</span>
                      <span className="w-[90px] text-right text-lg font-bold text-accent">{formatEth(item.lineTotalEth)} ETH</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/carrinho" className="mt-2.5 text-center text-[15px] leading-5 text-fg">
                Tem um código promocional? Aplique aqui
              </Link>

              </div>

              <div className="mt-2.5 max-lg:order-8"><SummaryRows variant="checkout" quote={current} loading={quote.isPending} /></div>

              {changed && current && acknowledged ? (
                <div role="alert" className="mt-3 border max-lg:order-4 border-primary bg-raised p-3 text-sm" data-testid="quote-changed">
                  <p className="font-bold text-accent">Os valores do pedido mudaram</p>
                  <p className="mt-1 text-xs text-muted">
                    Total anterior {formatEthLabel(acknowledged.totalEth)}. Novo total {formatEthLabel(current.totalEth)}.
                  </p>
                  {issues.map((issue) => (
                    <p key={issue.itemId + issue.code} className="mt-1 text-xs text-danger">
                      {issue.message}
                    </p>
                  ))}
                  <Button type="button" size="sm" className="mt-3" onClick={() => setAcknowledged(current)}>
                    Aceitar novos valores
                  </Button>
                </div>
              ) : null}
              {!changed && issues.length ? (
                <div role="alert" className="mt-3 text-xs text-danger max-lg:order-4">
                  {issues.map((issue) => (
                    <p key={issue.itemId + issue.code}>{issue.message}</p>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-col max-lg:order-2">
              <h2 className="mt-[11px] text-center text-[17px] font-bold leading-5 text-fg-strong max-lg:mt-0 max-lg:text-left max-lg:text-base">Carteira e rede</h2>
              <Controller
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <RadioGroup value={field.value ?? ''} onValueChange={field.onChange} aria-label="Carteira" className="mt-[17px] gap-4 max-lg:mt-[17px]">
                    {walletProviderIds.map((id) => (
                      <RadioGroupItem key={id} value={id} className={`flex h-[45px] items-center gap-3 px-3.5 text-sm max-lg:h-[65px] max-lg:rounded-xl max-lg:border-0 max-lg:bg-card max-lg:px-4 ${MOBILE_ORDER[id]}`}>
                        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-raised text-sm font-bold text-accent lg:hidden">
                          {id === "coinbase" ? <Icon name="wallet" size={20} /> : providerLabels[id].charAt(0)}
                        </span>
                        <span aria-hidden="true" className={`flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] max-lg:order-last max-lg:ml-auto max-lg:h-[18px] max-lg:w-[18px] ${field.value === id ? 'border-primary' : 'border-primary max-lg:border-line-soft'}`}>
                          {field.value === id ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                        </span>
                        <span className="max-lg:order-none">{providerLabels[id]}</span>
                      </RadioGroupItem>
                    ))}
                  </RadioGroup>
                )}
              />
              <Button type="button" variant="outline" className="mt-4" disabled={!network || !provider || connect.isPending || connectionMatches} onClick={() => connect.mutate()}>
                {connectionMatches ? 'Carteira conectada' : connect.isPending ? 'Conectando...' : 'Conectar carteira'}
              </Button>
              </div>
              <p className="text-right text-sm font-bold leading-5 text-fg-strong lg:hidden max-lg:order-3">
                Total: <span className="ml-4 text-lg text-accent">{current ? `${formatEth(current.totalEth)} ETH` : "..."}</span>
              </p>
              {submitError ? (
                <p role="alert" className="mt-3 text-sm text-danger max-lg:order-5" data-testid="submit-error">
                  {submitError}
                </p>
              ) : null}
              <Button type="submit" size="lg" className="mt-4 h-11 w-full text-base font-bold normal-case max-lg:sticky max-lg:bottom-6 max-lg:z-10 max-lg:order-5 max-lg:mt-0 max-lg:h-[60px] max-lg:rounded-full max-lg:bg-gradient-to-r max-lg:from-[#c98a52] max-lg:to-primary lg:mt-6" disabled={order.isPending || quote.isPending || changed || issues.length > 0 || !items.length}>
                {order.isPending ? 'Enviando pedido...' : 'Confirmar compra'}
              </Button>
            </aside>
          </form>
        )}
      </div>
    </Shell>
  )
}

/**
 * Mobile only list of the saved wallets. Choosing one fills the network and wallet type of the form.
 * @param props saved wallets, the currently selected network and the selection callback
 */
function SavedWallets({ wallets, network, onSelect }: { wallets: Wallets | undefined; network: NetworkId | undefined; onSelect: (wallet: Wallet) => void }) {
  const entries = [
    { key: 'secondary', title: 'Reserva', wallet: wallets?.secondary ?? null },
    { key: 'primary', title: 'Principal', wallet: wallets?.primary ?? null },
  ].filter((entry): entry is { key: string; title: string; wallet: Wallet } => entry.wallet !== null)
  if (entries.length === 0) return null
  return (
    <section aria-label="Carteira conectada" className="max-lg:order-1 lg:hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold leading-5 text-fg-strong">Carteira conectada</h2>
        <Link to="/perfil/carteiras" className="text-sm font-bold leading-5 text-accent">
          Trocar carteira
        </Link>
      </div>
      <RadioGroup aria-label="Carteiras salvas" value={entries.find((entry) => entry.wallet.network === network)?.key ?? ''} onValueChange={(key) => onSelect(entries.find((entry) => entry.key === key)!.wallet)} className="mt-4 gap-5">
        {entries.map(({ key, title, wallet }) => (
          <RadioGroupItem key={key} value={key} className="flex h-[93px] items-center gap-4 rounded-xl border-0 bg-card px-[27px] text-left">
            <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] border-primary">
              {entries.find((entry) => entry.wallet.network === network)?.key === key ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
            </span>
            <span className="block min-w-0">
              <span className="block text-base font-bold leading-5 text-fg-strong">{title}</span>
              <span className="mt-1.5 block truncate text-[13px] leading-4 text-muted">{key === 'secondary' ? `${wallet.ensName}${wallet.ensSuffix}` : `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`}</span>
              <span className="mt-1.5 block text-[13px] leading-4 text-muted">{key === 'primary' ? 'Rede principal ' : 'Rede '}{networkLabels[wallet.network]}</span>
            </span>
          </RadioGroupItem>
        ))}
      </RadioGroup>
    </section>
  )
}
