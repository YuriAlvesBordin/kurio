import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ClientError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/Icon'
import { PasswordField } from '@/components/ui/password-field'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { TextField } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { authStore, useAuth } from './authStore'

const loginSchema = z.object({
  email: z.string().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})

const registerSchema = z
  .object({
    username: z.string().min(3, 'Use ao menos 3 caracteres.'),
    email: z.string().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
    password: z.string().min(8, 'A senha precisa ter ao menos 8 caracteres.').regex(/\d/, 'Use letras e números na senha.').regex(/[A-Za-z]/, 'Use letras e números na senha.'),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, { path: ['confirm'], message: 'As senhas não coincidem.' })

type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>

/**
 * Login and signup modal driven by the "auth" search parameter so it opens over any page.
 * After success it returns to the page the user came from.
 */
export function AuthDialog() {
  const search = useSearch({ strict: false }) as { auth?: 'login' | 'register'; reason?: 'expired'; redirect?: string }
  const navigate = useNavigate()
  const { notice, user } = useAuth()
  const mode = search.auth

  useEffect(() => {
    if (mode && user) close(true)
  }, [mode, user])

  /**
   * Closes the modal and optionally follows the stored redirect target.
   * Runs from an effect once a session exists, so a session rejected right after signing in keeps the modal open.
   * @param followRedirect true after successful authentication
   */
  const close = (followRedirect: boolean) => {
    const target = followRedirect && search.redirect?.startsWith('/') ? search.redirect : null
    if (target) {
      void navigate({ to: target } as never)
      return
    }
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => ({ ...previous, auth: undefined, reason: undefined, redirect: undefined }),
      replace: true,
    } as never)
  }

  const switchTo = (next: 'login' | 'register') =>
    void navigate({ to: '.', search: (previous: Record<string, unknown>) => ({ ...previous, auth: next }), replace: true } as never)

  return (
    <Dialog open={Boolean(mode)} onOpenChange={(open) => !open && close(false)}>
      <DialogContent
        aria-describedby="auth-description"
        onOpenAutoFocus={(event) => {
          const field = (event.target as HTMLElement).querySelector<HTMLInputElement>('input')
          if (!field) return
          event.preventDefault()
          field.focus()
        }}
        overlayClassName="bg-ink md:bg-transparent"
        className="max-md:inset-0 max-md:h-dvh max-md:bg-ink max-md:translate-x-0 max-md:translate-y-0 max-md:left-0 max-md:top-0 md:top-[158px] md:h-[600px] md:max-w-[500px] md:-translate-y-0 md:overflow-hidden"
      >
        <div className={cn('flex flex-col items-center px-7 pt-[128px] md:px-[80px] md:pb-8 md:pt-[50px]', mode === 'register' && 'md:pt-[46px]')}>
          <DialogTitle className="sr-only">{mode === 'register' ? 'Criar conta' : 'Entrar'}</DialogTitle>
          <p aria-hidden="true" className="text-[32px] font-bold leading-10 tracking-[0.04em] text-fg-strong md:hidden">KURIO</p>
          <p aria-hidden="true" className={cn('mt-[83px] font-bold leading-7 text-fg-strong md:hidden', mode === 'register' ? 'text-lg' : 'text-xl')}>
            {mode === 'register' ? 'Criar perfil de colecionador' : 'Entrar'}
          </p>
          <div role="tablist" aria-label="Acesso" className="hidden h-5 items-center gap-2 text-xl leading-5 md:flex">
            <button type="button" role="tab" aria-selected={mode !== 'register'} onClick={() => switchTo('login')} className={mode === 'register' ? 'text-fg-strong' : 'text-accent'}>
              Entrar
            </button>
            <span aria-hidden="true" className="h-5 w-px bg-required" />
            <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => switchTo('register')} className={mode === 'register' ? 'text-accent' : 'text-fg-strong'}>
              Criar conta
            </button>
          </div>
          <DialogDescription id="auth-description" className="mt-[40px] w-full shrink-0 text-center max-md:sr-only md:w-[400px] text-[13px] leading-4 text-fg">
            {mode === 'register' ? 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.' : 'Entre para gerenciar sua carteira, coleção e perfil de criador.'}
          </DialogDescription>
          {(search.reason === 'expired' || notice === 'expired') && mode === 'login' ? (
            <p role="alert" className="mt-4 w-full border border-primary bg-raised p-3 text-sm text-accent">
              Sua sessão expirou. Entre novamente e continue de onde parou.
            </p>
          ) : null}
          <div className="mt-6 w-full max-md:mt-[33px] max-md:[&_button[aria-label*=caracteres]]:bottom-[15px] max-md:[&_input]:h-[50px] max-md:[&_input]:rounded-xl max-md:[&_input]:px-4">{mode === 'register' ? <RegisterForm /> : mode === 'login' ? <LoginForm /> : null}</div>
        </div>
        <SocialSection />
        <button type="button" onClick={() => switchTo(mode === 'register' ? 'login' : 'register')} className="mx-auto mt-10 block pb-10 text-[15px] leading-5 text-muted md:hidden">
          {mode === 'register' ? 'Já tem uma conta? Entre' : 'Novo na Kurio? Crie uma conta'}
        </button>
        <DialogClose aria-label="Fechar" className="absolute right-4 top-4 flex h-4 w-4 items-center justify-center">
          <span aria-hidden="true" className="absolute h-px w-[18px] rotate-45 bg-primary" />
          <span aria-hidden="true" className="absolute h-px w-[18px] -rotate-45 bg-primary" />
        </DialogClose>
        <div className="absolute inset-x-0 bottom-0 hidden h-2.5 bg-primary md:block" />
      </DialogContent>
    </Dialog>
  )
}

/**
 * Divider and third party sign in buttons. Providers are out of scope and answer with a toast.
 */
function SocialSection() {
  const soon = () => toast.info('Em breve')
  return (
    <div className="px-7 max-md:mt-[45px] md:px-[80px]">
      <div className="relative flex justify-center border-t border-line md:-mx-[80px]">
        <span className="-mt-[10px] bg-ink px-2 md:bg-card text-[13px] leading-5 text-fg">Ou continue com</span>
      </div>
      <button type="button" onClick={soon} className="mt-[11px] max-md:mt-2.5 flex h-10 w-full items-center justify-center gap-3 rounded-[4.5px] border border-line text-[13px] text-muted">
        <Icon name="social-google" size={20} />
        Continuar com Google
      </button>
      <button type="button" onClick={soon} className="mt-3 max-md:mt-4 flex h-10 w-full items-center justify-center gap-3 rounded-[4.5px] border border-line text-[13px] text-muted">
        <Icon name="social-facebook-color" size={20} />
        Continuar com Facebook
      </button>
    </div>
  )
}

/**
 * Login form with client validation and server error mapping.
 */
function LoginForm() {
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const submit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const user = await authStore.login(values)
      toast.success(`Bem-vindo, ${user.displayName.split(' ')[0]}`)
    } catch (error) {
      const failure = error instanceof ClientError ? error : null
      setFormError(failure?.message ?? 'Não foi possível entrar.')
    }
  })
  return (
    <form onSubmit={submit} noValidate className="flex flex-col">
      <TextField floating hideLabelAlways label="E-mail" placeholder="contato@email.com" type="email" autoComplete="email" error={form.formState.errors.email?.message} {...form.register('email')} />
      <div className="mt-3">
        <PasswordField hideLabelAlways label="Senha" placeholder="Senha" autoComplete="current-password" error={form.formState.errors.password?.message} {...form.register('password')} />
      </div>
      <button type="button" onClick={() => toast.info('Em breve')} className="mt-3 self-end text-sm leading-[18px] text-accent">
        Esqueceu a senha?
      </button>
      {formError ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="mt-[22px] h-11 w-full font-bold max-md:mt-[38px] max-md:h-[60px] max-md:rounded-xl" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}

/**
 * Registration form that maps server field conflicts back onto the inputs.
 */
function RegisterForm() {
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { username: '', email: '', password: '', confirm: '' } })
  const submit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await authStore.register({ username: values.username, email: values.email, password: values.password })
      toast.success('Conta criada com sucesso')
    } catch (error) {
      if (error instanceof ClientError) {
        for (const [field, message] of Object.entries(error.fields)) {
          if (field === 'username' || field === 'email' || field === 'password') form.setError(field, { message })
        }
        if (!Object.keys(error.fields).length) setFormError(error.message)
        return
      }
      setFormError('Não foi possível criar a conta.')
    }
  })
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <TextField floating hideLabelAlways label="Nome de usuário" placeholder="Nome de usuário" autoComplete="username" error={form.formState.errors.username?.message} {...form.register('username')} />
      <TextField floating hideLabelAlways label="E-mail" placeholder="Digite seu e-mail" type="email" autoComplete="email" error={form.formState.errors.email?.message} {...form.register('email')} />
      <PasswordField hideLabelAlways label="Senha" placeholder="Senha" autoComplete="new-password" error={form.formState.errors.password?.message} {...form.register('password')} />
      <TextField floating hideLabelAlways label="Confirmar senha" placeholder="Confirmar senha" type="password" autoComplete="new-password" error={form.formState.errors.confirm?.message} {...form.register('confirm')} />
      {formError ? (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="mt-3 h-11 w-full font-bold max-md:mt-7 max-md:h-[60px] max-md:rounded-xl" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Criando...' : (<><span className="md:hidden">Criar perfil</span><span className="max-md:hidden">Criar conta</span></>)}
      </Button>
    </form>
  )
}
