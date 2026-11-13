import { expect, test } from '@playwright/test'
import { addToCart, connectWallet, login, open, reachCheckout } from './helpers'

test.describe('checkout', () => {
  test('full purchase ends in a confirmed receipt and clears only what was bought', async ({ page }) => {
    await open(page)
    await login(page)
    await addToCart(page, 'nft-001', 2)
    await addToCart(page, 'nft-005', 1)
    await page.getByRole('button', { name: /finalizar/ }).click()
    await page.waitForURL('**/pagamento')
    await connectWallet(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.waitForURL('**/pedido/**')
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('order-confirmed')).toContainText('Emerald Ape #042')
    await expect(page.getByTestId('order-confirmed')).toContainText('Violet Nomad #314')
    await page.goto('/carrinho')
    await expect(page.getByTestId('empty-cart')).toBeVisible()
  })

  test('pay is blocked until a wallet is connected', async ({ page }) => {
    await reachCheckout(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByText('Selecione uma rede.')).toBeVisible()
    await expect(page).toHaveURL(/\/pagamento/)
  })

  test('required collector fields are validated', async ({ page }) => {
    await reachCheckout(page)
    await page.getByLabel('Nome de exibição *').fill('')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByText('Informe seu nome de exibição.')).toBeVisible()
  })

  test('pending order is recovered after a refresh and the receipt is stable', async ({ page }) => {
    await reachCheckout(page)
    await connectWallet(page)
    await page.evaluate(() => window.__kurioMock?.setManualSettlement(true))
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.waitForURL('**/pedido/**')
    await expect(page.getByTestId('order-pending')).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('order-pending')).toBeVisible()
    const id = page.url().split('/').pop() as string
    await page.evaluate((orderId) => window.__kurioMock?.settleOrder(orderId, 'confirmed'), id)
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
    const receipt = ((await page.getByTestId('order-confirmed').textContent()) ?? '').replace(/\s+/g, ' ').trim()
    await page.reload()
    await expect(page.getByTestId('order-confirmed')).toHaveText(receipt)
  })

  test('another user cannot open someone else order', async ({ page }) => {
    await reachCheckout(page)
    await connectWallet(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.waitForURL('**/pedido/**')
    const path = new URL(page.url()).pathname
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    await page.goto('/perfil')
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page.getByText('Você saiu da conta').first()).toBeVisible()
    await page.goto('/?auth=login')
    await login(page, { email: 'bruno@kurio.test', password: 'Kurio@456' })
    await page.goto(path)
    await expect(page.getByRole('heading', { name: 'Pedido não encontrado' })).toBeVisible()
  })
})
