import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from '@/lib/toast'
import { networkIds, walletProviderIds, type Wallet } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { ClientError } from '@/api/errors'
import { keys } from '@/api/keys'
import { Button } from '@/components/ui/button'
import { LabelText, TextField } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/authStore'
import { useSaveWallet, useWallets } from '@/hooks/queries'
import { networkLabels, providerLabels } from '@/lib/labels'
import { AccountLayout } from './AccountLayout'

const ADDRESS = /^0x[0-9a-fA-F]{40}$/

const walletSchema = z.object({
  displayName: z.string().min(2, 'Informe o nome de exibição.'),
  alias: z.string().min(2, 'Informe o apelido da carteira.'),
  network: z.enum(networkIds, { message: 'Selecione uma rede.' }),
  profileName: z.string().min(2, 'Informe o nome do perfil.'),
  address: z.string().regex(ADDRESS, 'Use um endereço 0x com 40 caracteres hexadecimais.'),
  secondaryAddress: z.string(),
  type: z.enum(walletProviderIds, { message: 'Selecione uma carteira.' }),
  referralCode: z.string().min(2, 'Informe o código de indicação.'),
  email: z.string().min(1, 'Informe o e-mail.').email('Informe um e-mail válido.'),
  ensName: z.string().min(2, 'Informe o nome ENS.'),
  ensSuffix: z.string(),
})

type WalletValues = z.infer<typeof walletSchema>

/**
 * Wallets screen with the primary and secondary wallet forms.
 */
export function WalletsPage() {
  const wallets = useWallets()
  const client = useQueryClient()
  const { user } = useAuth()
  const [addingSecondary, setAddingSecondary] = useState(false)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  const removeSecondary = useMutation({
    mutationFn: () => api.removeSecondaryWallet(),
    onSuccess: (data) => {
      client.setQueryData(keys.wallets(user?.id ?? 'none'), data)
      setAddingSecondary(false)
      toast.success('Carteira secundária removida')
    },
    onError: (error: ClientError) => toast.error(error.message),
  })

  return (
    <AccountLayout section="wallets" title="Carteiras">
      {wallets.isPending ? (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando carteiras">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : wallets.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3 bg-card p-6">
          <p>Não foi possível carregar as carteiras.</p>
          <Button onClick={() => void wallets.refetch()}>Tentar novamente</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <section aria-labelledby="primary-title">
            <div className="-mt-px flex items-start justify-between">
              <h1 id="primary-title" className="text-[17px] font-bold leading-5 text-fg-strong">
                Carteira principal
              </h1>
              {wallets.data?.secondary ? null : (
                <button type="button" className="text-base font-bold leading-5 text-accent" onClick={() => setAddingSecondary(true)}>
                  Adicionar
                </button>
              )}
            </div>
            <p className="mb-[38px] mt-[3px] text-sm leading-5 text-muted">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
            <WalletForm slot="primary" initial={wallets.data?.primary ?? null} submitLabel="Salvar carteira" />
          </section>
          <section aria-labelledby="secondary-title" className="-mt-px">
            <div className="flex items-start justify-between">
              <h2 id="secondary-title" className="text-[17px] font-bold leading-5 text-fg-strong">
                Carteira secundária
              </h2>
              {wallets.data?.secondary ? (
                <button type="button" className="text-base font-bold leading-5 text-accent" onClick={() => removeSecondary.mutate()} disabled={removeSecondary.isPending}>
                  Remover
                </button>
              ) : (
                <div className="flex items-center gap-2.5 pr-1">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm leading-5 text-fg">
                    <input type="checkbox" checked={sameAsPrimary} onChange={(event) => setSameAsPrimary(event.target.checked)} className="peer sr-only" />
                    <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] border-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                      {sameAsPrimary ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                    </span>
                    Igual à carteira principal
                  </label>
                  <button type="button" className="text-base font-bold leading-5 text-accent" onClick={() => setAddingSecondary((value) => !value)}>
                    {addingSecondary ? 'Cancelar' : 'Adicionar'}
                  </button>
                </div>
              )}
            </div>
            {wallets.data?.secondary || addingSecondary ? (
              <div className="mt-5">
                <WalletForm
                  key={sameAsPrimary ? 'same' : 'blank'}
                  slot="secondary"
                  initial={wallets.data?.secondary ?? (sameAsPrimary ? (wallets.data?.primary ?? null) : null)}
                  submitLabel="Salvar carteira secundária"
                  onSaved={() => setAddingSecondary(false)}
                />
              </div>
            ) : (
              <p className="mt-[7px] text-sm leading-5 text-muted">Você ainda não adicionou uma carteira secundária.</p>
            )}
          </section>
        </div>
      )}
    </AccountLayout>
  )
}

/**
 * Wallet form shared by the primary and secondary slots.
 * @param props slot name, stored wallet, button label and optional callback
 */
function WalletForm({ slot, initial, submitLabel, onSaved }: { slot: 'primary' | 'secondary'; initial: Wallet | null; submitLabel: string; onSaved?: () => void }) {
  const { user } = useAuth()
  const save = useSaveWallet()
  const form = useForm<WalletValues>({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      displayName: initial?.displayName ?? user?.displayName ?? '',
      alias: initial?.alias ?? '',
      network: initial?.network,
      profileName: initial?.profileName ?? user?.username ?? '',
      address: initial?.address ?? '',
      secondaryAddress: initial?.secondaryAddress ?? '',
      type: initial?.type,
      referralCode: initial?.referralCode ?? '',
      email: initial?.email ?? user?.email ?? '',
      ensName: initial?.ensName ?? user?.ensName ?? '',
      ensSuffix: initial?.ensSuffix ?? '.eth',
    },
  })

  const submit = form.handleSubmit((values) =>
    save.mutate(
      { slot, wallet: values },
      {
        onSuccess: () => {
          toast.success('Carteira salva')
          onSaved?.()
        },
        onError: (error) => toast.error(error.message),
      },
    ),
  )

  const id = (name: string) => `${slot}-${name}`
  return (
    <form onSubmit={submit} noValidate className="grid gap-y-[33px] sm:grid-cols-2 sm:gap-x-[28px] [&_label]:-translate-y-0.5" aria-label={slot === 'primary' ? 'Carteira principal' : 'Carteira secundária'}>
      <TextField floating className="gap-0" label="Nome de exibição *" error={form.formState.errors.displayName?.message} {...form.register('displayName')} id={id('displayName')} />
      <TextField floating className="gap-0" label="Apelido da carteira *" error={form.formState.errors.alias?.message} {...form.register('alias')} id={id('alias')} />
      <div className="relative flex flex-col">
        <Label htmlFor={id('network')}><LabelText text="Rede *" /></Label>
        <Controller
          control={form.control}
          name="network"
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger id={id('network')} aria-invalid={Boolean(form.formState.errors.network)}>
                <SelectValue placeholder="Selecione uma rede" />
              </SelectTrigger>
              <SelectContent>
                {networkIds.map((value) => (
                  <SelectItem key={value} value={value}>
                    {networkLabels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.network ? <p role="alert" className="absolute left-0 top-full mt-0.5 text-xs leading-4 text-danger">{form.formState.errors.network.message}</p> : null}
      </div>
      <TextField floating className="gap-0" label="Nome do perfil *" error={form.formState.errors.profileName?.message} {...form.register('profileName')} id={id('profileName')} />
      <TextField floating className="gap-0" label="Endereço da carteira *" placeholder="Endereço 0x da carteira" error={form.formState.errors.address?.message} {...form.register('address')} id={id('address')} />
      <TextField floating hideLabel className="gap-0 sm:pt-4" label="Carteira secundária (opcional)" placeholder="ENS ou carteira secundária (opcional)" {...form.register('secondaryAddress')} id={id('secondaryAddress')} />
      <div className="relative flex flex-col">
        <Label htmlFor={id('type')}><LabelText text="Tipo de carteira *" /></Label>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger id={id('type')} aria-invalid={Boolean(form.formState.errors.type)}>
                <SelectValue placeholder="Selecione uma carteira" />
              </SelectTrigger>
              <SelectContent>
                {walletProviderIds.map((value) => (
                  <SelectItem key={value} value={value}>
                    {providerLabels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.type ? <p role="alert" className="absolute left-0 top-full mt-0.5 text-xs leading-4 text-danger">{form.formState.errors.type.message}</p> : null}
      </div>
      <TextField floating className="gap-0" label="Código de indicação *" error={form.formState.errors.referralCode?.message} {...form.register('referralCode')} id={id('referralCode')} />
      <TextField floating className="gap-0" label="E-mail *" type="email" error={form.formState.errors.email?.message} {...form.register('email')} id={id('email')} />
      <div className="relative flex flex-col">
        <Label htmlFor={id('ensName')}>
          <LabelText text="Nome ENS *" />
        </Label>
        <div className="flex gap-2.5">
          <Controller
            control={form.control}
            name="ensSuffix"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Sufixo ENS" className="w-[78px] shrink-0 gap-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=".eth">.eth</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <Input id={id('ensName')} aria-invalid={Boolean(form.formState.errors.ensName)} {...form.register('ensName')} />
        </div>
        {form.formState.errors.ensName ? (
          <p role="alert" className="absolute left-0 top-full mt-0.5 text-xs leading-4 text-danger">
            {form.formState.errors.ensName.message}
          </p>
        ) : null}
      </div>
      <div className="-mt-px sm:col-span-2">
        <Button type="submit" size="md" className="min-w-[131px] px-3 text-sm font-bold" disabled={save.isPending}>
          {save.isPending ? 'Salvando...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
