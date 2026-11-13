import { expect, test } from '@playwright/test'
import { ANA, addToCart, connectWallet, login, open } from './helpers'

/**
 * Walks to the checkout page under a given scenario with one Emerald Ape in the cart.
 * @param page Playwright page
 * @param scenario scenario id
 */
async function checkoutUnder(page: import('@playwright/test').Page, scenario: string) {
  await open(page, '/', scenario)
  await login(page, ANA)
  await addToCart(page, 'nft-001')
  await page.getByRole('button', { name: /finalizar/ }).click()
  await page.waitForURL('**/pagamento')
  await expect(page.getByTestId('checkout-row')).toBeVisible()
  await expect(page.getByLabel('Nome de exibição *')).not.toHaveValue('')
  await connectWallet(page)
}

test.describe('checkout scenarios', () => {
  test('price change forces a new confirmation before paying', async ({ page }) => {
    await checkoutUnder(page, 'price-change')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByTestId('quote-changed').or(page.getByTestId('submit-error')).first()).toBeVisible()
    await expect(page.getByTestId('quote-changed')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
    await page.getByRole('button', { name: 'Aceitar novos valores' }).click()
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.waitForURL('**/pedido/**')
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('order-confirmed')).toContainText('1.309 ETH')
  })

  test('sold out edition blocks the purchase and keeps the item', async ({ page }) => {
    await checkoutUnder(page, 'sold-out')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByTestId('quote-changed').or(page.getByTestId('submit-error')).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
    await page.goto('/carrinho')
    await expect(page.getByTestId('cart-row')).toHaveCount(1)
  })

  test('rejected payment keeps the cart and offers a retry', async ({ page }) => {
    await checkoutUnder(page, 'order-rejected')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.waitForURL('**/pedido/**')
    await expect(page.getByTestId('order-rejected')).toBeVisible({ timeout: 15_000 })
    await page.goto('/carrinho')
    await expect(page.getByTestId('cart-row')).toHaveCount(1)
  })

  test('timeout after order creation recovers with the same idempotency key and one order', async ({ page }) => {
    await checkoutUnder(page, 'order-timeout')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.waitForURL('**/pedido/**', { timeout: 20_000 })
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    const orders = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('kurio.mock.db') ?? '{}').orders ?? {}))
    expect(orders).toHaveLength(1)
  })

  test('wallet rejection is reported without breaking the form', async ({ page }) => {
    await open(page, '/', 'wallet-rejected')
    await login(page, ANA)
    await addToCart(page, 'nft-001')
    await page.getByRole('button', { name: /finalizar/ }).click()
    await page.waitForURL('**/pagamento')
    await expect(page.getByLabel('Nome de exibição *')).not.toHaveValue('')
    await page.locator('#network-select').click()
    await page.getByRole('option', { name: 'Ethereum' }).click()
    await page.getByRole('radio', { name: 'MetaMask' }).click()
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByText('A carteira recusou a conexão.')).toBeVisible()
  })
})
