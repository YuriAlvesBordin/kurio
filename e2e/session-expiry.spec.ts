import { expect, test } from '@playwright/test'
import { addToCart, connectWallet, login, open, reachCheckout } from './helpers'

test.describe('session expiry', () => {
  test('expiring mid checkout keeps the page, the form and the cart', async ({ page }) => {
    await reachCheckout(page)
    await page.getByLabel('Observação do colecionador (opcional)').fill('Entregar com cuidado')
    await page.evaluate(() => window.__kurioMock?.expireSessions())
    await connectWallet(page).catch(() => undefined)
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Sua sessão expirou')).toBeVisible()
    await login(page)
    await expect(page).toHaveURL(/pagamento/)
    await expect(page.getByLabel('Observação do colecionador (opcional)')).toHaveValue('Entregar com cuidado')
    await expect(page.getByTestId('checkout-row')).toHaveCount(1)
  })

  test('session expired scenario ends the session after a few calls', async ({ page }) => {
    await open(page, '/?auth=login', 'session-expired')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('E-mail').fill('ana@kurio.test')
    await dialog.getByLabel('Senha').fill('Kurio@123')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog).toBeHidden()
    await page.evaluate(async () => {
      const token = localStorage.getItem('kurio.token')
      for (let call = 0; call < 5; call += 1) await fetch('/api/favorites', { headers: { Authorization: `Bearer ${token}` } })
    })
    const expired = page.getByRole('dialog')
    await expect(async () => {
      if (!(await expired.isVisible())) await page.getByRole('link', { name: /Carrinho/ }).filter({ visible: true }).first().click({ timeout: 2000 })
      await expect(expired).toContainText('Sua sessão expirou', { timeout: 1500 })
    }).toPass({ timeout: 20_000 })
    await expect(page).toHaveURL(/reason=expired/)
  })

  test('logout clears private cache so the next user sees nothing of the previous one', async ({ page }) => {
    await open(page)
    await login(page)
    await addToCart(page, 'nft-001')
    await page.goto('/perfil')
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page.getByText('Você saiu da conta').first()).toBeVisible()
    await page.goto('/carrinho')
    await expect(page.getByTestId('empty-cart')).toBeVisible()
    const keys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('kurio.') && key !== 'kurio.mock.db' && key !== 'kurio.mock.scenario' && key !== 'kurio.guest'))
    expect(keys).toEqual([])
  })
})
