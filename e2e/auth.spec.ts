import { expect, test } from '@playwright/test'
import { ANA, addToCart, login, open } from './helpers'

test.describe('authentication and session', () => {
  test('login, refresh keeps the session and logout clears it', async ({ page }) => {
    await open(page)
    await login(page, ANA)
    await page.goto('/perfil')
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' }).first()).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Nome de usuário *')).toHaveValue('ana')
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page.getByText('Você saiu da conta').first()).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
    await page.goto('/perfil')
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('wrong credentials show an error and keep the modal open', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: 'Entrar' }).filter({ visible: true }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('E-mail').fill('ana@kurio.test')
    await dialog.getByLabel('Senha').fill('wrong-password-1')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog.getByRole('alert')).toContainText('incorretos')
  })

  test('registration validates fields and creates a working account', async ({ page }) => {
    await open(page, '/?auth=register')
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(dialog.getByRole('alert').first()).toBeVisible()
    await dialog.getByLabel('Nome de usuário').fill('carla')
    await dialog.getByLabel('E-mail').fill('carla@kurio.test')
    await dialog.getByLabel('Senha', { exact: true }).fill('Carla@1234')
    await dialog.getByLabel('Confirmar senha').fill('Carla@1234')
    await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(dialog).toBeHidden()
    await page.goto('/perfil')
    await expect(page.getByLabel('Nome de usuário *')).toHaveValue('carla')
  })

  test('duplicate e-mail is reported on the field', async ({ page }) => {
    await open(page, '/?auth=register')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Nome de usuário').fill('anaclone')
    await dialog.getByLabel('E-mail').fill('ana@kurio.test')
    await dialog.getByLabel('Senha', { exact: true }).fill('Clone@1234')
    await dialog.getByLabel('Confirmar senha').fill('Clone@1234')
    await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(dialog.getByText('Este e-mail já está cadastrado.')).toBeVisible()
  })

  test('register conflict scenario rejects every signup', async ({ page }) => {
    await open(page, '/?auth=register', 'register-conflict')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Nome de usuário').fill('novo')
    await dialog.getByLabel('E-mail').fill('novo@kurio.test')
    await dialog.getByLabel('Senha', { exact: true }).fill('Novo@12345')
    await dialog.getByLabel('Confirmar senha').fill('Novo@12345')
    await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(dialog.getByText('Este e-mail já está cadastrado.')).toBeVisible()
  })

  test('private routes redirect guests to login and return after authentication', async ({ page }) => {
    await open(page, '/pagamento')
    await expect(page.getByRole('dialog')).toBeVisible()
    await login(page, ANA)
    await expect(page).toHaveURL(/pagamento/)
  })

  test('guest cart is merged into the user cart on login', async ({ page }) => {
    await open(page)
    await addToCart(page, 'nft-001', 2)
    await page.getByRole('button', { name: /finalizar/ }).click()
    const merged = page.waitForResponse((response) => response.url().includes('/api/cart/merge'))
    await login(page, ANA)
    await merged
    await page.waitForURL('**/pagamento')
    await page.goto('/carrinho')
    await expect(page.getByTestId('cart-row')).toHaveCount(1)
    await expect(page.getByTestId('subtotal')).toHaveText('2.38 ETH')
  })

  test('profile edits persist and password change works', async ({ page }) => {
    await open(page)
    await login(page, ANA)
    await page.goto('/perfil')
    await page.getByLabel('Nome de exibição *').fill('Ana Maria Souza')
    await page.getByRole('button', { name: 'Salvar' }).first().click()
    await expect(page.getByText('Perfil atualizado').first()).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Nome de exibição *')).toHaveValue('Ana Maria Souza')

    const form = page.getByRole('group', { name: 'Alterar senha' })
    await form.getByLabel('Senha atual').fill('Kurio@123')
    await form.getByLabel('Nova senha', { exact: true }).fill('Novo@98765')
    await form.getByLabel('Confirmar nova senha').fill('Novo@98765')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Senha alterada')).toBeVisible()
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page.getByText('Você saiu da conta').first()).toBeVisible()
    await page.goto('/?auth=login')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('E-mail').fill('ana@kurio.test')
    await dialog.getByLabel('Senha').fill('Novo@98765')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog).toBeHidden()
  })

  test('forbidden profile update is surfaced to the user', async ({ page }) => {
    await open(page, '/', 'unauthorized')
    await login(page, ANA)
    await page.goto('/perfil')
    await page.getByRole('button', { name: 'Salvar' }).first().click()
    await expect(page.getByText('Você não tem permissão para alterar este perfil.')).toBeVisible()
  })
})
