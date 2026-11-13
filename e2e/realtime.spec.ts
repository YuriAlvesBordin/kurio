import { expect, test } from '@playwright/test'
import { ANA, addToCart, connectWallet, login, open, reachCheckout } from './helpers'

test.describe('realtime', () => {
  test('nft.updated reaches an open detail page through the socket', async ({ page }) => {
    await open(page, '/nft/nft-001')
    await expect(page.getByTestId('detail-price').filter({ visible: true })).toHaveText('1.19 ETH')
    await page.waitForFunction(() => (window.__kurioMock?.peerCount() ?? 0) > 0)
    await page.evaluate(() => window.__kurioMock?.updateNft('nft-001', { priceEth: '1.55' }))
    await expect(page.getByTestId('detail-price').filter({ visible: true })).toHaveText('1.55 ETH')
  })

  test('duplicate and older events are ignored', async ({ page }) => {
    await open(page, '/nft/nft-001')
    await page.waitForFunction(() => (window.__kurioMock?.peerCount() ?? 0) > 0)
    await page.evaluate(() => window.__kurioMock?.updateNft('nft-001', { priceEth: '1.55' }))
    await expect(page.getByTestId('detail-price').filter({ visible: true })).toHaveText('1.55 ETH')
    await page.evaluate(() => window.__kurioMock?.replayLastEvent())
    await page.evaluate(() => window.__kurioMock?.emitStaleNftEvent('nft-001'))
    await page.waitForTimeout(500)
    await expect(page.getByTestId('detail-price').filter({ visible: true })).toHaveText('1.55 ETH')
  })

  test('after a dropped connection the client reconnects and reconciles with REST', async ({ page }) => {
    await open(page, '/nft/nft-001')
    await page.waitForFunction(() => (window.__kurioMock?.peerCount() ?? 0) > 0)
    await page.evaluate(() => window.__kurioMock?.blockConnections(true))
    await expect(page.getByRole('status').filter({ hasText: 'Reconectando' })).toBeVisible({ timeout: 10_000 })
    await page.evaluate(() => window.__kurioMock?.updateNft('nft-001', { priceEth: '1.77' }))
    await page.evaluate(() => window.__kurioMock?.blockConnections(false))
    await expect(page.getByTestId('detail-price').filter({ visible: true })).toHaveText('1.77 ETH', { timeout: 15_000 })
    await expect(page.getByRole('status').filter({ hasText: 'Reconectando' })).toBeHidden()
  })

  test('order events are delivered to the owner and the order settles without polling help', async ({ page }) => {
    await reachCheckout(page)
    await connectWallet(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.waitForURL('**/pedido/**')
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
  })

  test('order events never reach another user connected at the same time', async ({ browser }) => {
    const first = await browser.newContext()
    const second = await browser.newContext()
    const a = await first.newPage()
    const b = await second.newPage()
    await open(a)
    await login(a, ANA)
    await open(b)
    await login(b, { email: 'bruno@kurio.test', password: 'Kurio@456' })
    await a.waitForFunction(() => (window.__kurioMock?.peerCount() ?? 0) > 0)
    await addToCart(a, 'nft-001')
    await a.getByRole('button', { name: /finalizar/ }).click()
    await a.waitForURL('**/pagamento')
    await connectWallet(a)
    await a.getByRole('button', { name: 'Confirmar compra' }).click()
    await a.waitForURL('**/pedido/**')
    await expect(a.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    await b.goto('/carrinho')
    await expect(b.getByTestId('empty-cart')).toBeVisible()
    await first.close()
    await second.close()
  })

  test('listeners are cleaned up when the user logs out', async ({ page }) => {
    await open(page)
    await login(page, ANA)
    await page.waitForFunction(() => (window.__kurioMock?.peerCount() ?? 0) > 0)
    await page.goto('/perfil')
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page.getByText('Você saiu da conta').first()).toBeVisible()
    await page.waitForFunction(() => (window.__kurioMock?.peerCount() ?? 0) <= 1)
    const peers = await page.evaluate(() => window.__kurioMock?.peerCount() ?? 0)
    expect(peers).toBeLessThanOrEqual(1)
  })
})
