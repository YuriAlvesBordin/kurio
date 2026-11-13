import { useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from '@/lib/toast'
import { api } from '@/api/endpoints'
import { ClientError } from '@/api/errors'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/ui/button'
import { LabelText, TextField } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordField } from '@/components/ui/password-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { authStore, useAuth } from '@/features/auth/authStore'
import { AccountLayout } from './AccountLayout'

const AVATAR_MAX_BYTES = 400 * 1024

const profileSchema = z.object({
  displayName: z.string().min(2, 'Informe seu nome.'),
  username: z.string().min(3, 'Use ao menos 3 caracteres.'),
  email: z.string().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
  ensName: z.string().min(2, 'Informe o nome ENS.'),
  ensSuffix: z.string(),
  walletAlias: z.string().min(2, 'Informe o apelido da carteira.'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: z.string().min(8, 'A senha precisa ter ao menos 8 caracteres.').regex(/\d/, 'Use letras e números.').regex(/[A-Za-z]/, 'Use letras e números.'),
    confirm: z.string(),
  })
  .refine((value) => value.newPassword === value.confirm, { path: ['confirm'], message: 'As senhas não coincidem.' })

type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>

/**
 * Collector profile screen with data editing, avatar upload and password change under one save action.
 */
export function ProfilePage() {
  const { user } = useAuth()
  return (
    <AccountLayout section="profile" title="Perfil do colecionador">
      <h1 className="-mt-0.5 mb-[39px] text-[17px] font-bold leading-5 text-fg-strong">Perfil do colecionador</h1>
      {user ? <ProfileForm /> : null}
    </AccountLayout>
  )
}

/**
 * Profile data, avatar and password change. The single save button always saves the profile and
 * also changes the password when any password field was filled.
 */
function ProfileForm() {
  const { user } = useAuth()
  const fileInput = useRef<HTMLInputElement>(null)
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName ?? '',
      username: user?.username ?? '',
      email: user?.email ?? '',
      ensName: user?.ensName ?? '',
      ensSuffix: user?.ensSuffix ?? '.eth',
      walletAlias: user?.walletAlias ?? '',
    },
  })
  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: '', newPassword: '', confirm: '' } })

  const save = useMutation({
    mutationFn: (values: ProfileValues) => api.updateProfile(values),
    onSuccess: ({ user: updated }) => {
      authStore.updateUser(updated)
      toast.success('Perfil atualizado')
    },
    onError: (error: ClientError) => {
      for (const [field, message] of Object.entries(error.fields)) {
        if (field in profileSchema.shape) form.setError(field as keyof ProfileValues, { message })
      }
      if (!Object.keys(error.fields).length) toast.error(error.message)
    },
  })

  const change = useMutation({
    mutationFn: (values: PasswordValues) => api.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
    onSuccess: () => {
      passwordForm.reset()
      toast.success('Senha alterada')
    },
    onError: (error: ClientError) => {
      for (const [field, message] of Object.entries(error.fields)) {
        if (field === 'currentPassword' || field === 'newPassword') passwordForm.setError(field, { message })
      }
      if (!Object.keys(error.fields).length) toast.error(error.message)
    },
  })

  const avatar = useMutation({
    mutationFn: (value: string | null) => api.updateAvatar(value),
    onSuccess: ({ user: updated }) => authStore.updateUser(updated),
    onError: (error: ClientError) => toast.error(error.message),
  })

  /**
   * Validates and uploads the chosen avatar image.
   * @param file selected file or undefined when the picker was cancelled
   */
  const pickAvatar = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Escolha um arquivo de imagem.')
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error('A imagem precisa ter até 400 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => avatar.mutate(String(reader.result))
    reader.readAsDataURL(file)
  }

  /**
   * Saves the profile and, when a password field has content, validates and changes the password too.
   */
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const passwordTouched = Object.values(passwordForm.getValues()).some((value) => value.length > 0)
    await form.handleSubmit((values) => save.mutate(values))()
    if (passwordTouched) await passwordForm.handleSubmit((values) => change.mutate(values))()
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-label="Dados do perfil">
      <div className="grid gap-y-[33px] sm:grid-cols-2 sm:gap-x-[28px] [&_label]:-translate-y-0.5">
        <TextField floating className="gap-3.5" label="Nome de exibição *" error={form.formState.errors.displayName?.message} {...form.register('displayName')} />
        <TextField floating className="gap-3.5" label="Nome de usuário *" error={form.formState.errors.username?.message} {...form.register('username')} />
        <TextField floating className="gap-3.5" label="E-mail *" type="email" error={form.formState.errors.email?.message} {...form.register('email')} />
        <div className="relative flex flex-col gap-3.5">
          <Label htmlFor="profile-ens">
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
            <Input id="profile-ens" aria-invalid={Boolean(form.formState.errors.ensName)} {...form.register('ensName')} />
          </div>
          {form.formState.errors.ensName ? (
            <p role="alert" className="absolute left-0 top-full mt-0.5 text-xs leading-4 text-danger">
              {form.formState.errors.ensName.message}
            </p>
          ) : null}
        </div>
        <TextField floating className="gap-3.5" label="Apelido da carteira *" error={form.formState.errors.walletAlias?.message} {...form.register('walletAlias')} />
        <div className="-mb-2.5 -mt-2.5 flex flex-col">
          <span className="block h-4 text-[15px] leading-4 text-fg">Avatar</span>
          <div className="mt-[5px] flex items-center gap-[14px]">
            <div className="flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-full bg-card">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="Seu avatar" width={50} height={50} className="h-full w-full object-cover" /> : <Icon name="image" size={22} />}
            </div>
            <input ref={fileInput} type="file" accept="image/*" className="sr-only" aria-label="Escolher avatar" onChange={(event) => pickAvatar(event.target.files?.[0])} />
            <Button type="button" size="md" className="w-[98px] px-0 text-sm font-bold" onClick={() => fileInput.current?.click()} disabled={avatar.isPending}>
              Alterar
            </Button>
            <button type="button" className="text-sm" disabled={!user?.avatarUrl || avatar.isPending} onClick={() => avatar.mutate(null)}>
              Remover
            </button>
          </div>
        </div>
      </div>

      <fieldset aria-label="Alterar senha" className="mt-[31px] max-w-[417px]">
        <h2 className="text-[17px] font-bold leading-5 text-fg-strong">Alterar senha</h2>
        <div className="mt-[18px] flex flex-col gap-[21px] [&_label]:translate-y-0.5">
          <PasswordField className="gap-3.5" label="Senha atual" autoComplete="current-password" error={passwordForm.formState.errors.currentPassword?.message} {...passwordForm.register('currentPassword')} />
          <PasswordField className="gap-3.5" label="Nova senha" autoComplete="new-password" error={passwordForm.formState.errors.newPassword?.message} {...passwordForm.register('newPassword')} />
          <PasswordField className="gap-3.5" label="Confirmar nova senha" autoComplete="new-password" error={passwordForm.formState.errors.confirm?.message} {...passwordForm.register('confirm')} />
        </div>
      </fieldset>

      <Button type="submit" size="md" className="mt-8 w-[131px] px-0 text-sm font-bold" disabled={save.isPending || change.isPending}>
        {save.isPending || change.isPending ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  )
}
